import path from 'path';
import os from 'os';

const home = os.homedir();

export const APP_TITLE = '⬡ AgentCard';
export const VERSION = '2.0.0';
export const REFRESH_INTERVAL = 2000;

export interface CliSignature {
  process: string[];
  config: string[];
  icon: string;
}

export const CLI_SIGNATURES: Record<string, CliSignature> = {
  'Claude Code':        { process: ['claude', 'claude-code'],            config: ['~/.claude', '~/.claude.json', '~/.config/claude'],             icon: '🟣' },
  'Codex':              { process: ['codex', 'openai-codex'],            config: ['~/.codex', '~/.config/codex'],                                icon: '🟢' },
  'GitHub Copilot CLI': { process: ['copilot', 'github-copilot'],        config: ['~/.copilot', '~/.config/github-copilot'],                     icon: '⚪' },
  'Gemini CLI':         { process: ['gemini', 'gemini-cli'],             config: ['~/.gemini', '~/.config/gemini'],                              icon: '🔵' },
  'Cursor':             { process: ['cursor'],                           config: ['~/.cursor', '~/.cursor-server'],                              icon: '🟡' },
  'Amp':                { process: ['amp', 'amp-cli'],                   config: ['~/.amp', '~/.config/amp'],                                    icon: '🔶' },
  'Cline':              { process: ['cline'],                            config: ['~/.cline', '~/.vscode/extensions/saoudrizwan.claude-dev-*'],  icon: '🟠' },
  'Roo Code':           { process: ['roo', 'roo-code'],                  config: ['~/.roo', '~/.roo-code'],                                      icon: '🔴' },
  'Kilo Code':          { process: ['kilo', 'kilo-code'],                config: ['~/.kilo', '~/.kilo-code'],                                    icon: '🟤' },
  'Kiro':               { process: ['kiro'],                             config: ['~/.kiro', '~/.config/kiro'],                                  icon: '⚫' },
  'Crush':              { process: ['crush'],                            config: ['~/.crush'],                                                   icon: '🩷' },
  'OpenCode':           { process: ['opencode'],                         config: ['~/.opencode', '~/.config/opencode'],                          icon: '⬜' },
  'Factory Droid':      { process: ['factory', 'factory-droid'],         config: ['~/.factory-droid'],                                           icon: '🏭' },
  'Antigravity':        { process: ['antigravity', 'ag-cli'],            config: ['~/.antigravity'],                                             icon: '🚀' },
  'Kimi CLI':           { process: ['kimi', 'kimi-cli'],                 config: ['~/.kimi', '~/.config/kimi'],                                  icon: '🌙' },
  'Qwen Code':          { process: ['qwen', 'qwen-code'],               config: ['~/.qwen', '~/.config/qwen'],                                  icon: '✨' },
};

export interface McpScanPath {
  path: string;
  source: string;
}

export const MCP_SCAN_PATHS: McpScanPath[] = [
  { path: '~/.claude/mcpServers.json',       source: 'Claude' },
  { path: '~/.claude/config.json',           source: 'Claude' },
  { path: '~/.config/claude/settings.json',  source: 'Claude' },
  { path: '~/.cursor/mcp.json',              source: 'Cursor' },
  { path: '~/.opencode/config.json',         source: 'OpenCode' },
  { path: '~/.roo/mcp.json',                 source: 'Roo Code' },
  { path: '~/.kilo/mcp.json',                source: 'Kilo Code' },
];

export const MODEL_PATTERNS: Record<string, RegExp> = {
  'claude-4-opus':     /claude[\-\s]?4[\-\s]?opus/i,
  'claude-4-sonnet':   /claude[\-\s]?4[\-\s]?sonnet/i,
  'claude-3.7-sonnet': /claude[\-\s]?3\.?7[\-\s]?sonnet/i,
  'claude-3.5-sonnet': /claude[\-\s]?3\.?5[\-\s]?sonnet/i,
  'claude-3-haiku':    /claude[\-\s]?3[\-\s]?haiku/i,
  'gpt-4.1':           /gpt[\-\s]?4\.?1/i,
  'gpt-4o':            /gpt[\-\s]?4o/i,
  'gpt-4-turbo':       /gpt[\-\s]?4[\-\s]?turbo/i,
  'o4-mini':           /o4[\-\s]?mini/i,
  'o3':                /\bo3\b/i,
  'o3-mini':           /o3[\-\s]?mini/i,
  'o3-pro':            /o3[\-\s]?pro/i,
  'gemini-2.5-pro':    /gemini[\-\s]?2\.?5[\-\s]?pro/i,
  'gemini-2.5-flash':  /gemini[\-\s]?2\.?5[\-\s]?flash/i,
  'gemini-2.0-flash':  /gemini[\-\s]?2\.?0[\-\s]?flash/i,
  'deepseek-v3':       /deepseek[\-\s]?v3/i,
  'deepseek-r1':       /deepseek[\-\s]?r1/i,
  'qwen-3':            /qwen[\-\s]?3/i,
  'llama-4':           /llama[\-\s]?4/i,
};

export const SCAN_DIRS = {
  models: ['~/.claude', '~/.cursor', '~/.config', '~/.local/share'],
  burn: ['~/.claude', '~/.cursor', '~/.opencode'],
};

export const LOG_EXTENSIONS = new Set(['.log', '.jsonl', '.json', '.txt']);

export const SHELL_HISTORIES = ['~/.bash_history', '~/.zsh_history', '~/.local/share/fish/fish_history'];

export const ENV_CHECKS = ['python3', 'node', 'git', 'pip3'];

export const SCORING = {
  MAX_AGENTS: 4,
  MAX_MCP_SERVERS: 15,
  MAX_MODELS: 5,
  MAX_TOKEN_VELOCITY: 20_000,
  AGENT_PTS: 75,
  AGENT_BONUS: 50,
  AGENT_BONUS_THRESHOLD: 3,
  MCP_SERVER_PTS: 10,
  MCP_TOOL_CAP: 50,
  MODEL_PTS: 30,
  PROVIDER_BONUS: 50,
  PROVIDER_THRESHOLD: 3,
};

export function expandHome(p: string): string {
  return p.replace(/^~/, home);
}
