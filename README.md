<!-- prettier-ignore -->
<div align="center">

# ⬡ AgentCard

[![Node.js](https://img.shields.io/badge/node-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Ink](https://img.shields.io/badge/ink-5.0%2B-ff7700?style=flat-square)](https://github.com/vadimdemedes/ink)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
<br>
[![GitHub release](https://img.shields.io/github/v/release/shafiqimtiaz/agent-card?style=flat-square&logo=github)](https://github.com/shafiqimtiaz/agent-card/releases)
[![GitHub stars](https://img.shields.io/github/stars/shafiqimtiaz/agent-card?style=flat-square)](https://github.com/shafiqimtiaz/agent-card)

Terminal dashboard that shows what's running in your agentic AI coding ecosystem — 16 CLI detectors, MCP server discovery, model usage charts, token burn metrics, and a shareable HTML card.

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Share](#share-your-setup)

</div>

AgentCard is a Node.js TUI that scans your local machine to give you a live picture of your AI tooling landscape. It detects running agentic CLI processes, finds installed MCP servers, tallies model usage from shell history and log files, and estimates token burn rates — all without ever making a network request.

> [!NOTE]
> AgentCard runs entirely locally. No telemetry, no outbound calls, no external services. It reads the process table, configuration directories, and log files on your machine and renders the results in your terminal.

## Features

- **16 CLI detectors** — Scans for Claude Code, Codex, GitHub Copilot CLI, Gemini CLI, Cursor, Amp, Cline, Roo Code, Kilo Code, Kiro, Crush, OpenCode, Factory Droid, Antigravity, Kimi CLI, and Qwen Code
- **MCP discovery** — Aggregates tool servers from `~/.claude`, `~/.cursor`, `~/.opencode`, `~/.n8n` and other standard config paths
- **Model frequency charts** — Parses terminal history and log files for model mentions, renders horizontal ASCII bars
- **Token burn analytics** — Sessions, token velocity, input/output splits, and estimated cost from local logs
- **Scoring system** — 0-1000 points across agents, MCP, models, and burn metrics
- **7 rarity badges** — 🏆 MCP Collector, 🦄 Multi-Agent, 🧬 Provider Hybrid, 🔥 Token Blazing, 💎 Century Club, ⚡ Full Stack, 🌐 Polyglot Coder
- **Shareable HTML card** — Generate a beautiful, self-contained HTML card for GitHub, Twitter, or anywhere
- **2-second auto-refresh** — Live updates so you can watch your ecosystem change as you work
- **Demo mode** — Built-in realistic mock data for previews, screenshots, or evaluation

## Installation

```bash
# Run directly with npx (zero install)
npx agent-card

# Or install globally
npm install -g agent-card
```

## Usage

```bash
# Live TUI dashboard
npx agent-card

# Demo mode with mock data
npx agent-card --demo

# Generate shareable card + copy markdown to clipboard
npx agent-card --share

# Generate HTML card file
npx agent-card --html

# Export raw JSON data
npx agent-card --json
```

### Keyboard shortcuts (TUI mode)

| Key | Action |
|-----|--------|
| `q` | Quit the application |
| `r` | Force an immediate refresh |
| `s` | Share card (copy markdown to clipboard) |
| `h` | Generate HTML card |

## Share your setup

The viral mechanic: **press `s` to copy a markdown card to clipboard, or `h` to generate an HTML file.**

### Markdown card (for Discord, GitHub, Slack)

```bash
npx agent-card --share
```

This prints the terminal card AND copies a markdown version to your clipboard. Paste it anywhere.

### HTML card (for GitHub Pages, Twitter, anywhere)

```bash
npx agent-card --html
```

This generates `agent-card.html` — a self-contained, dark-themed, animated card with OpenGraph meta tags for beautiful link previews. Drop it in a repo, open it in a browser, or share the raw link.

## Scoring

Your setup gets scored 0-1000 points:

| Dimension | Max Points | How |
|-----------|-----------|-----|
| Agents running | 350 | 75 per running agent (cap 4) + 50 bonus for 3+ simultaneous |
| MCP servers/tools | 200 | 10 per server (cap 15) + 1 per tool (cap 50) |
| Model diversity | 200 | 30 per unique model (cap 5) + 50 for using 3+ providers |
| Token velocity + sessions | 250 | Velocity tiers + session count |

### Rarity tiers

| Score | Tier |
|-------|------|
| 900+ | 🌟 LEGENDARY — Top 1% |
| 750+ | 💎 EPIC — Top 5% |
| 600+ | 🥇 RARE — Top 15% |
| 400+ | 🥈 UNCOMMON — Top 35% |
| 200+ | 🥉 COMMON — Top 60% |
| <200 | 🌱 STARTER — everyone starts here |

## What gets scanned

<details>
<summary><strong>16 CLI platforms and their detection signals</strong></summary>

| Platform | Process match | Config path |
|----------|--------------|-------------|
| Claude Code | `claude*` | `~/.claude` |
| Codex | `codex*` | `~/.codex` |
| GitHub Copilot CLI | `copilot*` | `~/.copilot` |
| Gemini CLI | `gemini*` | `~/.gemini` |
| Cursor | `cursor` | `~/.cursor` |
| Amp | `amp*` | `~/.amp` |
| Cline | — | `~/.cline`, VS Code ext |
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
<summary><strong>Scanned model names (19 patterns)</strong></summary>

claude-4-opus, claude-4-sonnet, claude-3.7-sonnet, claude-3.5-sonnet, claude-3-haiku, gpt-4.1, gpt-4o, gpt-4-turbo, o4-mini, o3, o3-mini, o3-pro, gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash, deepseek-v3, deepseek-r1, qwen-3, llama-4

</details>

## Tech stack

- **[Ink](https://github.com/vadimdemedes/ink)** — React for CLI. Provides the TUI framework.
- **[ps-list](https://github.com/sindresorhus/ps-list)** — Cross-platform process listing.
- **Node.js 18+** — All scanning logic uses built-in modules (`fs`, `path`, `child_process`).

## Running from source

```bash
git clone https://github.com/shafiqimtiaz/agent-card.git
cd agent-card
npm install
npx tsx src/index.ts --demo
npx tsx src/index.ts
```

## Privacy

AgentCard runs 100% locally. No data leaves your machine. No telemetry. No analytics. No network requests. Your AI tooling data stays on your computer.
