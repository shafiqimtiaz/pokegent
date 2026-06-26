import { SCORING } from './constants.js';
import type { CliStatus, McpTool, ModelUsage, BurnMetrics, ScoreResult } from './types.js';

export function score(
  clis: CliStatus[],
  mcp: McpTool[],
  models: ModelUsage[],
  burn: BurnMetrics,
): ScoreResult {
  const running = clis.filter(c => c.state === 'RUNNING').length;
  const agentsPts = Math.min(running, SCORING.MAX_AGENTS) * SCORING.AGENT_PTS
    + (running >= SCORING.AGENT_BONUS_THRESHOLD ? SCORING.AGENT_BONUS : 0);

  const totalTools = mcp.reduce((sum, t) => sum + t.toolCount, 0);
  const mcpPts = Math.min(mcp.length, SCORING.MAX_MCP_SERVERS) * SCORING.MCP_SERVER_PTS
    + Math.min(totalTools, SCORING.MCP_TOOL_CAP);

  const providerCount = getProviderCount(models);
  const modelPts = Math.min(models.length, SCORING.MAX_MODELS) * SCORING.MODEL_PTS
    + (providerCount >= SCORING.PROVIDER_THRESHOLD ? SCORING.PROVIDER_BONUS : 0);

  const vel = burn.tokenVelocity;
  const velPts = vel >= 20_000 ? 150 : vel >= 5_000 ? 100 : vel >= 1_000 ? 50 : 0;
  const sessionPts = Math.min(Math.floor(burn.sessionCount / 10), 10) * 10;
  const burnPts = velPts + sessionPts;

  const total = Math.min(agentsPts + mcpPts + modelPts + burnPts, 1000);

  const badges = getBadges(clis, mcp, models, burn);

  return {
    total,
    agentsScore: agentsPts,
    mcpScore: mcpPts,
    modelsScore: modelPts,
    burnScore: burnPts,
    badges,
  };
}

function getProviderCount(models: ModelUsage[]): number {
  const providers = new Set<string>();
  for (const m of models) {
    const name = m.name.toLowerCase();
    if (name.includes('claude')) providers.add('anthropic');
    else if (name.includes('gpt') || name.startsWith('o3') || name.startsWith('o4')) providers.add('openai');
    else if (name.includes('gemini')) providers.add('google');
    else if (name.includes('deepseek')) providers.add('deepseek');
    else if (name.includes('qwen')) providers.add('alibaba');
    else if (name.includes('llama')) providers.add('meta');
  }
  return providers.size;
}

function getBadges(
  clis: CliStatus[],
  mcp: McpTool[],
  models: ModelUsage[],
  burn: BurnMetrics,
): string[] {
  const badges: string[] = [];
  const running = clis.filter(c => c.state === 'RUNNING').length;
  const providerCount = getProviderCount(models);

  if (mcp.length >= 10) badges.push('🏆 MCP Collector');
  if (running >= 3) badges.push('🦄 Multi-Agent');
  if (providerCount >= 3) badges.push('🧬 Provider Hybrid');
  if (burn.tokenVelocity >= 10_000) badges.push('🔥 Token Blazing');
  if (burn.sessionCount >= 100) badges.push('💎 Century Club');
  if (agentsPct(clis) > 50 && mcpPct(mcp) > 50 && modelsPct(models) > 50 && burnPct(burn) > 50) {
    badges.push('⚡ Full Stack');
  }
  if (models.length >= 5) badges.push('🌐 Polyglot Coder');

  return badges;
}

export function agentsPct(clis: CliStatus[]): number {
  const running = clis.filter(c => c.state === 'RUNNING').length;
  return Math.min((running / SCORING.MAX_AGENTS) * 100, 100);
}

export function mcpPct(mcp: McpTool[]): number {
  return Math.min((mcp.length / SCORING.MAX_MCP_SERVERS) * 100, 100);
}

export function modelsPct(models: ModelUsage[]): number {
  return Math.min((models.length / SCORING.MAX_MODELS) * 100, 100);
}

export function burnPct(burn: BurnMetrics): number {
  const velScore = Math.min((burn.tokenVelocity / SCORING.MAX_TOKEN_VELOCITY) * 100, 100);
  const sessionScore = Math.min((burn.sessionCount / 100) * 100, 100);
  return (velScore + sessionScore) / 2;
}

export function rarityLabel(score: number): string {
  if (score >= 900) return '🌟 LEGENDARY — Top 1%';
  if (score >= 750) return '💎 EPIC — Top 5%';
  if (score >= 600) return '🥇 RARE — Top 15%';
  if (score >= 400) return '🥈 UNCOMMON — Top 35%';
  if (score >= 200) return '🥉 COMMON — Top 60%';
  return '🌱 STARTER — everyone starts here';
}
