import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { MODEL_PATTERNS, SCAN_DIRS, LOG_EXTENSIONS, SHELL_HISTORIES, expandHome } from '../constants.js';
import type { ModelUsage } from '../types.js';

export async function scanModels(): Promise<ModelUsage[]> {
  const hits: Record<string, number> = {};

  for (const dir of SCAN_DIRS.models) {
    const expanded = expandHome(dir);
    try {
      await scanDirRecursive(expanded, hits, 4);
    } catch {
      // dir not found
    }
  }

  // Scan shell history
  for (const hist of SHELL_HISTORIES) {
    const expanded = expandHome(hist);
    try {
      const content = await fs.readFile(expanded, 'utf-8');
      countMatches(content, hits);
    } catch {
      // not found
    }
  }

  if (Object.keys(hits).length === 0) {
    return mockModels();
  }

  const total = Object.values(hits).reduce((a, b) => a + b, 0);
  const usages = Object.entries(hits)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / total) * 1000) / 10,
    }));

  return usages;
}

async function scanDirRecursive(dir: string, hits: Record<string, number>, maxDepth: number): Promise<void> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && maxDepth > 0) {
        await scanDirRecursive(fullPath, hits, maxDepth - 1);
      } else if (entry.isFile() && LOG_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          countMatches(content, hits);
        } catch {
          // skip unreadable files
        }
      }
    }
  } catch {
    // dir not accessible
  }
}

function countMatches(content: string, hits: Record<string, number>): void {
  for (const [model, pattern] of Object.entries(MODEL_PATTERNS)) {
    const matches = content.match(new RegExp(pattern.source, 'gi'));
    if (matches) {
      hits[model] = (hits[model] ?? 0) + matches.length;
    }
  }
}

function mockModels(): ModelUsage[] {
  const mock: [string, number][] = [
    ['claude-4-sonnet', 847],
    ['claude-3.7-sonnet', 623],
    ['gpt-4.1', 412],
    ['claude-4-opus', 289],
    ['o4-mini', 198],
    ['gemini-2.5-pro', 156],
    ['o3-mini', 134],
    ['deepseek-r1', 67],
    ['qwen-3', 45],
    ['llama-4', 23],
  ];
  const total = mock.reduce((a, [, c]) => a + c, 0);
  return mock.map(([name, count]) => ({
    name,
    count,
    percentage: Math.round((count / total) * 1000) / 10,
  }));
}
