<div align="center">

# agentradar

[![Node.js](https://img.shields.io/badge/node-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Ink](https://img.shields.io/badge/ink-5.0%2B-ff7700?style=flat-square)](https://github.com/vadimdemedes/ink)
[![GitHub release](https://img.shields.io/github/v/release/shafiqimtiaz/aiscope?style=flat-square&logo=github)](https://github.com/shafiqimtiaz/aiscope/releases)

Terminal dashboard that monitors your local AI tooling ecosystem — coding agents, MCP servers, LLM models, and token metrics. One unified view.

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Scoring](#scoring) • [Privacy](#privacy)

</div>

agentradar is a Node.js TUI that scans your local machine to give you a live picture of your AI tooling landscape. It detects running AI processes as active agents, discovers installed MCP servers/skills, tallies model usage from history, and measures token burn rates — all locally, with zero outbound network requests.

> [!NOTE]
> agentradar runs entirely locally. It reads the process table, configuration directories, and local log files on your machine to render the results in your terminal. No telemetry, no network calls.

---

## Features

- **16 CLI Detectors** — Scans for running AI platforms (Claude Code, Codex, Copilot, Gemini CLI, Cursor, Amp, Cline, Roo Code, Kilo Code, Kiro, Crush, OpenCode, Factory Droid, Antigravity, Kimi CLI, Qwen Code).
- **MCP Server Discovery** — Aggregates installed tool servers from standard config paths (Claude, Cursor, OpenCode, n8n, etc.).
- **Model Usage Frequency Charts** — Analyzes shell history and log files for model name patterns, rendering horizontal ASCII bars.
- **Token Burn Analytics** — Measures sessions, token velocity (tokens/min), input/output splits, and estimated token costs.
- **System Scoring** — Calculates a score from 0-1000 across your active agents, MCP servers, models, and token metrics.
- **6 System Badges** — Earn badges like `Toolsmith`, `Multi-Provider`, or `High Throughput` based on your setup.

---

## Installation

You can run and install agentradar using the following methods:

### 1. Run directly (Zero Install)

```bash
npx agentradar
```

### 2. Global Installation

```bash
npm install -g agentradar
```

Once installed, start the TUI dashboard by typing:

```bash
agentradar
```

### 3. Build & Run from Source

```bash
git clone https://github.com/shafiqimtiaz/aiscope.git
cd aiscope
npm install
npm run build
npm start
# Run with demo mock data
node dist/index.js --demo
```

---

## Usage

```bash
# Start TUI dashboard with live local scans
agentradar

# Start TUI dashboard in demo mode (with realistic mock data)
agentradar --demo

# Export scanned data in raw JSON format
 agentradar --json
```

### Keyboard Shortcuts (TUI Mode)

| Key | Action |
|-----|--------|
| `q` | Quit agentradar |
| `r` | Force an immediate scan refresh |

---

## Scoring

Your agents, MCP servers, models, and token usage get scored up to 1000 points:

| Dimension | Max Points | How |
|-----------|-----------|-----|
| **Agents Running** | 350 pts | 75 pts per active agent (cap 4) + 50 pts bonus for 3+ simultaneous |
| **MCP Servers & Skills** | 200 pts | 10 pts per server (cap 15) + 1 pt per tool/move (cap 50) |
| **Model Diversity** | 200 pts | 30 pts per unique model (cap 5) + 50 pts for using 3+ providers |
| **Token Velocity + Sessions** | 250 pts | Velocity levels + session count |

### Rarity Tiers

- **900+** — ELITE ARCHITECT (Top 1%)
- **750+** — EXPERT SYSTEM (Top 5%)
- **600+** — ADVANCED SYSTEM (Top 15%)
- **400+** — SYSTEM ADMINISTRATOR (Top 35%)
- **200+** — SYSTEM OPERATOR (Top 60%)
- **<200** — SYSTEM INITIALIZED (Rookie level)

---

## What gets scanned

<details>
<summary><strong>16 CLI Platform Detectors</strong></summary>

| Platform | Process keyword | Config path |
|----------|----------------|-------------|
| Claude Code | `claude*` | `~/.claude` |
| Codex | `codex*` | `~/.codex` |
| GitHub Copilot CLI | `copilot*` | `~/.copilot` |
| Gemini CLI | `gemini*` | `~/.gemini` |
| Cursor | `cursor` | `~/.cursor` |
| Amp | `amp*` | `~/.amp` |
| Cline | — | `~/.cline` |
| Roo Code | `roo*` | `~/.roo` |
| Kilo Code | `kilo*` | `~/.kilo` |
| Kiro | `kiro` | `~/.kiro` |
| Crush | — | `~/.crush` |
| OpenCode | `opencode` | `~/.opencode` |
| Factory Droid | `factory-droid` | `~/.factory-droid` |
| Antigravity | `antigravity*` | `~/.antigravity` |
| Kimi CLI | `kimi*` | `~/.kimi` |
| Qwen Code | `qwen*` | `~/.qwen` |

</details>

<details>
<summary><strong>Scanned Models (19 patterns)</strong></summary>

Scans for occurrences of the following model families in your local history and logs:
- `claude-4-opus`, `claude-4-sonnet`, `claude-3.7-sonnet`, `claude-3.5-sonnet`, `claude-3-haiku`
- `gpt-4.1`, `gpt-4o`, `gpt-4-turbo`, `o4-mini`, `o3`, `o3-mini`, `o3-pro`
- `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.0-flash`
- `deepseek-v3`, `deepseek-r1`, `qwen-3`, `llama-4`

</details>

---

## Privacy

agentradar runs 100% locally. No data leaves your machine. No telemetry. No analytics. No outbound network requests are made during scanning. All log file parsing, process checking, and configuration scans happen entirely on your computer.
