import { ResourceBase } from '../../core/model/types.js';
import { TargetFile } from '../../core/writers.js';

/**
 * Translate Claude/OpenCode stdio-style MCP server config to Kilo's local format
 * (per kilo.ai docs): command becomes an array of program+args, env → environment,
 * implicit/explicit stdio → type: "local".
 */
function translateToLocal(server: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { type: 'local' };
  const command = [
    ...(typeof server.command === 'string' ? [server.command] : []),
    ...(Array.isArray(server.args) ? server.args : []),
  ];
  result.command = command;
  if (server.env && typeof server.env === 'object') result.environment = server.env;
  return result;
}

/** Remote (url-based) servers map straight across with type: "remote". */
function translateToRemote(server: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { type: 'remote', url: server.url };
  if (server.headers && typeof server.headers === 'object') result.headers = server.headers;
  return result;
}

function translateMcpServer(server: Record<string, unknown>): Record<string, unknown> {
  return typeof server.url === 'string' ? translateToRemote(server) : translateToLocal(server);
}

/** Pick the subset of a source agent's opaque config that Kilo understands. */
function buildKiloConfig(opaqueContent: string): Record<string, unknown> {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(opaqueContent);
  } catch {
    return {};
  }
  const config: Record<string, unknown> = {};
  if (typeof parsed.model === 'string') config.model = parsed.model;
  if (typeof parsed.maxTokens === 'number') config.maxTokens = parsed.maxTokens;
  return config;
}

export function writeKiloFiles(resources: ResourceBase[]): TargetFile[] {
  const files: TargetFile[] = [];
  const config: Record<string, unknown> = {};
  const mcp: Record<string, unknown> = {};

  for (const r of resources) {
    if (r.type === 'instructions' && r.content) {
      // GEMINI.md is Gemini-only; other agents read AGENTS.md.
      const targetPath = r.name === 'GEMINI.md' ? 'AGENTS.md' : r.name;
      files.push({ path: targetPath, content: r.content, action: 'create' });
    } else if (r.type === 'opaque' && r.content) {
      Object.assign(config, buildKiloConfig(r.content));
    } else if (r.type === 'mcpServers' && r.content) {
      try {
        mcp[r.name] = translateMcpServer(JSON.parse(r.content));
      } catch { /* invalid JSON, skip */ }
    }
  }

  if (Object.keys(mcp).length > 0) config.mcp = mcp;

  if (Object.keys(config).length > 0) {
    files.push({ path: '.kilo/kilo.jsonc', content: JSON.stringify(config, null, 2), action: 'create' });
  }

  return files;
}
