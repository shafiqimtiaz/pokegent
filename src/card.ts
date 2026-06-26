import type { CliStatus, McpTool, ModelUsage, BurnMetrics, ScoreResult } from './types.js';
import { rarityLabel } from './scoring.js';

export function bar(pct: number, width = 20, filled = '█', empty = '░'): string {
  const filledN = Math.floor((pct / 100) * width);
  return filled.repeat(filledN) + empty.repeat(width - filledN);
}

export function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function renderTerminal(
  clis: CliStatus[],
  mcp: McpTool[],
  models: ModelUsage[],
  burn: BurnMetrics,
  scoreResult: ScoreResult,
): string {
  const clisDetected = clis.filter(c => c.state !== 'ABSENT');
  const running = clisDetected.filter(c => c.state === 'RUNNING');
  const idle = clisDetected.filter(c => c.state === 'IDLE' || c.state === 'DETECTED');

  // Pokémon section
  const agentLines: string[] = [];
  for (const c of [...running, ...idle].slice(0, 6)) {
    if (c.state === 'RUNNING') {
      agentLines.push(`  ${c.icon} ${c.name.padEnd(18)} ● ${c.cpuPct.toFixed(1).padStart(5)}% CPU`);
    } else {
      agentLines.push(`  ${c.icon} ${c.name.padEnd(18)} ○ ${c.state.toLowerCase()}`);
    }
  }
  const remaining = clisDetected.length - agentLines.length;
  if (remaining > 0) agentLines.push(`     … +${remaining} more`);

  // Species movepool section
  const modelLines: string[] = [];
  for (const m of models.slice(0, 5)) {
    const b = bar(m.percentage, 10);
    modelLines.push(`  ${m.name.padEnd(18)} ${b} ${m.percentage.toFixed(1).padStart(5)}%`);
  }

  // TMs & HMs section
  const mcpLines: string[] = [];
  const sortedMcp = [...mcp].sort((a, b) => b.toolCount - a.toolCount);
  for (const t of sortedMcp.slice(0, 5)) {
    const tc = t.toolCount ? `[${t.toolCount}]` : '';
    mcpLines.push(`  ◆ ${t.name.padEnd(16)} ${tc}`);
  }
  const mcpRemaining = mcp.length - 5;
  if (mcpRemaining > 0) mcpLines.push(`     … +${mcpRemaining} more`);

  // PP Burn section
  const burnLines = [
    `  Tokens    ${fmtTokens(burn.totalTokens)}`,
    `  Cost ($)  $${burn.estimatedCostUsd.toFixed(2)}/mo`,
    `  Rate/min  ${fmtTokens(burn.tokenVelocity)}/min`,
    `  Sessions  ${burn.sessionCount}`,
    `  Health    ${bar(burn.envIntegrity * 100, 10)} ${Math.round(burn.envIntegrity * 100)}%`,
  ];

  // Badges
  const badgeLines = scoreResult.badges.length > 0
    ? scoreResult.badges.map(b => `  ${b}`)
    : ['  (none yet)'];

  const rarity = rarityLabel(scoreResult.total);
  const w = 58;

  const lines: string[] = [
    `┌${'─'.repeat(w)}┐`,
    `│  ◓ Pokégent${' '.repeat(w - 20)}${String(scoreResult.total).padStart(4)} pts │`,
    `│${'━'.repeat(w)}│`,
    `│${' '.repeat(w)}│`,
  ];

  const leftHeader = `🎒 AGENTS (${running.length} run)`.padEnd(28);
  const rightHeader = `📊 MODELS`.padEnd(24);
  lines.push(`│  ${leftHeader}  ${rightHeader}│`);

  // Two-column: agents + models
  const maxRows = Math.max(agentLines.length, modelLines.length, 1);
  for (let i = 0; i < maxRows; i++) {
    const left = (agentLines[i] ?? '').padEnd(28);
    const right = modelLines[i] ?? '';
    lines.push(`│  ${left}  ${right.padEnd(24)}│`);
  }

  lines.push(`│${' '.repeat(w)}│`);
  
  const totalTools = mcp.reduce((sum, t) => sum + t.toolCount, 0);
  const leftHeader2 = `🎒 MCP (${mcp.length} servers)`.padEnd(26);
  const rightHeader2 = `🔋 TOKENS (${totalTools} tools)`.padEnd(24);
  lines.push(`│  ${leftHeader2}  ${rightHeader2}│`);

  // Two-column: MCP + Burn
  const maxRows2 = Math.max(mcpLines.length, burnLines.length, 1);
  for (let i = 0; i < maxRows2; i++) {
    const left = (mcpLines[i] ?? '').padEnd(26);
    const right = burnLines[i] ?? '';
    lines.push(`│  ${left}  ${right.padEnd(24)}│`);
  }

  lines.push(`│${' '.repeat(w)}│`);
  
  const leftHeader3 = `🏆 RARITY`.padEnd(26);
  const rightHeader3 = `🏅 BADGES`.padEnd(24);
  lines.push(`│  ${leftHeader3}  ${rightHeader3}│`);
  lines.push(`│  ${rarity.padEnd(26)}  ${badgeLines[0].padEnd(24)}│`);
  for (const bl of badgeLines.slice(1)) {
    lines.push(`│  ${' '.repeat(26)}  ${bl.padEnd(24)}│`);
  }

  lines.push(`│${' '.repeat(w)}│`);
  lines.push(`│${'━'.repeat(w)}│`);
  lines.push(`│  pokegent · npx · privacy-first (zero network)${' '.repeat(10)}│`);
  lines.push(`└${'─'.repeat(w)}┘`);

  return lines.join('\n');
}
