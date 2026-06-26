<!-- prettier-ignore -->
<div align="center">

# ◓ Pokégent

[![Node.js](https://img.shields.io/badge/node-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Ink](https://img.shields.io/badge/ink-5.0%2B-ff7700?style=flat-square)](https://github.com/vadimdemedes/ink)
<br>
[![GitHub release](https://img.shields.io/github/v/release/shafiqimtiaz/pokegent?style=flat-square&logo=github)](https://github.com/shafiqimtiaz/pokegent/releases)
[![GitHub stars](https://img.shields.io/github/stars/shafiqimtiaz/pokegent?style=flat-square)](https://github.com/shafiqimtiaz/pokegent)

Terminal dashboard that scans and monitors your Pokémon AI coding ecosystem — 16 Pokémon species (CLI) detectors, TMs/HMs (MCP) discovery, movepool usage charts, PP burn metrics, and a shareable HTML Trainer Card.

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Scoring](#scoring) • [Privacy](#privacy)

</div>

Pokégent is a Node.js TUI that scans your local machine to give you a live picture of your Pokémon AI tooling landscape. It detects running AI processes as active Pokémon, discovers installed TMs/HMs (MCP servers), tallies movepool (model) usage from history, and measures PP burn rates (tokens) — all locally, with zero outbound network requests.

> [!NOTE]
> Pokégent runs entirely locally. It reads the process table, configuration directories, and local log files on your machine to render the results in your terminal. No telemetry, no network calls.

---

## Features

- **16 Pokémon Species Detectors** — Scans for running AI platforms represented as Pokémon (Mewtwo, Pikachu, Eevee, Gengar, Snorlax, Charizard, etc.).
- **TM/HM (MCP) Discovery** — Aggregates installed tool servers from standard config paths (Claude, Cursor, OpenCode, n8n, etc.).
- **Movepool Frequency Charts** — Analyzes shell history and log files for model name patterns, rendering horizontal ASCII bars.
- **PP Burn Analytics** — Measures battles (sessions), PP velocity (tokens/min), input/output splits, and estimated token costs.
- **Trainer Level Scoring** — Calculates a score from 0-1000 across your active roster, moves, and items.
- **7 Trainer Badges** — Earn badges like `Pokédex Master`, `Blast Burn`, or `Thunder Shock` based on your setup.
- **HTML Trainer Card** — Generates a self-contained, GameBoy-style HTML card featuring animated showdown sprites for active Pokémon.

---

## Installation

You can run and install Pokégent using the following methods:

### 1. Run directly (Zero Install)
The quickest way to run Pokégent is using `npx`:
```bash
npx pokegent
```

### 2. Global Installation
To install Pokégent globally on your system:
```bash
npm install -g pokegent
```
Once installed, you can start the TUI dashboard by typing:
```bash
pokegent
```

### 3. Build & Run from Source (Local Development)
If you want to run or modify the code locally:
```bash
# Clone the repository
git clone https://github.com/shafiqimtiaz/pokegent.git
cd pokegent

# Install dependencies
npm install

# Build the project (compiles TypeScript to dist/index.js)
npm run build

# Start the dashboard
npm start

# Run with demo mock data
node dist/index.js --demo
```

---

## Usage

Run Pokégent with optional flags to generate reports or export data:

```bash
# Start TUI dashboard with live local scans
pokegent

# Start TUI dashboard in demo mode (with realistic mock data)
pokegent --demo

# Generate a markdown Trainer Card and copy it to the clipboard
pokegent --share

# Export stats as a GameBoy-style HTML card file (pokegent.html)
pokegent --html

# Export scanned data in raw JSON format
pokegent --json
```

### Keyboard Shortcuts (TUI Mode)

| Key | Action |
|-----|--------|
| `q` | Quit Pokégent |
| `r` | Force an immediate scan refresh |
| `s` | Share setup (copies markdown card to clipboard) |
| `h` | Generate HTML Trainer Card (`pokegent.html`) |

---

## Scoring

Your roster, moves, and items get scored up to 1000 points:

| Dimension | Max Points | How |
|-----------|-----------|-----|
| **Pokémon Running** | 350 pts | 75 pts per active Pokémon (cap 4) + 50 pts bonus for 3+ simultaneous |
| **TMs & HMs (MCP)** | 200 pts | 10 pts per server (cap 15) + 1 pt per tool/move (cap 50) |
| **Movepool Diversity** | 200 pts | 30 pts per unique model (cap 5) + 50 pts for using 3+ providers |
| **PP Velocity + Battles** | 250 pts | Velocity levels + session/battle count |

### Rarity Tiers

Based on your score, you are assigned a Trainer Tier:
- **900+** — 🌟 MYTHICAL CHAMPION (Top 1%)
- **750+** — 💎 SHINY LEGENDARY (Top 5%)
- **600+** — 🥇 POKÉMON MASTER (Top 15%)
- **400+** — 🥈 GYM LEADER (Top 35%)
- **200+** — 🥉 ELITE TRAINER (Top 60%)
- **<200** — 🌱 BEGINNER TRAINER (Rookie level)

---

## What gets scanned

<details>
<summary><strong>16 Pokémon Species & CLI Mappings</strong></summary>

| Pokémon | CLI Platform | Process keyword | Config path |
|---------|--------------|-----------------|-------------|
| **Mewtwo** | Claude Code | `claude*` | `~/.claude` |
| **Venusaur** | Codex | `codex*` | `~/.codex` |
| **Blastoise** | GitHub Copilot CLI | `copilot*` | `~/.copilot` |
| **Pikachu** | Gemini CLI | `gemini*` | `~/.gemini` |
| **Eevee** | Cursor | `cursor` | `~/.cursor` |
| **Charizard** | Amp | `amp*` | `~/.amp` |
| **Charmander** | Cline | — | `~/.cline` |
| **Gengar** | Roo Code | `roo*` | `~/.roo` |
| **Snorlax** | Kilo Code | `kilo*` | `~/.kilo` |
| **Zubat** | Kiro | `kiro` | `~/.kiro` |
| **Jigglypuff** | Crush | — | `~/.crush` |
| **Ditto** | OpenCode | `opencode` | `~/.opencode` |
| **Machamp** | Factory Droid | `factory-droid` | `~/.factory-droid` |
| **Rayquaza** | Antigravity | `antigravity*` | `~/.antigravity` |
| **Lapras** | Kimi CLI | `kimi*` | `~/.kimi` |
| **Dragonite** | Qwen Code | `qwen*` | `~/.qwen` |

</details>

<details>
<summary><strong>Scanned Moves & Models (19 patterns)</strong></summary>

Scans for occurrences of the following model families in your local history and logs:
- `claude-4-opus`, `claude-4-sonnet`, `claude-3.7-sonnet`, `claude-3.5-sonnet`, `claude-3-haiku`
- `gpt-4.1`, `gpt-4o`, `gpt-4-turbo`, `o4-mini`, `o3`, `o3-mini`, `o3-pro`
- `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.0-flash`
- `deepseek-v3`, `deepseek-r1`, `qwen-3`, `llama-4`

</details>

---

## Privacy

Pokégent runs 100% locally. No data leaves your machine. No telemetry. No analytics. No outbound network requests are made during scanning. All log file parsing, process checking, and configuration scans happen entirely on your computer.
