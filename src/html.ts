import type { CliStatus, McpTool, ModelUsage, BurnMetrics, ScoreResult } from './types.js';
import { rarityLabel } from './scoring.js';
import { fmtTokens } from './card.js';

export function renderHtml(
  clis: CliStatus[],
  mcp: McpTool[],
  models: ModelUsage[],
  burn: BurnMetrics,
  scoreResult: ScoreResult,
): string {
  const running = clis.filter(c => c.state === 'RUNNING');
  const idle = clis.filter(c => c.state === 'IDLE' || c.state === 'DETECTED');
  const rarity = rarityLabel(scoreResult.total);
  const totalTools = mcp.reduce((sum, t) => sum + t.toolCount, 0);
  const sortedMcp = [...mcp].sort((a, b) => b.toolCount - a.toolCount);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgentCard — ${scoreResult.total} pts</title>
  <meta property="og:title" content="AgentCard — ${scoreResult.total} pts">
  <meta property="og:description" content="${running.length} agents, ${mcp.length} MCP servers, ${models.length} models. ${rarity}">
  <meta property="og:type" content="website">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0d1117;
      color: #e6edf3;
      font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 2rem;
      max-width: 700px;
      width: 100%;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #30363d;
    }
    .header h1 {
      font-size: 1.5rem;
      color: #58a6ff;
    }
    .score {
      font-size: 2rem;
      font-weight: bold;
      color: #3fb950;
    }
    .rarity {
      text-align: center;
      margin-bottom: 1.5rem;
      font-size: 1.1rem;
      color: #f0883e;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .section {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 1rem;
    }
    .section h2 {
      font-size: 0.9rem;
      color: #8b949e;
      margin-bottom: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0;
      font-size: 0.85rem;
    }
    .item .icon { font-size: 1rem; }
    .item .name { flex: 1; }
    .item .state { color: #3fb950; font-size: 0.8rem; }
    .item .state.idle { color: #d29922; }
    .item .state.detected { color: #8b949e; }
    .bar-container {
      width: 80px;
      height: 8px;
      background: #21262d;
      border-radius: 4px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      background: #58a6ff;
      border-radius: 4px;
    }
    .metric {
      display: flex;
      justify-content: space-between;
      padding: 0.25rem 0;
      font-size: 0.85rem;
    }
    .metric .label { color: #8b949e; }
    .metric .value { color: #e6edf3; font-weight: 600; }
    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1rem;
    }
    .badge {
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 0.25rem 0.5rem;
      font-size: 0.8rem;
      color: #f0883e;
    }
    .footer {
      text-align: center;
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid #30363d;
      color: #484f58;
      font-size: 0.75rem;
    }
    .footer a { color: #58a6ff; text-decoration: none; }
    .footer a:hover { text-decoration: underline; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .card { animation: fadeIn 0.5s ease-out; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>⬡ AgentCard</h1>
      <div class="score">${scoreResult.total} pts</div>
    </div>
    <div class="rarity">${rarity}</div>
    <div class="grid">
      <div class="section">
        <h2>🤖 Agents (${running.length} running)</h2>
        ${[...running, ...idle].slice(0, 6).map(c => `
          <div class="item">
            <span class="icon">${c.icon}</span>
            <span class="name">${c.name}</span>
            <span class="state ${c.state.toLowerCase()}">${c.state === 'RUNNING' ? `${c.cpuPct.toFixed(1)}% CPU` : c.state.toLowerCase()}</span>
          </div>
        `).join('')}
        ${clis.length > 6 ? `<div class="item" style="color:#484f58">… +${clis.length - 6} more</div>` : ''}
      </div>
      <div class="section">
        <h2>📊 Models</h2>
        ${models.slice(0, 5).map(m => `
          <div class="item">
            <span class="name">${m.name}</span>
            <div class="bar-container"><div class="bar-fill" style="width:${m.percentage}%"></div></div>
            <span style="width:50px;text-align:right">${m.percentage.toFixed(1)}%</span>
          </div>
        `).join('')}
      </div>
      <div class="section">
        <h2>🛠️ MCP (${mcp.length} servers, ${totalTools} tools)</h2>
        ${sortedMcp.slice(0, 5).map(t => `
          <div class="item">
            <span class="name">${t.name}</span>
            <span style="color:#8b949e">[${t.toolCount}]</span>
          </div>
        `).join('')}
        ${mcp.length > 5 ? `<div class="item" style="color:#484f58">… +${mcp.length - 5} more</div>` : ''}
      </div>
      <div class="section">
        <h2>💳 Burn</h2>
        <div class="metric"><span class="label">Tokens</span><span class="value">${fmtTokens(burn.totalTokens)}</span></div>
        <div class="metric"><span class="label">Cost</span><span class="value">$${burn.estimatedCostUsd.toFixed(2)}/mo</span></div>
        <div class="metric"><span class="label">Velocity</span><span class="value">${fmtTokens(burn.tokenVelocity)}/min</span></div>
        <div class="metric"><span class="label">Sessions</span><span class="value">${burn.sessionCount}</span></div>
        <div class="metric"><span class="label">Integrity</span><span class="value">${Math.round(burn.envIntegrity * 100)}%</span></div>
      </div>
    </div>
    <div class="badges">
      ${scoreResult.badges.map(b => `<span class="badge">${b}</span>`).join('')}
    </div>
    <div class="footer">
      Generated by <a href="https://github.com/shafiqimtiaz/agent-card">agent-card</a> · npx agent-card · privacy-first
    </div>
  </div>
</body>
</html>`;
}
