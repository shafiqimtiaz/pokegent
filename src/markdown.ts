import type { CliStatus, McpTool, ModelUsage, BurnMetrics, ScoreResult } from './types.js';
import { bar, fmtTokens } from './card.js';
import { rarityLabel } from './scoring.js';

export function renderMarkdown(
  clis: CliStatus[],
  mcp: McpTool[],
  models: ModelUsage[],
  burn: BurnMetrics,
  scoreResult: ScoreResult,
): string {
  const clisDetected = clis.filter(c => c.state !== 'ABSENT');
  const running = clisDetected.filter(c => c.state === 'RUNNING');
  const rarity = rarityLabel(scoreResult.total);

  const lines: string[] = [
    '```',
    '┌──────────────────────────────────────────────────────────┐',
    `│  ◓ Pokégent                                     ${String(scoreResult.total).padStart(4)} pts │`,
    '│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│',
    '│                                                          │',
  ];

  const leftHeader = `🎒 AGENTS (${running.length} run)`.padEnd(26);
  const rightHeader = `📊 MODELS`.padEnd(23);
  lines.push(`│  ${leftHeader}  │  ${rightHeader}  │`);

  // Pokémon + Species Movepool rows
  const agentLines: string[] = [];
  for (const c of clisDetected.slice(0, 6)) {
    if (c.state === 'RUNNING') {
      agentLines.push(`${c.icon} ${c.name.padEnd(12)} ● run`);
    } else if (c.state === 'IDLE' || c.state === 'DETECTED') {
      agentLines.push(`${c.icon} ${c.name.padEnd(12)} ○ ${c.state.toLowerCase().slice(0, 4)}`);
    }
  }

  const modelLines: string[] = [];
  for (const m of models.slice(0, 5)) {
    const b = bar(m.percentage, 5);
    modelLines.push(`${m.name.slice(0, 11).padEnd(11)} ${b} ${m.percentage.toFixed(0).padStart(3)}%`);
  }

  const maxRows = Math.max(agentLines.length, modelLines.length);
  for (let i = 0; i < maxRows; i++) {
    const leftPart = (agentLines[i] ?? '').padEnd(26);
    const rightPart = (modelLines[i] ?? '').padEnd(23);
    lines.push(`│  ${leftPart}  │  ${rightPart}  │`);
  }

  lines.push('│                                                          │');
  
  const totalTools = mcp.reduce((sum, t) => sum + t.toolCount, 0);
  const leftHeader2 = `🎒 MCP (${mcp.length} servers)`.padEnd(26);
  const rightHeader2 = `🔋 TOKENS (${totalTools} tools)`.padEnd(23);
  lines.push(`│  ${leftHeader2}  │  ${rightHeader2}  │`);

  // TMs/HMs + PP Burn rows
  const mcpLines: string[] = [];
  const sortedMcp = [...mcp].sort((a, b) => b.toolCount - a.toolCount);
  for (const t of sortedMcp.slice(0, 5)) {
    const tc = t.toolCount ? `[${t.toolCount}]` : '';
    mcpLines.push(`◆ ${t.name.slice(0, 15).padEnd(15)} ${tc}`);
  }

  const burnLines = [
    `Tokens      ${fmtTokens(burn.totalTokens)}`,
    `Cost ($)    $${burn.estimatedCostUsd.toFixed(2)}/mo`,
    `Rate/min    ${fmtTokens(burn.tokenVelocity)}/min`,
    `Sessions    ${burn.sessionCount}`,
  ];

  const maxRows2 = Math.max(mcpLines.length, burnLines.length);
  for (let i = 0; i < maxRows2; i++) {
    const leftPart = (mcpLines[i] ?? '').padEnd(26);
    const rightPart = (burnLines[i] ?? '').padEnd(23);
    lines.push(`│  ${leftPart}  │  ${rightPart}  │`);
  }

  lines.push('│                                                          │');

  if (scoreResult.badges.length > 0) {
    lines.push(`│  🏆 ${scoreResult.badges.slice(0, 3).join(', ').padEnd(53)} │`);
    if (scoreResult.badges.length > 3) {
      lines.push(`│     ${scoreResult.badges.slice(3).join(', ').padEnd(53)} │`);
    }
  } else {
    lines.push(`│  🏆 (collect badges by training more Pokémon)${' '.repeat(13)} │`);
  }

  lines.push('│                                                          │');
  lines.push(`│  ${rarity.padEnd(55)} │`);
  lines.push('│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│');
  lines.push('│  ' + 'pokegent · npx pokegent · github.com/shafiqimtiaz'.padEnd(55) + ' │');
  lines.push('└──────────────────────────────────────────────────────────┘');
  lines.push('```');

  return lines.join('\n');
}
