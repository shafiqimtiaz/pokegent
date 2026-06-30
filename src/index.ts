#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { scanClis, scanMcp, scanModels, scanBurn } from './scanner/index.js';
import { score } from './scoring.js';
import { mockClis, mockMcp, mockModels, mockBurn } from './demo.js';
import { VERSION } from './constants.js';
import { Dashboard } from './cli.js';

interface Opts {
  demo?: boolean;
  json?: boolean;
}

const program = new Command();

program
  .name('agentradar')
  .description('Terminal dashboard that monitors your local AI tooling ecosystem')
  .version(VERSION);

program
  .option('--demo', 'Run with mock data')
  .option('--json', 'Export raw data as JSON')
  .action(async (opts: Opts) => {
    if (opts.json) {
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
}

program.parse();
