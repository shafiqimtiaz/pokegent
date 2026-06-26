#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { scanClis, scanMcp, scanModels, scanBurn } from './scanner/index.js';
import { score } from './scoring.js';
import { renderHtml } from './html.js';
import { execSync } from 'child_process';
import { mockClis, mockMcp, mockModels, mockBurn } from './demo.js';
import { VERSION } from './constants.js';
import { Dashboard } from './cli.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

interface Opts {
  demo?: boolean;
  share?: boolean;
  json?: boolean;
}

const program = new Command();

program
  .name('pokegent')
  .description('Terminal dashboard that shows your Pokémon AI coding ecosystem')
  .version(VERSION);

program
  .option('--demo', 'Run with mock data')
  .option('--share', 'Generate HTML card + PNG screenshot on ~/Desktop')
  .option('--json', 'Export raw data as JSON')
  .action(async (opts: Opts) => {
    if (opts.share || opts.json) {
      await runOneShot(opts);
    } else {
      const { waitUntilExit } = render(React.createElement(Dashboard, { demo: opts.demo ?? false }));
      await waitUntilExit();
    }
  });

async function runOneShot(opts: Opts) {
  let clis, mcp, models, burn;

  if (opts.demo) {
    clis = mockClis();
    mcp = mockMcp();
    models = mockModels();
    burn = mockBurn();
  } else {
    [clis, mcp, models, burn] = await Promise.all([
      scanClis(),
      scanMcp(),
      scanModels(),
      scanBurn(),
    ]);
  }

  const scoreResult = score(clis, mcp, models, burn);

  if (opts.json) {
    console.log(JSON.stringify({ clis, mcp, models, burn, score: scoreResult }, null, 2));
    return;
  }

  // --share: HTML + PNG to Desktop
  const html = renderHtml(clis, mcp, models, burn, scoreResult);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = `pokegent-${ts}`;
  const desktopDir = path.join(os.homedir(), 'Desktop');
  const htmlPath = path.join(desktopDir, `${baseName}.html`);
  const pngPath = path.join(desktopDir, `${baseName}.png`);

  await fs.writeFile(htmlPath, html);
  console.log(`✓ HTML saved → ${htmlPath}`);

  let pngOk = false;
  for (const browser of ['google-chrome', 'google-chrome-stable', 'chromium-browser', 'chromium']) {
    try {
      execSync(`${browser} --headless --disable-gpu --screenshot="${pngPath}" --window-size=850,1200 "file://${htmlPath}"`, { timeout: 15000, stdio: 'ignore' });
      pngOk = true;
      break;
    } catch { /* try next */ }
  }

  if (pngOk) {
    console.log(`✓ PNG saved → ${pngPath}`);
  } else {
    console.log('(PNG skipped — no Chrome/Chromium found)');
  }
}

program.parse();
