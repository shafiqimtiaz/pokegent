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
  <title>Pokégent — ${scoreResult.total} pts</title>
  <meta property="og:title" content="Pokégent — ${scoreResult.total} pts">
  <meta property="og:description" content="${running.length} active Pokémon, ${mcp.length} TMs/HMs loaded. ${rarity}">
  <meta property="og:type" content="website">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background-color: #F8F9FA;
      color: #111111;
      font-family: "Press Start 2P", "Courier New", monospace;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .gameboy-frame {
      background: #FFFFFF;
      border: 4px solid #0F1012;
      box-shadow: 4px 4px 0px #0F1012;
      border-radius: 0px;
      padding: 2rem;
      max-width: 800px;
      width: 100%;
      position: relative;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 4px dashed #0F1012;
    }
    .header h1 {
      font-size: 1.1rem;
      color: #FF0000; /* Pokeball Red */
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .score {
      font-size: 1.1rem;
      color: #3B4CCA; /* GameFreak Blue */
      font-weight: bold;
    }
    .rarity {
      background: #FFDE00; /* Pikachu Yellow */
      border: 4px solid #0F1012;
      box-shadow: 4px 4px 0px #0F1012;
      padding: 0.75rem;
      text-align: center;
      margin-bottom: 2rem;
      font-size: 0.7rem;
      text-transform: uppercase;
      font-weight: bold;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }
    @media (max-width: 768px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
    .section {
      background: #FFFFFF;
      border: 4px solid #0F1012;
      box-shadow: 4px 4px 0px #0F1012;
      padding: 1.25rem;
    }
    .section h2 {
      font-size: 0.65rem;
      color: #111111;
      margin-bottom: 1.25rem;
      text-transform: uppercase;
      border-bottom: 4px solid #0F1012;
      padding-bottom: 0.5rem;
      line-height: 1.4;
    }
    .item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.4rem 0;
      font-family: "Courier New", monospace;
      font-size: 0.95rem;
      font-weight: bold;
      text-transform: uppercase;
      border-bottom: 2px dashed #EEEEEE;
    }
    .sprite-container {
      position: relative;
      width: 40px;
      height: 40px;
      background: #F8F9FA;
      border: 2px solid #0F1012;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .pokemon-sprite {
      position: absolute;
      z-index: 2;
      image-rendering: pixelated;
    }
    .pokemon-sprite.absent {
      filter: grayscale(1) brightness(0.25) opacity(0.3);
    }
    .pokemon-sprite.detected, .pokemon-sprite.idle {
      filter: grayscale(0.8) brightness(0.5) opacity(0.7);
    }
    .fallback-icon {
      font-size: 1.2rem;
      z-index: 1;
    }
    .item .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .item .state { font-size: 0.7rem; padding: 2px 6px; border: 2px solid #0F1012; background: #E2E8F0; }
    .item .state.running { background: #8B956D; color: #000000; } /* DMG Screen Green Style */
    .item .state.idle { background: #FFDE00; color: #000000; }
    .item .state.detected { background: #E2E8F0; color: #555555; }
    .item .state.absent { background: #FFFFFF; color: #CCCCCC; border-color: #E2E8F0; }

    /* HP Style Progress Bar */
    .hp-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
    }
    .hp-label {
      font-size: 0.65rem;
      font-family: "Press Start 2P", monospace;
      font-weight: bold;
      flex-shrink: 0;
    }
    .bar-container {
      flex: 1;
      height: 12px;
      background: #FFFFFF;
      border: 2px solid #0F1012;
      padding: 1px;
    }
    .bar-fill {
      height: 100%;
      background: #4CAF50;
      transition: width 0.3s linear;
    }
    .bar-fill.warning {
      background: #FFC107;
    }
    .bar-fill.critical {
      background: #F44336;
    }

    .metric {
      display: flex;
      justify-content: space-between;
      padding: 0.4rem 0;
      font-family: "Courier New", monospace;
      font-size: 0.95rem;
      font-weight: bold;
      text-transform: uppercase;
      border-bottom: 2px dashed #EEEEEE;
    }
    .metric .label { color: #555555; }
    .metric .value { color: #111111; }

    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .badge {
      background: #FFFFFF;
      border: 3px solid #0F1012;
      padding: 0.5rem 0.75rem;
      font-size: 0.55rem;
      font-weight: bold;
      text-transform: uppercase;
      box-shadow: 2px 2px 0px #0F1012;
      font-family: "Press Start 2P", monospace;
    }

    /* Dialogue box */
    .dialogue-box {
      background: #0F1012;
      border: 4px solid #FFFFFF;
      outline: 4px solid #0F1012;
      padding: 1.25rem;
      color: #F8F9FA;
      font-family: "Press Start 2P", monospace;
      font-size: 0.6rem;
      line-height: 1.8;
      margin-top: 1rem;
      word-break: break-word;
    }
    .dialogue-box a {
      color: #FFDE00;
      text-decoration: none;
    }
    .dialogue-box a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="gameboy-frame">
    <div class="header">
      <h1>◓ Pokégent</h1>
      <div class="score">${scoreResult.total} PTS</div>
    </div>
    <div class="rarity">${rarity}</div>
    <div class="grid">
      <div class="section">
        <h2>🎒 AGENTS · Pokémon Team (${running.length} running)</h2>
        ${[...running, ...idle].slice(0, 6).map(c => {
          const spriteUrl = c.pokemonSlug ? `https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/regular/${c.pokemonSlug}.png` : '';
          const imgHtml = spriteUrl ? `<img class="pokemon-sprite ${c.state.toLowerCase()}" src="${spriteUrl}" alt="${c.name}" width="36" height="36" onload="this.nextElementSibling.style.display='none'" onerror="this.style.display='none'" />` : '';
          return `
            <div class="item">
              <div class="sprite-container">
                ${imgHtml}
                <span class="icon fallback-icon">${c.icon}</span>
              </div>
              <span class="name">${c.name}</span>
              <span class="state ${c.state.toLowerCase()}">${c.state === 'RUNNING' ? `${c.cpuPct.toFixed(1)}% CPU` : c.state.toLowerCase()}</span>
            </div>
          `;
        }).join('')}
        ${clis.length > 6 ? `<div class="item" style="color:#555555; padding-left: 0.5rem; font-family:'Courier New', monospace;">… +${clis.length - 6} MORE</div>` : ''}
      </div>
      <div class="section">
        <h2>📊 MODELS · Species Movepool</h2>
        ${models.slice(0, 5).map(m => {
          const barClass = m.percentage > 50 ? '' : m.percentage > 20 ? 'warning' : 'critical';
          return `
            <div class="item" style="flex-direction:column; align-items:flex-start; gap: 0.25rem;">
              <span class="name" style="font-size:0.85rem">${m.name}</span>
              <div class="hp-container">
                <span class="hp-label">HP</span>
                <div class="bar-container">
                  <div class="bar-fill ${barClass}" style="width:${m.percentage}%"></div>
                </div>
                <span style="font-family:'Courier New', monospace; font-size:0.8rem; min-width:35px; text-align:right">${m.percentage.toFixed(0)}%</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="section">
        <h2>🎒 MCP SERVERS · TMs & HMs (${mcp.length})</h2>
        ${sortedMcp.slice(0, 5).map(t => `
          <div class="item">
            <span class="name" style="color:#111111">◆ ${t.name}</span>
            <span style="color:#555555;font-size:0.8rem">[${t.toolCount} TOOLS]</span>
          </div>
        `).join('')}
        ${mcp.length > 5 ? `<div class="item" style="color:#555555; padding-left: 0.5rem; font-family:'Courier New', monospace;">… +${mcp.length - 5} MORE</div>` : ''}
      </div>
      <div class="section">
        <h2>🔋 TOKEN USAGE · PP Burn</h2>
        <div class="metric"><span class="label">Tokens (PP)</span><span class="value">${fmtTokens(burn.totalTokens)}</span></div>
        <div class="metric"><span class="label">Cost ($)</span><span class="value">$${burn.estimatedCostUsd.toFixed(2)}/mo</span></div>
        <div class="metric"><span class="label">Token Rate</span><span class="value">${fmtTokens(burn.tokenVelocity)}/min</span></div>
        <div class="metric"><span class="label">Sessions</span><span class="value">${burn.sessionCount}</span></div>
        
        <div class="item" style="flex-direction:column; align-items:flex-start; gap: 0.25rem; border-bottom: none;">
          <span class="label" style="font-size:0.8rem; color:#555555;">ENV HEALTH (HP)</span>
          <div class="hp-container">
            <span class="hp-label">HP</span>
            <div class="bar-container">
              <div class="bar-fill ${burn.envIntegrity >= 0.8 ? '' : burn.envIntegrity >= 0.5 ? 'warning' : 'critical'}" style="width:${burn.envIntegrity * 100}%"></div>
            </div>
            <span style="font-family:'Courier New', monospace; font-size:0.8rem; min-width:35px; text-align:right">${Math.round(burn.envIntegrity * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
    <div class="badges">
      ${scoreResult.badges.map(b => `<span class="badge">${b}</span>`).join('')}
    </div>
    <div class="dialogue-box">
      GENERATED BY <a href="https://github.com/shafiqimtiaz/pokegent">POKÉGENT</a>.<br>
      NPX POKEGENT · PRIVACY-FIRST LOCAL SCAN.
    </div>
  </div>
</body>
</html>`;
}
