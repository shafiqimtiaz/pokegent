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
  const sortedMcp = [...mcp].sort((a, b) => b.toolCount - a.toolCount);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pokégent — ${scoreResult.total} PTS</title>
  <meta property="og:title" content="Pokégent — ${scoreResult.total} PTS">
  <meta property="og:description" content="${running.length} active agents, ${mcp.length} MCP servers loaded. ${rarity}">
  <meta property="og:type" content="website">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      /* Retro — Color tokens */
      --black: #000000;
      --white: #ffffff;
      --gray-50: #f9fafb;
      --gray-200: #e2e8f0;
      --gray-400: #687282;
      --gray-500: #475565;
      --gray-900: #111827;
      --peach: #ffd1ba;
      --peach-300: #ffb38f;
      --peach-100: #fff0e8;

      --color-text-primary: var(--gray-500);
      --color-text-tertiary: var(--gray-900);
      --color-text-inverse: var(--gray-400);
      --color-text-on-base: var(--white);

      --color-surface-base: var(--black);
      --color-surface-muted: var(--white);
      --color-surface-raised: var(--gray-50);
      --color-surface-strong: var(--peach);

      --color-border: var(--black);
      --color-border-subtle: rgba(0,0,0,0.12);
      --color-focus-ring: var(--gray-900);

      /* Typography */
      --font-sans: 'Geist', system-ui, -apple-system, sans-serif;
      --font-mono: 'Geist Mono', ui-monospace, monospace;

      --text-caption: 14px;
      --text-body-sm: 16px;
      --text-body-md: 18px;
      --text-subheading: 20px;
      --text-heading: 24px;

      --lh-caption: 24px;
      --lh-body-sm: 24px;
      --lh-body-md: 24px;
      --lh-subheading: 24px;
      --lh-heading: 32px;

      --weight-regular: 400;
      --weight-medium: 500;
      --weight-semibold: 600;
      --weight-bold: 700;

      --tracking-tight: -0.02em;
      --tracking-normal: 0em;
      --tracking-wide: 0.04em;

      /* Spacing */
      --space-1: 4px;
      --space-2: 8px;
      --space-3: 12px;
      --space-4: 16px;
      --space-5: 20px;
      --space-6: 24px;
      --space-7: 32px;
      --space-8: 40px;

      /* Shape */
      --radius-xs: 4px;
      --radius-sm: 6px;
      --border-width: 2px;

      /* Elevation */
      --shadow-1: -6px 6px 0 0 #000;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      margin: 0;
      font: var(--weight-regular) var(--text-body-sm)/var(--lh-body-sm) var(--font-sans);
      color: var(--color-text-primary);
      background: var(--color-surface-muted);
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-8) var(--space-4);
    }

    .retro-card {
      max-width: 860px;
      width: 100%;
      background: var(--white);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-1);
      padding: var(--space-6);
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: var(--border-width) solid var(--color-border);
      padding-bottom: var(--space-4);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .logo-glyph {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      background: var(--color-surface-strong);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-sm);
      font: var(--weight-bold) 18px/1 var(--font-mono);
      color: var(--color-text-tertiary);
    }

    .logo-word {
      font: var(--weight-bold) var(--text-heading)/1 var(--font-sans);
      letter-spacing: var(--tracking-tight);
      color: var(--color-text-tertiary);
    }

    .score-badge {
      display: flex;
      align-items: center;
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-xs);
      overflow: hidden;
    }

    .score-label {
      font: var(--weight-bold) 11px/1 var(--font-mono);
      color: var(--color-text-on-base);
      background: var(--color-surface-base);
      padding: 6px var(--space-3);
      text-transform: uppercase;
      letter-spacing: var(--tracking-wide);
    }

    .score-value {
      font: var(--weight-bold) var(--text-caption)/1 var(--font-mono);
      color: var(--color-text-tertiary);
      padding: 6px var(--space-3);
      background: var(--white);
    }

    .rarity-banner {
      background: var(--color-surface-strong);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: var(--space-3) var(--space-4);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      font: var(--weight-bold) var(--text-body-sm)/1 var(--font-mono);
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: var(--tracking-wide);
    }

    .rarity-banner svg {
      width: 18px;
      height: 18px;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-6);
    }

    @media (max-width: 768px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }

    .section {
      background: var(--color-surface-raised);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: var(--space-5);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .section h2 {
      font: var(--weight-semibold) var(--text-caption)/1 var(--font-mono);
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: var(--tracking-wide);
      border-bottom: var(--border-width) solid var(--color-border);
      padding-bottom: var(--space-3);
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .section h2 svg {
      width: 16px;
      height: 16px;
      color: var(--color-text-tertiary);
    }

    .item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-2) 0;
      border-bottom: 1.5px dashed var(--color-border-subtle);
    }

    .item:last-of-type {
      border-bottom: none;
    }

    .sprite-container {
      position: relative;
      width: 48px;
      height: 48px;
      background: var(--white);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-xs);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .pokemon-sprite {
      position: absolute;
      z-index: 2;
      image-rendering: pixelated;
      width: 44px;
      height: 44px;
    }

    .pokemon-sprite.absent {
      filter: grayscale(1) brightness(0.4) opacity(0.3);
    }

    .pokemon-sprite.detected, .pokemon-sprite.idle {
      filter: grayscale(0.8) brightness(0.6) opacity(0.7);
    }

    .fallback-icon {
      font-size: 1.5rem;
      z-index: 1;
    }

    .item .name {
      flex: 1;
      font: var(--weight-semibold) var(--text-caption)/1.4 var(--font-mono);
      color: var(--color-text-tertiary);
    }

    .item .state {
      font: var(--weight-bold) 11px/1 var(--font-mono);
      padding: 4px var(--space-2);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-xs);
      text-transform: uppercase;
      background: var(--white);
    }

    .item .state.running {
      background: var(--color-surface-strong);
      color: var(--color-text-tertiary);
    }

    .item .state.idle {
      background: var(--peach-100);
      color: var(--color-text-tertiary);
    }

    .item .state.detected {
      background: var(--white);
      color: var(--color-text-primary);
    }

    .item .state.absent {
      background: var(--white);
      color: var(--color-text-inverse);
      border-color: var(--color-border-subtle);
    }

    .more-trigger {
      cursor: pointer;
      transition: background 100ms ease;
    }

    .more-trigger:hover {
      background: var(--peach-100);
    }

    /* HP Progress Bar */
    .hp-container {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      width: 100%;
    }

    .hp-label {
      font: var(--weight-bold) 11px/1 var(--font-sans);
      color: var(--color-text-tertiary);
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius-xs);
      padding: 1px var(--space-1);
      background: var(--color-surface-strong);
      text-transform: uppercase;
    }

    .bar-container {
      flex: 1;
      height: 12px;
      background: var(--white);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-xs);
      overflow: hidden;
      position: relative;
    }

    .bar-fill {
      height: 100%;
      background: #34d399;
      border-right: var(--border-width) solid var(--color-border);
    }

    .bar-fill.warning {
      background: #fbbf24;
    }

    .bar-fill.critical {
      background: #f87171;
    }

    .hp-percent {
      font: var(--weight-bold) 12px/1 var(--font-mono);
      color: var(--color-text-tertiary);
      min-width: 32px;
      text-align: right;
    }

    .metric {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-2) 0;
      border-bottom: 1.5px dashed var(--color-border-subtle);
      font: var(--weight-semibold) var(--text-caption)/1.4 var(--font-mono);
    }

    .metric .label {
      color: var(--color-text-primary);
      text-transform: uppercase;
    }

    .metric .value {
      color: var(--color-text-tertiary);
    }

    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .badge {
      font: var(--weight-semibold) 11px/1 var(--font-mono);
      color: var(--color-text-tertiary);
      background: var(--color-surface-strong);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-xs);
      padding: var(--space-2) var(--space-3);
      text-transform: uppercase;
      letter-spacing: var(--tracking-wide);
    }

    .dialogue-box {
      background: var(--color-surface-base);
      color: var(--color-text-on-base);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: var(--space-4) var(--space-5);
      font: var(--weight-medium) var(--text-caption)/1.5 var(--font-mono);
      text-align: center;
    }

    .dialogue-box a {
      color: var(--color-surface-strong);
      text-decoration: underline;
      font-weight: var(--weight-bold);
    }
  </style>
</head>
<body>
  <div class="retro-card">
    <div class="card-header">
      <div class="brand">
        <span class="logo-glyph">P</span>
        <span class="logo-word">Pokégent</span>
      </div>
      <div class="score-badge">
        <span class="score-label">SCORE</span>
        <span class="score-value">${scoreResult.total} PTS</span>
      </div>
    </div>

    <div class="rarity-banner">
      <i data-lucide="award"></i>
      <span>${rarity}</span>
    </div>

    <div class="grid">
      <!-- Section: Agents -->
      <div class="section">
        <h2><i data-lucide="terminal"></i> AGENTS · Pokémon Team (${running.length} running)</h2>
        ${[...running, ...idle].map((c, idx) => {
          const spriteUrl = c.pokemonSlug ? `https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/regular/${c.pokemonSlug}.png` : '';
          const imgHtml = spriteUrl ? `<img class="pokemon-sprite ${c.state.toLowerCase()}" src="${spriteUrl}" alt="${c.name}" width="52" height="52" onload="this.nextElementSibling.style.display='none'" onerror="this.style.display='none'" />` : '';
          const isHidden = idx >= 6;
          return `
            <div class="item ${isHidden ? 'hidden-agent' : ''}" ${isHidden ? 'style="display: none;"' : ''}>
              <div class="sprite-container">
                ${imgHtml}
                <span class="icon fallback-icon">${c.icon}</span>
              </div>
              <span class="name">${c.name}</span>
              <span class="state ${c.state.toLowerCase()}">${c.state === 'RUNNING' ? `${c.cpuPct.toFixed(1)}% CPU` : c.state.toLowerCase()}</span>
            </div>
          `;
        }).join('')}
        ${clis.length > 6 ? `
          <div class="item more-trigger" onclick="document.querySelectorAll('.hidden-agent').forEach(el => el.style.display = 'flex'); this.style.display = 'none';">
            <span class="name" style="color: var(--color-text-inverse)">… +${clis.length - 6} MORE</span>
            <span class="state" style="border-color: var(--color-border-subtle); color: var(--color-text-inverse)">Expand</span>
          </div>
        ` : ''}
      </div>

      <!-- Section: Models -->
      <div class="section">
        <h2><i data-lucide="database"></i> MODELS · Species Movepool</h2>
        ${models.slice(0, 5).map(m => {
          const barClass = m.percentage > 50 ? '' : m.percentage > 20 ? 'warning' : 'critical';
          return `
            <div class="item" style="flex-direction:column; align-items:flex-start; gap: var(--space-2);">
              <span class="name" style="font-size: var(--text-caption);">${m.name}</span>
              <div class="hp-container">
                <span class="hp-label">HP</span>
                <div class="bar-container">
                  <div class="bar-fill ${barClass}" style="width:${m.percentage}%"></div>
                </div>
                <span class="hp-percent">${m.percentage.toFixed(0)}%</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Section: MCP Servers -->
      <div class="section">
        <h2><i data-lucide="cpu"></i> MCP SERVERS · TMs & HMs (${mcp.length})</h2>
        ${sortedMcp.map((t, idx) => {
          const isHidden = idx >= 5;
          return `
            <div class="item ${isHidden ? 'hidden-mcp' : ''}" ${isHidden ? 'style="display: none;"' : ''}>
              <span class="name" style="color: var(--color-text-tertiary)">◆ ${t.name}</span>
              <span class="state" style="border-color: var(--color-border-subtle); color: var(--color-text-primary); font-size: 10px;">[${t.toolCount} TOOLS]</span>
            </div>
          `;
        }).join('')}
        ${mcp.length > 5 ? `
          <div class="item more-trigger" onclick="document.querySelectorAll('.hidden-mcp').forEach(el => el.style.display = 'flex'); this.style.display = 'none';">
            <span class="name" style="color: var(--color-text-inverse)">… +${mcp.length - 5} MORE</span>
            <span class="state" style="border-color: var(--color-border-subtle); color: var(--color-text-inverse)">Expand</span>
          </div>
        ` : ''}
      </div>

      <!-- Section: Token Burn -->
      <div class="section">
        <h2><i data-lucide="zap"></i> TOKEN USAGE · PP Burn</h2>
        <div class="metric"><span class="label">Tokens (PP)</span><span class="value">${fmtTokens(burn.totalTokens)}</span></div>
        <div class="metric"><span class="label">Cost ($)</span><span class="value">$${burn.estimatedCostUsd.toFixed(2)}/mo</span></div>
        <div class="metric"><span class="label">Token Rate</span><span class="value">${fmtTokens(burn.tokenVelocity)}/min</span></div>
        <div class="metric"><span class="label">Sessions</span><span class="value">${burn.sessionCount}</span></div>
        
        <div class="item" style="flex-direction:column; align-items:flex-start; gap: var(--space-2); border-bottom: none; padding-bottom: 0;">
          <span class="label" style="font: var(--weight-bold) 11px/1 var(--font-mono); color: var(--color-text-inverse); text-transform: uppercase;">ENV HEALTH (HP)</span>
          <div class="hp-container" style="margin-top: var(--space-1);">
            <span class="hp-label" style="background: var(--color-surface-base); color: var(--white); border-color: var(--color-surface-base);">HP</span>
            <div class="bar-container">
              <div class="bar-fill ${burn.envIntegrity >= 0.8 ? '' : burn.envIntegrity >= 0.5 ? 'warning' : 'critical'}" style="width:${burn.envIntegrity * 100}%"></div>
            </div>
            <span class="hp-percent">${Math.round(burn.envIntegrity * 100)}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Badges -->
    <div class="badges">
      ${scoreResult.badges.map(b => `<span class="badge">${b}</span>`).join('')}
    </div>

    <!-- Dialogue Box / Footer -->
    <div class="dialogue-box">
      GENERATED BY <a href="https://github.com/shafiqimtiaz/pokegent" target="_blank" rel="noopener noreferrer">POKÉGENT</a>.<br>
      NPX POKEGENT · PRIVACY-FIRST LOCAL SCAN.
    </div>
  </div>

  <!-- Lucide Icons CDN -->
  <script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      if (window.lucide) {
        lucide.createIcons({ attrs: { 'stroke-width': 2 } });
      }
    });
  </script>
</body>
</html>`;
}
