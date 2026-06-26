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
  const running = clis.filter(c => c.state === 'RUNNING');
  const rarity = rarityLabel(scoreResult.total);

  const lines: string[] = [
    '```',
    '┌──────────────────────────────────────────────────────────┐',
    `│  ⬡ AgentCard                                    ${String(scoreResult.total).padStart(4)} pts │`,
    '│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│',
    '│                                                          │',
    `│  🤖 AGENTS (${running.length} running)           📊 MODELS              │`,
  ];

  // Agents + Models
  const agentLines: string[] = [];
  for (const c of clis.slice(0, 6)) {
    if (c.state === 'RUNNING') {
      agentLines.push(`│  ${c.icon} ${c.name.padEnd(16)}  ● running              │`);
    } else if (c.state === 'IDLE' || c.state === 'DETECTED') {
      agentLines.push(`│  ${c.icon} ${c.name.padEnd(16)}  ○ ${c.state.toLowerCase().padEnd(20)}│`);
    }
  }

  const modelLines: string[] = [];
  for (const m of models.slice(0, 5)) {
    const b = bar(m.percentage, 8);
    modelLines.push(`│  ${m.name.padEnd(16)} ${b} ${m.percentage.toFixed(1).padStart(4)}%            │`);
  }

  const maxRows = Math.max(agentLines.length, modelLines.length);
  for (let i = 0; i < maxRows; i++) {
    const left = agentLines[i] ?? '│' + ' '.repeat(57) + '│';
    const right = modelLines[i] ?? '';
    lines.push(`${left.slice(0, 30)}  ${right}`);
  }

  lines.push('│                                                          │');
  const totalTools = mcp.reduce((sum, t) => sum + t.toolCount, 0);
  lines.push(`│  🛠️ MCP (${mcp.length} srv, ${totalTools} tools)       💳 BURN                 │`);

  // MCP + Burn
  const mcpLines: string[] = [];
  const sortedMcp = [...mcp].sort((a, b) => b.toolCount - a.toolCount);
  for (const t of sortedMcp.slice(0, 5)) {
    const tc = t.toolCount ? `[${t.toolCount}]` : '';
    mcpLines.push(`│  ◆ ${t.name.padEnd(14)} ${tc.padEnd(6)}                 │`);
  }

  const burnLines = [
    `│  Tokens   ${fmtTokens(burn.totalTokens).padEnd(10)}               │`,
    `│  Cost     $${burn.estimatedCostUsd.toFixed(2)}/mo              │`,
    `│  Velocity ${fmtTokens(burn.tokenVelocity)}/min              │`,
    `│  Sessions ${String(burn.sessionCount).padEnd(10)}               │`,
  ];

  const maxRows2 = Math.max(mcpLines.length, burnLines.length);
  for (let i = 0; i < maxRows2; i++) {
    const left = mcpLines[i] ?? '│' + ' '.repeat(30);
    const right = burnLines[i] ?? '';
    lines.push(`${left.slice(0, 30)}  ${right}`);
  }

  lines.push('│                                                          │');

  if (scoreResult.badges.length > 0) {
    lines.push(`│  🏆 ${scoreResult.badges.slice(0, 3).join(', ').padEnd(52)}│`);
    if (scoreResult.badges.length > 3) {
      lines.push(`│     ${scoreResult.badges.slice(3).join(', ').padEnd(52)}│`);
    }
  } else {
    lines.push(`│  🏆 (collect badges by running more tools)${' '.repeat(14)}│`);
  }

  lines.push('│                                                          │');
  lines.push(`│  ${rarity.padEnd(56)}│`);
  lines.push('│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│');
  lines.push('│  agent-card · npx agent-card · github.com/shafiqimtiaz  │');
  lines.push('└──────────────────────────────────────────────────────────┘');
  lines.push('```');

  return lines.join('\n');
}
