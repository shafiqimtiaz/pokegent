#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { scanClis, scanMcp, scanModels, scanBurn } from './scanner/index.js';
import { score } from './scoring.js';
import { renderTerminal } from './card.js';
import { renderMarkdown } from './markdown.js';
import { renderHtml } from './html.js';
import { copyToClipboard } from './clipboard.js';
import { mockClis, mockMcp, mockModels, mockBurn } from './demo.js';
import { VERSION } from './constants.js';
import { Dashboard } from './cli.js';
import fs from 'fs/promises';

interface Opts {
  demo?: boolean;
  share?: boolean;
  html?: boolean;
  json?: boolean;
}

const program = new Command();

program
  .name('agent-card')
  .description('Terminal dashboard that shows your agentic AI coding ecosystem')
  .version(VERSION);

program
  .option('--demo', 'Run with mock data')
  .option('--share', 'Generate shareable card and copy to clipboard')
  .option('--html', 'Generate HTML card file')
  .option('--json', 'Export raw data as JSON')
  .action(async (opts: Opts) => {
    if (opts.share || opts.html || opts.json) {
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

  if (opts.html) {
    const html = renderHtml(clis, mcp, models, burn, scoreResult);
    const outPath = 'agent-card.html';
    await fs.writeFile(outPath, html);
    console.log(`✓ HTML card written to ${outPath}`);
    return;
  }

  // --share: terminal card + markdown clipboard
  const terminalCard = renderTerminal(clis, mcp, models, burn, scoreResult);
  console.log(terminalCard);

  const mdCard = renderMarkdown(clis, mcp, models, burn, scoreResult);
  const copied = copyToClipboard(mdCard);
  console.log(copied ? '\n✓ Markdown card copied to clipboard!' : '\n(clipboard unavailable — card printed above)');
}

program.parse();
