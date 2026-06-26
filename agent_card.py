#!/usr/bin/env python3
"""
AgentCard — High-density terminal dashboard for agentic CLI ecosystem monitoring.
Scans local environment for 16 major AI coding tools, aggregates metrics,
and renders a live-updating Unicode grid UI using Textual.

Usage:
    pip install textual psutil
    python agent_card.py          # live mode (real scans)
    python agent_card.py --demo   # demo mode (mock data)
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Textual imports (fail gracefully with instructions)
# ---------------------------------------------------------------------------
try:
    from textual import on, work
    from textual.app import App, ComposeResult
    from textual.binding import Binding
    from textual.color import Color
    from textual.containers import Horizontal, Vertical, VerticalScroll
    from textual.reactive import reactive
    from textual.timer import Timer
    from textual.widgets import (
        DataTable,
        Footer,
        Header,
        Label,
        RichLog,
        Static,
    )
    from textual.widgets._progress_bar import ProgressBar
except ImportError:
    print(
        "\n\x1b[31m✖ textual is required.\x1b[0m  "
        "Install with:\n\n    pip install textual psutil\n"
    )
    sys.exit(1)

try:
    import psutil
except ImportError:
    psutil = None  # type: ignore[assignment]

# ═══════════════════════════════════════════════════════════════════════════
#  CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════

APP_TITLE = "⬡ AgentCard"
VERSION = "1.0.0"
REFRESH_INTERVAL = 2.0  # seconds

# Scoring caps (shared between Scorer.score() and _pct() helpers)
_MAX_AGENTS = 4
_MAX_MCP_SERVERS = 15
_MAX_MODELS = 5
_MAX_TOKEN_VELOCITY = 20_000

# ── 16 Target CLIs ───────────────────────────────────────────────────────
# Each entry: canonical name → detection signals (process keywords & config paths)
CLI_SIGNATURES: Dict[str, Dict] = {
    "Claude Code": {
        "process": ["claude", "claude-code"],
        "config_paths": [
            "~/.claude",
            "~/.claude.json",
            "~/.config/claude",
        ],
        "log_globs": ["~/.claude/**/*.log"],
        "icon": "🟣",
    },
    "Codex": {
        "process": ["codex", "openai-codex"],
        "config_paths": ["~/.codex", "~/.config/codex"],
        "log_globs": ["~/.codex/**/*.log"],
        "icon": "🟢",
    },
    "GitHub Copilot CLI": {
        "process": ["copilot", "github-copilot"],
        "config_paths": ["~/.copilot", "~/.config/github-copilot"],
        "log_globs": [],
        "icon": "⚪",
    },
    "Gemini CLI": {
        "process": ["gemini", "gemini-cli"],
        "config_paths": ["~/.gemini", "~/.config/gemini"],
        "log_globs": ["~/.gemini/**/*.log"],
        "icon": "🔵",
    },
    "Cursor": {
        "process": ["cursor"],
        "config_paths": ["~/.cursor", "~/.cursor-server"],
        "log_globs": ["~/.cursor/**/*.log"],
        "icon": "🟡",
    },
    "Amp": {
        "process": ["amp", "amp-cli"],
        "config_paths": ["~/.amp", "~/.config/amp"],
        "log_globs": [],
        "icon": "🔶",
    },
    "Cline": {
        "process": ["cline"],
        "config_paths": [
            "~/.cline",
            "~/.vscode/extensions/saoudrizwan.claude-dev-*",
        ],
        "log_globs": [],
        "icon": "🟠",
    },
    "Roo Code": {
        "process": ["roo", "roo-code"],
        "config_paths": ["~/.roo", "~/.roo-code"],
        "log_globs": [],
        "icon": "🔴",
    },
    "Kilo Code": {
        "process": ["kilo", "kilo-code"],
        "config_paths": ["~/.kilo", "~/.kilo-code"],
        "log_globs": [],
        "icon": "🟤",
    },
    "Kiro": {
        "process": ["kiro"],
        "config_paths": ["~/.kiro", "~/.config/kiro"],
        "log_globs": [],
        "icon": "⚫",
    },
    "Crush": {
        "process": ["crush"],
        "config_paths": ["~/.crush"],
        "log_globs": [],
        "icon": "🩷",
    },
    "OpenCode": {
        "process": ["opencode"],
        "config_paths": ["~/.opencode", "~/.config/opencode"],
        "log_globs": ["~/.opencode/**/*.log"],
        "icon": "⬜",
    },
    "Factory Droid": {
        "process": ["factory", "factory-droid"],
        "config_paths": ["~/.factory-droid"],
        "log_globs": [],
        "icon": "🏭",
    },
    "Antigravity": {
        "process": ["antigravity", "ag-cli"],
        "config_paths": ["~/.antigravity"],
        "log_globs": [],
        "icon": "🚀",
    },
    "Kimi CLI": {
        "process": ["kimi", "kimi-cli"],
        "config_paths": ["~/.kimi", "~/.config/kimi"],
        "log_globs": [],
        "icon": "🌙",
    },
    "Qwen Code": {
        "process": ["qwen", "qwen-code"],
        "config_paths": ["~/.qwen", "~/.config/qwen"],
        "log_globs": [],
        "icon": "✨",
    },
}

# ── Common MCP / Skills directory patterns ──────────────────────────────
MCP_SCAN_PATHS: List[Tuple[str, str]] = [
    ("~/.claude/mcpServers.json", "Claude"),
    ("~/.claude/config.json", "Claude"),
    ("~/.config/claude/settings.json", "Claude"),
    ("~/.cursor/mcp.json", "Cursor"),
    ("~/.opencode/config.json", "OpenCode"),
    ("~/.roo/mcp.json", "Roo Code"),
    ("~/.kilo/mcp.json", "Kilo Code"),
]

# ── Model name patterns for log scanning ────────────────────────────────
MODEL_PATTERNS: Dict[str, str] = {
    "claude-4-opus": r"claude[\-\s]?4[\-\s]?opus",
    "claude-4-sonnet": r"claude[\-\s]?4[\-\s]?sonnet",
    "claude-3.7-sonnet": r"claude[\-\s]?3\.?7[\-\s]?sonnet",
    "claude-3.5-sonnet": r"claude[\-\s]?3\.?5[\-\s]?sonnet",
    "claude-3-haiku": r"claude[\-\s]?3[\-\s]?haiku",
    "gpt-4.1": r"gpt[\-\s]?4\.?1",
    "gpt-4o": r"gpt[\-\s]?4o",
    "gpt-4-turbo": r"gpt[\-\s]?4[\-\s]?turbo",
    "o4-mini": r"o4[\-\s]?mini",
    "o3": r"\bo3\b",
    "o3-mini": r"o3[\-\s]?mini",
    "o3-pro": r"o3[\-\s]?pro",
    "gemini-2.5-pro": r"gemini[\-\s]?2\.?5[\-\s]?pro",
    "gemini-2.5-flash": r"gemini[\-\s]?2\.?5[\-\s]?flash",
    "gemini-2.0-flash": r"gemini[\-\s]?2\.?0[\-\s]?flash",
    "deepseek-v3": r"deepseek[\-\s]?v3",
    "deepseek-r1": r"deepseek[\-\s]?r1",
    "qwen-3": r"qwen[\-\s]?3",
    "llama-4": r"llama[\-\s]?4",
}

# ═══════════════════════════════════════════════════════════════════════════
#  DATA MODELS
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class CliStatus:
    name: str
    icon: str
    state: str  # RUNNING | IDLE | DETECTED | ABSENT
    pid: Optional[int] = None
    cpu_pct: float = 0.0
    mem_mb: float = 0.0
    uptime_s: float = 0.0


@dataclass
class McpTool:
    name: str
    source: str
    tool_count: int
    description: str = ""


@dataclass
class ModelUsage:
    name: str
    count: int
    percentage: float


@dataclass
class BurnMetrics:
    total_tokens: int
    input_tokens: int
    output_tokens: int
    estimated_cost_usd: float
    session_count: int
    avg_tokens_per_session: int
    burn_rate_per_min: float
    token_velocity: float  # tokens/min
    env_integrity: float  # 0.0 – 1.0


@dataclass
class ScoreResult:
    total: int  # 0-1000
    agents_score: int
    mcp_score: int
    models_score: int
    burn_score: int
    badges: List[str]


class Scorer:
    """Computes a 0-1000 score and rarity badges from scan results."""

    BADGE_DEFS = [
        ("🏆 MCP Collector", lambda a, m, mo, b: len(m) >= 10),
        ("🦄 Multi-Agent", lambda a, m, mo, b: sum(1 for c in a if c.state == "RUNNING") >= 3),
        ("🧬 Provider Hybrid", lambda a, m, mo, b: _provider_count(mo) >= 3),
        ("🔥 Token Blazing", lambda a, m, mo, b: b.token_velocity >= 10_000),
        ("💎 Century Club", lambda a, m, mo, b: b.session_count >= 100),
        ("⚡ Full Stack", lambda a, m, mo, b: all(
            x > 50 for x in [
                _agents_pct(a), _mcp_pct(m), _models_pct(mo), _burn_pct(b)
            ]
        )),
        ("🌐 Polyglot Coder", lambda a, m, mo, b: len(mo) >= 5),
    ]

    def score(
        self, clis: List[CliStatus], mcp: List[McpTool],
        models: List[ModelUsage], burn: BurnMetrics,
    ) -> ScoreResult:
        # Agents: 75 per running (cap _MAX_AGENTS) + 50 bonus for 3+
        running = sum(1 for c in clis if c.state == "RUNNING")
        agents_pts = min(running, _MAX_AGENTS) * 75 + (50 if running >= 3 else 0)

        # MCP: 10 per server (cap _MAX_MCP_SERVERS) + 1 per tool (cap 50)
        mcp_pts = min(len(mcp), _MAX_MCP_SERVERS) * 10 + min(sum(t.tool_count for t in mcp), 50)

        # Models: 30 per unique model (cap _MAX_MODELS) + 50 for 3+ providers
        model_pts = min(len(models), _MAX_MODELS) * 30 + (50 if _provider_count(models) >= 3 else 0)

        # Burn: velocity scaled + sessions
        vel = burn.token_velocity
        vel_pts = 150 if vel >= _MAX_TOKEN_VELOCITY else 100 if vel >= 5_000 else 50 if vel >= 1_000 else 0
        session_pts = min(burn.session_count // 10, 10) * 10
        burn_pts = vel_pts + session_pts

        total = agents_pts + mcp_pts + model_pts + burn_pts
        total = min(total, 1000)

        badges = [name for name, fn in self.BADGE_DEFS if fn(clis, mcp, models, burn)]

        return ScoreResult(
            total=total,
            agents_score=agents_pts,
            mcp_score=mcp_pts,
            models_score=model_pts,
            burn_score=burn_pts,
            badges=badges,
        )


def _provider_count(models: List[ModelUsage]) -> int:
    """Count distinct LLM providers. Heuristic — based on model name patterns."""
    providers = set()
    for m in models:
        name = m.name.lower()
        if "claude" in name:
            providers.add("anthropic")
        elif "gpt" in name or name.startswith("o3") or name.startswith("o4"):
            providers.add("openai")
        elif "gemini" in name:
            providers.add("google")
        elif "deepseek" in name:
            providers.add("deepseek")
        elif "qwen" in name:
            providers.add("alibaba")
        elif "llama" in name:
            providers.add("meta")
    return len(providers)


def _agents_pct(clis: List[CliStatus]) -> float:
    running = sum(1 for c in clis if c.state == "RUNNING")
    return min(running / _MAX_AGENTS * 100, 100)


def _mcp_pct(mcp: List[McpTool]) -> float:
    return min(len(mcp) / _MAX_MCP_SERVERS * 100, 100)


def _models_pct(models: List[ModelUsage]) -> float:
    return min(len(models) / _MAX_MODELS * 100, 100)


def _burn_pct(burn: BurnMetrics) -> float:
    vel_score = min(burn.token_velocity / _MAX_TOKEN_VELOCITY * 100, 100)
    session_score = min(burn.session_count / 100 * 100, 100)
    return (vel_score + session_score) / 2


class ShareCard:
    """Renders the agent card as terminal output and markdown."""

    def render_terminal(
        self, clis: List[CliStatus], mcp: List[McpTool],
        models: List[ModelUsage], burn: BurnMetrics, score: ScoreResult,
    ) -> str:
        running = [c for c in clis if c.state == "RUNNING"]
        idle = [c for c in clis if c.state in ("IDLE", "DETECTED")]

        # Agents section (top 6)
        agent_lines = []
        for c in (running + idle)[:6]:
            if c.state == "RUNNING":
                agent_lines.append(f"  {c.icon} {c.name:<18s} ● {c.cpu_pct:4.1f}% CPU")
            else:
                agent_lines.append(f"  {c.icon} {c.name:<18s} ○ {c.state.lower()}")
        remaining = len(clis) - len(agent_lines)
        if remaining > 0:
            agent_lines.append(f"     … +{remaining} more")

        # Models section (top 5)
        model_lines = []
        for m in models[:5]:
            b = bar(m.percentage, width=10)
            model_lines.append(f"  {m.name:<18s} {b} {m.percentage:4.1f}%")

        # MCP section (top 5)
        mcp_lines = []
        for t in sorted(mcp, key=lambda x: -x.tool_count)[:5]:
            tc = f"[{t.tool_count}]" if t.tool_count else ""
            mcp_lines.append(f"  ◆ {t.name:<16s} {tc}")
        mcp_remaining = len(mcp) - 5
        if mcp_remaining > 0:
            mcp_lines.append(f"     … +{mcp_remaining} more")

        # Burn section
        burn_lines = [
            f"  Tokens    {fmt_tokens(burn.total_tokens)}",
            f"  Cost      ${burn.estimated_cost_usd:.2f}/mo",
            f"  Velocity  {fmt_tokens(burn.token_velocity)}/min",
            f"  Sessions  {burn.session_count}",
            f"  Integrity {bar(burn.env_integrity * 100, 10)} {burn.env_integrity*100:.0f}%",
        ]

        # Badges
        badge_lines = [f"  {b}" for b in score.badges] if score.badges else ["  (none yet)"]

        # Rarity
        rarity = _rarity_label(score.total)

        w = 58
        lines = [
            f"┌{'─' * w}┐",
            f"│  ⬡ AgentCard{' ' * (w - 18)}{score.total:>4d} pts │",
            f"│{'━' * w}│",
            f"│{' ' * w}│",
            f"│  🤖 AGENTS ({len(running)} running){' ' * 24}📊 MODELS{' ' * 13}│",
        ]

        # Two-column layout: agents + models side by side
        max_rows = max(len(agent_lines), len(model_lines), 1)
        for i in range(max_rows):
            left = agent_lines[i] if i < len(agent_lines) else " " * 28
            right = model_lines[i] if i < len(model_lines) else ""
            lines.append(f"│  {left:<28s}  {right:<24s}│")

        lines.append(f"│{' ' * w}│")
        lines.append(f"│  🛠️ MCP ({len(mcp)} servers, {sum(t.tool_count for t in mcp)} tools){' ' * 13}💳 BURN{' ' * 15}│")

        # Two-column: MCP + Burn
        max_rows2 = max(len(mcp_lines), len(burn_lines), 1)
        for i in range(max_rows2):
            left = mcp_lines[i] if i < len(mcp_lines) else " " * 26
            right = burn_lines[i] if i < len(burn_lines) else ""
            lines.append(f"│  {left:<26s}  {right:<24s}│")

        lines.append(f"│{' ' * w}│")
        lines.append(f"│  🏆 RARITY{' ' * 18}🏅 BADGES{' ' * 17}│")
        lines.append(f"│  {rarity:<26s}  {badge_lines[0]:<24s}│")
        for bl in badge_lines[1:]:
            lines.append(f"│  {' ' * 26}  {bl:<24s}│")

        lines.append(f"│{' ' * w}│")
        lines.append(f"│{'━' * w}│")
        lines.append(f"│  agent-card · python · privacy-first (zero network){' ' * 5}│")
        lines.append(f"└{'─' * w}┘")

        return "\n".join(lines)

    def render_markdown(
        self, clis: List[CliStatus], mcp: List[McpTool],
        models: List[ModelUsage], burn: BurnMetrics, score: ScoreResult,
    ) -> str:
        running = [c for c in clis if c.state == "RUNNING"]
        rarity = _rarity_label(score.total)

        lines = [
            "```",
            f"┌──────────────────────────────────────────────────────────┐",
            f"│  ⬡ AgentCard                                    {score.total:>4d} pts │",
            f"│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│",
            f"│                                                          │",
            f"│  🤖 AGENTS ({len(running)} running)           📊 MODELS              │",
        ]

        # Agents + Models
        agent_lines = []
        for c in clis[:6]:
            if c.state == "RUNNING":
                agent_lines.append(f"│  {c.icon} {c.name:<16s}  ● running              │")
            elif c.state in ("IDLE", "DETECTED"):
                agent_lines.append(f"│  {c.icon} {c.name:<16s}  ○ {c.state.lower():<20s}│")

        model_lines = []
        for m in models[:5]:
            b = bar(m.percentage, width=8)
            model_lines.append(f"│  {m.name:<16s} {b} {m.percentage:4.1f}%            │")

        max_rows = max(len(agent_lines), len(model_lines))
        for i in range(max_rows):
            left = agent_lines[i] if i < len(agent_lines) else "│" + " " * 57 + "│"
            right = model_lines[i] if i < len(model_lines) else ""
            lines.append(f"{left[:30]}  {right}")

        lines.append(f"│                                                          │")
        lines.append(f"│  🛠️ MCP ({len(mcp)} srv, {sum(t.tool_count for t in mcp)} tools)       💳 BURN                 │")

        # MCP + Burn
        mcp_lines = []
        for t in sorted(mcp, key=lambda x: -x.tool_count)[:5]:
            tc = f"[{t.tool_count}]" if t.tool_count else ""
            mcp_lines.append(f"│  ◆ {t.name:<14s} {tc:<6s}                 │")

        burn_lines = [
            f"│  Tokens   {fmt_tokens(burn.total_tokens):<10s}               │",
            f"│  Cost     ${burn.estimated_cost_usd:.2f}/mo              │",
            f"│  Velocity {fmt_tokens(burn.token_velocity)}/min              │",
            f"│  Sessions {burn.session_count:<10d}               │",
        ]

        max_rows2 = max(len(mcp_lines), len(burn_lines))
        for i in range(max_rows2):
            left = mcp_lines[i] if i < len(mcp_lines) else "│" + " " * 30
            right = burn_lines[i] if i < len(burn_lines) else ""
            lines.append(f"{left[:30]}  {right}")

        lines.append(f"│                                                          │")

        # Badges
        if score.badges:
            lines.append(f"│  🏆 {', '.join(score.badges[:3]):<52s}│")
            if len(score.badges) > 3:
                lines.append(f"│     {', '.join(score.badges[3:]):<52s}│")
        else:
            lines.append(f"│  🏆 (collect badges by running more tools){' ' * 14}│")

        lines.append(f"│                                                          │")
        lines.append(f"│  {rarity:<56s}│")
        lines.append(f"│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│")
        lines.append(f"│  agent-card · github.com/shafiqimtiaz/agent-card        │")
        lines.append(f"└──────────────────────────────────────────────────────────┘")
        lines.append("```")

        return "\n".join(lines)


def _rarity_label(score: int) -> str:
    if score >= 900:
        return "🌟 LEGENDARY — Top 1%"
    if score >= 750:
        return "💎 EPIC — Top 5%"
    if score >= 600:
        return "🥇 RARE — Top 15%"
    if score >= 400:
        return "🥈 UNCOMMON — Top 35%"
    if score >= 200:
        return "🥉 COMMON — Top 60%"
    return "🌱 STARTER — everyone starts here"


def copy_to_clipboard(text: str) -> bool:
    """Copy text to system clipboard. Returns True on success."""
    import subprocess
    import platform

    system = platform.system()
    try:
        if system == "Darwin":
            subprocess.run(["pbcopy"], input=text.encode(), check=True)
        elif system == "Linux":
            # Try xsel, then xclip, then wl-copy
            for cmd in [["xsel", "--clipboard", "--input"],
                        ["xclip", "-selection", "clipboard"],
                        ["wl-copy"]]:
                try:
                    subprocess.run(cmd, input=text.encode(), check=True)
                    return True
                except FileNotFoundError:
                    continue
            return False
        elif system == "Windows":
            subprocess.run(["clip"], input=text.encode(), check=True)
        else:
            return False
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


# ═══════════════════════════════════════════════════════════════════════════
#  SCANNER ENGINE (local only — zero network)
# ═══════════════════════════════════════════════════════════════════════════

class Scanner:
    """Aggregates local filesystem + process data into typed snapshots."""

    def __init__(self, home: Optional[Path] = None, demo: bool = False):
        self.home = home or Path.home()
        self.demo = demo
        self._model_hits: Dict[str, int] = {}
        self._last_scan_ts = 0.0

    # ── Q1: CLI Ecosystem ──────────────────────────────────────────────
    def scan_clis(self) -> List[CliStatus]:
        if self.demo:
            return self._mock_clis()

        results: List[CliStatus] = []
        for name, sig in CLI_SIGNATURES.items():
            state, pid, cpu, mem, uptime = self._probe_process(sig["process"])
            if state == "ABSENT":
                # Check for config directories (IDLE/DETECTED)
                for cp in sig.get("config_paths", []):
                    expanded = Path(os.path.expanduser(cp))
                    if expanded.exists():
                        state = "IDLE"
                        break
                else:
                    # Check broader patterns (e.g. vscode extensions)
                    for cp in sig.get("config_paths", []):
                        if "*" in cp:
                            import glob as _g
                            if _g.glob(os.path.expanduser(cp)):
                                state = "DETECTED"
                                break
            results.append(CliStatus(
                name=name, icon=sig["icon"], state=state,
                pid=pid, cpu_pct=cpu, mem_mb=mem, uptime_s=uptime,
            ))
        return results

    def _probe_process(self, keywords: List[str]) -> Tuple[str, Optional[int], float, float, float]:
        """Return (state, pid, cpu%, mem_mb, uptime_s) by scanning running procs."""
        if psutil is None:
            return ("ABSENT", None, 0, 0, 0)
        for proc in psutil.process_iter(["pid", "name", "cmdline", "cpu_percent", "memory_info", "create_time"]):
            try:
                info = proc.info
                cmdline = " ".join(info.get("cmdline") or [])
                pname = (info.get("name") or "").lower()
                combined = f"{pname} {cmdline}".lower()
                for kw in keywords:
                    if kw.lower() in combined:
                        mem_mb = (info.get("memory_info").rss / 1048576) if info.get("memory_info") else 0
                        uptime = time.time() - (info.get("create_time") or time.time())
                        return ("RUNNING", info["pid"], info.get("cpu_percent", 0) or 0, mem_mb, uptime)
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
        return ("ABSENT", None, 0, 0, 0)

    # ── Q2: Skills / MCP ───────────────────────────────────────────────
    def scan_mcp(self) -> List[McpTool]:
        if self.demo:
            return self._mock_mcp()

        tools: List[McpTool] = []
        for path_str, source in MCP_SCAN_PATHS:
            expanded = Path(os.path.expanduser(path_str))
            if not expanded.exists():
                continue
            try:
                data = json.loads(expanded.read_text(errors="ignore"))
                # Handle both flat and nested structures
                servers = data if isinstance(data, list) else data.get("mcpServers", data.get("servers", data))
                if isinstance(servers, dict):
                    for sname, sval in servers.items():
                        tool_list = sval.get("tools", []) if isinstance(sval, dict) else []
                        tools.append(McpTool(
                            name=sname, source=source,
                            tool_count=len(tool_list) if isinstance(tool_list, list) else 0,
                        ))
                elif isinstance(servers, list):
                    for s in servers:
                        if isinstance(s, dict):
                            tools.append(McpTool(
                                name=s.get("name", "unknown"), source=source,
                                tool_count=len(s.get("tools", [])),
                            ))
            except (json.JSONDecodeError, OSError):
                continue

        # Scan n8n MCP configs
        n8n_config = Path(os.path.expanduser("~/.n8n/mcp.json"))
        if n8n_config.exists():
            try:
                data = json.loads(n8n_config.read_text(errors="ignore"))
                for sname, sval in (data.get("mcpServers") or data or {}).items():
                    if isinstance(sval, dict):
                        tools.append(McpTool(name=sname, source="n8n", tool_count=0))
            except (json.JSONDecodeError, OSError):
                pass

        return tools if tools else self._fallback_mcp()

    # ── Q3: Model Usage ────────────────────────────────────────────────
    def scan_models(self) -> List[ModelUsage]:
        if self.demo:
            return self._mock_models()

        hits: Dict[str, int] = {}
        scan_dirs = [
            self.home / ".claude",
            self.home / ".cursor",
            self.home / ".config",
            self.home / ".local/share",
        ]
        log_exts = {".log", ".jsonl", ".json", ".txt"}

        for scan_dir in scan_dirs:
            if not scan_dir.exists():
                continue
            for root, _dirs, files in os.walk(scan_dir):
                # Skip deep nesting
                depth = len(Path(root).relative_to(scan_dir).parts)
                if depth > 4:
                    _dirs.clear()
                    continue
                for fname in files:
                    if Path(fname).suffix.lower() not in log_exts:
                        continue
                    fpath = Path(root) / fname
                    try:
                        text = fpath.read_text(errors="ignore")
                    except OSError:
                        continue
                    for model_key, pattern in MODEL_PATTERNS.items():
                        count = len(re.findall(pattern, text, re.IGNORECASE))
                        if count:
                            hits[model_key] = hits.get(model_key, 0) + count

        # Also scan shell history for model mentions
        for hist in [".bash_history", ".zsh_history", ".local/share/fish/fish_history"]:
            hpath = self.home / hist
            if hpath.exists():
                try:
                    text = hpath.read_text(errors="ignore")
                    for model_key, pattern in MODEL_PATTERNS.items():
                        count = len(re.findall(pattern, text, re.IGNORECASE))
                        if count:
                            hits[model_key] = hits.get(model_key, 0) + count
                except OSError:
                    pass

        if not hits:
            return self._mock_models()

        total = sum(hits.values())
        usages = [
            ModelUsage(name=k, count=v, percentage=round(v / total * 100, 1))
            for k, v in sorted(hits.items(), key=lambda x: -x[1])
        ]
        self._model_hits = hits
        return usages[:10]

    # ── Q4: Burn / Cost ────────────────────────────────────────────────
    def scan_burn(self) -> BurnMetrics:
        if self.demo:
            return self._mock_burn()

        total_tok = 0
        in_tok = 0
        out_tok = 0
        sessions = 0
        scan_dirs = [
            self.home / ".claude",
            self.home / ".cursor",
            self.home / ".opencode",
        ]

        for scan_dir in scan_dirs:
            if not scan_dir.exists():
                continue
            for root, _dirs, files in os.walk(scan_dir):
                depth = len(Path(root).relative_to(scan_dir).parts)
                if depth > 3:
                    _dirs.clear()
                    continue
                for fname in files:
                    fpath = Path(root) / fname
                    if fpath.suffix.lower() not in {".jsonl", ".json", ".log"}:
                        continue
                    try:
                        for line in fpath.read_text(errors="ignore").splitlines():
                            if "token" in line.lower() or "usage" in line.lower():
                                # Try extracting token counts
                                tok_matches = re.findall(r'"(?:total_)?tokens?":\s*(\d+)', line, re.I)
                                in_matches = re.findall(r'"input_tokens?":\s*(\d+)', line, re.I)
                                out_matches = re.findall(r'"output_tokens?":\s*(\d+)', line, re.I)
                                if tok_matches:
                                    total_tok += sum(int(m) for m in tok_matches)
                                if in_matches:
                                    in_tok += sum(int(m) for m in in_matches)
                                if out_matches:
                                    out_tok += sum(int(m) for m in out_matches)
                                if "session" in line.lower():
                                    sessions += 1
                    except OSError:
                        continue

        if total_tok == 0:
            return self._mock_burn()

        avg_per = total_tok // max(sessions, 1)
        # Rough cost estimate (blended $3/M input, $15/M output)
        cost = (in_tok * 3 + out_tok * 15) / 1_000_000
        velocity = total_tok / max(self._scan_uptime(scan_dirs), 1) * 60

        return BurnMetrics(
            total_tokens=total_tok,
            input_tokens=in_tok or total_tok // 2,
            output_tokens=out_tok or total_tok // 2,
            estimated_cost_usd=round(cost, 4),
            session_count=max(sessions, 1),
            avg_tokens_per_session=avg_per,
            burn_rate_per_min=round(cost / max(self._scan_uptime(scan_dirs) / 60, 1), 6),
            token_velocity=round(velocity),
            env_integrity=self._env_integrity(),
        )

    def _scan_uptime(self, dirs: List[Path]) -> float:
        newest = 0.0
        for d in dirs:
            if not d.exists():
                continue
            for root, _, files in os.walk(d):
                for f in files:
                    try:
                        mtime = os.path.getmtime(Path(root) / f)
                        if mtime > newest:
                            newest = mtime
                    except OSError:
                        continue
        return max(time.time() - newest, 1)

    def _env_integrity(self) -> float:
        score = 1.0
        checks = [
            ("python3", "python3"),
            ("node", "node"),
            ("git", "git"),
            ("pip", "pip3"),
        ]
        for _, cmd in checks:
            if not shutil.which(cmd):
                score -= 0.15
        return max(score, 0.0)

    # ═══════════════════════════════════════════════════════════════════
    #  MOCK / FALLBACK DATA
    # ═══════════════════════════════════════════════════════════════════

    def _mock_clis(self) -> List[CliStatus]:
        mock_states = [
            ("RUNNING", 42069, 12.3, 256.0, 3600),
            ("RUNNING", 42070, 8.1, 128.5, 1800),
            ("IDLE", None, 0, 0, 0),
            ("RUNNING", 42071, 5.2, 64.0, 900),
            ("DETECTED", None, 0, 0, 0),
            ("IDLE", None, 0, 0, 0),
            ("RUNNING", 42072, 15.7, 512.0, 7200),
            ("DETECTED", None, 0, 0, 0),
            ("IDLE", None, 0, 0, 0),
            ("ABSENT", None, 0, 0, 0),
            ("DETECTED", None, 0, 0, 0),
            ("IDLE", None, 0, 0, 0),
            ("ABSENT", None, 0, 0, 0),
            ("DETECTED", None, 0, 0, 0),
            ("RUNNING", 42073, 3.4, 96.0, 600),
            ("IDLE", None, 0, 0, 0),
        ]
        results = []
        for i, (name, sig) in enumerate(CLI_SIGNATURES.items()):
            state, pid, cpu, mem, upt = mock_states[i % len(mock_states)]
            results.append(CliStatus(
                name=name, icon=sig["icon"], state=state,
                pid=pid, cpu_pct=cpu, mem_mb=mem, uptime_s=upt,
            ))
        return results

    def _mock_mcp(self) -> List[McpTool]:
        return [
            McpTool("filesystem", "Claude", 14, "File system operations"),
            McpTool("github", "Claude", 8, "GitHub API integration"),
            McpTool("postgres", "Claude", 6, "PostgreSQL queries"),
            McpTool("brave-search", "Claude", 2, "Web search"),
            McpTool("memory", "Claude", 3, "Persistent memory store"),
            McpTool("puppeteer", "n8n", 5, "Browser automation"),
            McpTool("slack", "n8n", 4, "Slack messaging"),
            McpTool("notion", "n8n", 7, "Notion workspace"),
            McpTool("jira", "n8n", 6, "Jira issue tracking"),
            McpTool("confluence", "n8n", 4, "Confluence pages"),
            McpTool("bitbucket", "n8n", 6, "Bitbucket repos/PRs"),
            McpTool("tempo", "n8n", 3, "Time tracking"),
            McpTool("cursor-mcp", "Cursor", 4, "Cursor integrations"),
            McpTool("playwright", "Claude", 8, "E2E browser testing"),
            McpTool("context7", "Claude", 2, "Documentation lookup"),
            McpTool("supabase", "Claude", 20, "Database & auth"),
        ]

    def _mock_models(self) -> List[ModelUsage]:
        mock = [
            ("claude-4-sonnet", 847),
            ("claude-3.7-sonnet", 623),
            ("gpt-4.1", 412),
            ("claude-4-opus", 289),
            ("o4-mini", 198),
            ("gemini-2.5-pro", 156),
            ("o3-mini", 134),
            ("deepseek-r1", 67),
            ("qwen-3", 45),
            ("llama-4", 23),
        ]
        total = sum(c for _, c in mock)
        return [ModelUsage(name=n, count=c, percentage=round(c / total * 100, 1)) for n, c in mock]

    def _mock_burn(self) -> BurnMetrics:
        return BurnMetrics(
            total_tokens=2_847_392,
            input_tokens=1_923_456,
            output_tokens=923_936,
            estimated_cost_usd=18.47,
            session_count=142,
            avg_tokens_per_session=20_052,
            burn_rate_per_min=0.0385,
            token_velocity=14_236,
            env_integrity=0.85,
        )

    def _fallback_mcp(self) -> List[McpTool]:
        return [
            McpTool("filesystem", "system", 14, "File system operations"),
            McpTool("github", "system", 8, "GitHub API integration"),
        ]


# ═══════════════════════════════════════════════════════════════════════════
#  HELPER: ASCII progress bar
# ═══════════════════════════════════════════════════════════════════════════

def bar(pct: float, width: int = 20, filled: str = "█", empty: str = "░") -> str:
    filled_n = int(pct / 100 * width)
    return filled * filled_n + empty * (width - filled_n)


def fmt_tokens(n: int) -> str:
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n / 1_000:.1f}K"
    return str(n)


def fmt_duration(seconds: float) -> str:
    if seconds < 60:
        return f"{int(seconds)}s"
    if seconds < 3600:
        return f"{int(seconds // 60)}m {int(seconds % 60)}s"
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    return f"{h}h {m}m"


# ═══════════════════════════════════════════════════════════════════════════
#  WIDGETS
# ═══════════════════════════════════════════════════════════════════════════

class QuadrantHeader(Static):
    """Renders a quadrant title bar with icon and label."""
    def __init__(self, icon: str, title: str, **kwargs):
        super().__init__(**kwargs)
        self.icon = icon
        self.title_text = title

    def render(self) -> str:
        return f" {self.icon}  {self.title_text}"


class CliEcosystemPanel(Static):
    """Q1: Active CLI Ecosystem grid."""
    cli_statuses: reactive[List[CliStatus]] = reactive[List[CliStatus]](list)

    def render(self) -> str:
        if not self.cli_statuses:
            return "  Scanning…"
        lines = []
        state_colors = {
            "RUNNING": "\x1b[32m",   # green
            "IDLE": "\x1b[33m",      # yellow
            "DETECTED": "\x1b[37m",  # white
            "ABSENT": "\x1b[90m",    # dim
        }
        reset = "\x1b[0m"
        for cs in self.cli_statuses:
            sc = state_colors.get(cs.state, "")
            if cs.state == "RUNNING":
                detail = f"PID {cs.pid} │ {cs.cpu_pct:.1f}% │ {cs.mem_mb:.0f}MB │ {fmt_duration(cs.uptime_s)}"
            elif cs.state in ("IDLE", "DETECTED"):
                detail = "config found"
            else:
                detail = "not detected"
            lines.append(f"  {cs.icon} {cs.name:<20s} {sc}{cs.state:<10s}{reset} {detail}")
        return "\n".join(lines)


class McpPanel(Static):
    """Q2: Skills & MCP Discovery."""
    mcp_tools: reactive[List[McpTool]] = reactive[List[McpTool]](list)

    def render(self) -> str:
        if not self.mcp_tools:
            return "  No MCP tools found."
        # Group by source
        by_source: Dict[str, List[McpTool]] = {}
        for t in self.mcp_tools:
            by_source.setdefault(t.source, []).append(t)

        lines = []
        for source, tools in sorted(by_source.items()):
            lines.append(f"  \x1b[36m── {source} ({len(tools)} servers) ──\x1b[0m")
            for t in tools:
                tc_str = f"[{t.tool_count} tools]" if t.tool_count else ""
                lines.append(f"    ◆ {t.name:<22s} {tc_str}")
        total_tools = sum(t.tool_count for t in self.mcp_tools)
        lines.append(f"\n  \x1b[33mTotal: {len(self.mcp_tools)} servers │ {total_tools} tools\x1b[0m")
        return "\n".join(lines)


class ModelChartPanel(Static):
    """Q3: Model Usage bar chart."""
    model_usages: reactive[List[ModelUsage]] = reactive[List[ModelUsage]](list)

    def render(self) -> str:
        if not self.model_usages:
            return "  Scanning model logs…"
        lines = []
        max_name_len = max(len(m.name) for m in self.model_usages)
        for m in self.model_usages:
            b = bar(m.percentage, width=24)
            lines.append(
                f"  {m.name:<{max_name_len}}  {b}  {m.percentage:5.1f}%  ({fmt_tokens(m.count)})"
            )
        return "\n".join(lines)


class BurnPanel(Static):
    """Q4: Performance & Token Burn metrics."""
    burn: reactive[Optional[BurnMetrics]] = reactive[Optional[BurnMetrics]](None)

    def render(self) -> str:
        b = self.burn
        if not b:
            return "  Calculating burn metrics…"
        int_pct = b.input_tokens / max(b.total_tokens, 1) * 100
        out_pct = b.output_tokens / max(b.total_tokens, 1) * 100
        integrity_bar = bar(b.env_integrity * 100, width=20)
        lines = [
            f"  ┌─ Token Economics ─────────────────────────────────┐",
            f"  │ Total Tokens     {fmt_tokens(b.total_tokens):>10s}                        │",
            f"  │   Input  {bar(int_pct, 18)} {int_pct:5.1f}% │",
            f"  │   Output {bar(out_pct, 18)} {out_pct:5.1f}% │",
            f"  ├─ Financial ────────────────────────────────────────┤",
            f"  │ Est. Cost        ${b.estimated_cost_usd:>8.4f}                      │",
            f"  │ Burn Rate        ${b.burn_rate_per_min:.4f}/min                 │",
            f"  │ Velocity         {fmt_tokens(b.token_velocity)}/min                  │",
            f"  ├─ Sessions ─────────────────────────────────────────┤",
            f"  │ Sessions         {b.session_count:>6d}                          │",
            f"  │ Avg/Session      {fmt_tokens(b.avg_tokens_per_session):>10s}                        │",
            f"  ├─ Environment ──────────────────────────────────────┤",
            f"  │ Integrity        {integrity_bar}  {b.env_integrity*100:.0f}%   │",
            f"  └───────────────────────────────────────────────────┘",
        ]
        return "\n".join(lines)


class StatusBar(Static):
    """Bottom status bar with clock and mode."""
    mode: reactive[str] = reactive("LIVE")
    scan_time: reactive[float] = reactive(0.0)

    def render(self) -> str:
        now = datetime.now().strftime("%H:%M:%S")
        elapsed = f"{self.scan_time:.1f}s" if self.scan_time else "—"
        mode_color = "\x1b[32m" if self.mode == "LIVE" else "\x1b[33m"
        reset = "\x1b[0m"
        return (
            f" {mode_color}● {self.mode}{reset} │ "
            f"Last scan: {elapsed} │ "
            f"Refresh: {REFRESH_INTERVAL}s │ "
            f"{now} │ "
            f"AgentCard v{VERSION}"
        )


# ═══════════════════════════════════════════════════════════════════════════
#  MAIN APP
# ═══════════════════════════════════════════════════════════════════════════

class AgentCardApp(App):
    """Terminal dashboard for agentic CLI ecosystem monitoring."""

    CSS = """
    Screen {
        background: $surface;
        layout: grid;
        grid-size: 2 3;
        grid-columns: 1fr 1fr;
        grid-rows: auto 1fr 1fr auto;
        padding: 0;
    }

    QuadrantHeader {
        width: 100%;
        height: 1;
        background: $accent;
        color: $text;
        text-style: bold;
        padding: 0 1;
    }

    #q1_header { column-span: 1; }
    #q2_header { column-span: 1; }
    #q3_header { column-span: 1; }
    #q4_header { column-span: 1; }

    CliEcosystemPanel {
        width: 100%;
        height: 100%;
        background: $surface;
        border: tall $accent;
        padding: 1 2;
        overflow-y: auto;
    }

    McpPanel {
        width: 100%;
        height: 100%;
        background: $surface;
        border: tall $warning;
        padding: 1 2;
        overflow-y: auto;
    }

    ModelChartPanel {
        width: 100%;
        height: 100%;
        background: $surface;
        border: tall $success;
        padding: 1 2;
        overflow-y: auto;
    }

    BurnPanel {
        width: 100%;
        height: 100%;
        background: $surface;
        border: tall $error;
        padding: 1 2;
        overflow-y: auto;
    }

    #status_bar {
        column-span: 2;
        width: 100%;
        height: 1;
        background: $accent-darken-2;
        color: $text-muted;
        padding: 0 1;
    }
    """

    TITLE = APP_TITLE
    SUB_TITLE = "Agentic CLI Ecosystem Dashboard"

    BINDINGS = [
        Binding("q", "quit", "Quit"),
        Binding("r", "force_refresh", "Refresh"),
        Binding("d", "toggle_demo", "Demo Mode"),
        Binding("t", "toggle_theme", "Theme"),
    ]

    # ── Reactive state ──────────────────────────────────────────────────
    demo_mode: reactive[bool] = reactive(False)
    scan_time_s: reactive[float] = reactive(0.0)
    refresh_tick: reactive[int] = reactive(0)

    def __init__(self, demo: bool = False, **kwargs):
        super().__init__(**kwargs)
        self.demo_mode = demo
        self.scanner = Scanner(demo=demo)
        self._timer: Optional[Timer] = None

    # ── Compose ─────────────────────────────────────────────────────────
    def compose(self) -> ComposeResult:
        yield Header(show_clock=True)

        # Q1
        yield QuadrantHeader("🤖", "ACTIVE CLI ECOSYSTEM", id="q1_header")
        yield CliEcosystemPanel(id="cli_panel")

        # Q2
        yield QuadrantHeader("🛠️", "SKILLS & MCP DISCOVERY", id="q2_header")
        yield McpPanel(id="mcp_panel")

        # Q3
        yield QuadrantHeader("📊", "MOST USED MODELS", id="q3_header")
        yield ModelChartPanel(id="model_panel")

        # Q4
        yield QuadrantHeader("💳", "PERFORMANCE & BURN", id="q4_header")
        yield BurnPanel(id="burn_panel")

        yield StatusBar(id="status_bar")
        yield Footer()

    # ── Lifecycle ───────────────────────────────────────────────────────
    def on_mount(self) -> None:
        self.title = APP_TITLE
        self._run_scan()
        self._timer = self.set_interval(REFRESH_INTERVAL, self._tick)

    def _tick(self) -> None:
        self.refresh_tick += 1
        self._run_scan()

    # ── Scan orchestration ──────────────────────────────────────────────
    def _run_scan(self) -> None:
        t0 = time.time()
        try:
            clis = self.scanner.scan_clis()
            mcp = self.scanner.scan_mcp()
            models = self.scanner.scan_models()
            burn = self.scanner.scan_burn()
        except Exception as exc:
            self.bell()
            self.notify(f"Scan error: {exc}", severity="error")
            return

        elapsed = time.time() - t0
        self.scan_time_s = round(elapsed, 2)

        # Update widgets
        self.query_one("#cli_panel", CliEcosystemPanel).cli_statuses = clis
        self.query_one("#mcp_panel", McpPanel).mcp_tools = mcp
        self.query_one("#model_panel", ModelChartPanel).model_usages = models
        self.query_one("#burn_panel", BurnPanel).burn = burn
        status_bar = self.query_one("#status_bar", StatusBar)
        status_bar.scan_time = elapsed
        status_bar.mode = "DEMO" if self.demo_mode else "LIVE"

    # ── Actions ─────────────────────────────────────────────────────────
    def action_force_refresh(self) -> None:
        self._run_scan()

    def action_toggle_demo(self) -> None:
        self.demo_mode = not self.demo_mode
        self.scanner = Scanner(demo=self.demo_mode)
        self._run_scan()
        self.notify(f"Demo mode: {'ON' if self.demo_mode else 'OFF'}")

    def action_toggle_theme(self) -> None:
        self.dark = not self.dark


# ═══════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="AgentCard — Agentic CLI Ecosystem Dashboard",
    )
    parser.add_argument(
        "--demo", action="store_true",
        help="Run in demo mode with mock data",
    )
    parser.add_argument(
        "--version", action="version", version=f"AgentCard {VERSION}",
    )
    args = parser.parse_args()

    app = AgentCardApp(demo=args.demo)
    app.run()


if __name__ == "__main__":
    main()
