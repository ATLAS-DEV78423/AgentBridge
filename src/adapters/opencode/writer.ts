import { ResourceBase } from '../../core/model/types.js';
import { TargetFile } from '../../core/writers.js';
import { instructionsTarget } from '../simple-agents.js';

/**
 * Canonical command/args/env → OpenCode's documented dialect
 * (opencode.ai/docs/mcp-servers): local servers are `type: "local"` with an
 * array `command` and `environment`; remote servers are `type: "remote"` with
 * `url` (+ headers). Legacy `mcpServers`-shaped opaque configs map through
 * the same translation.
 */
function translateMcpServer(server: Record<string, unknown>): Record<string, unknown> {
  if (typeof server.url === 'string') {
    return {
      type: 'remote',
      url: server.url,
      ...(server.headers && typeof server.headers === 'object' ? { headers: server.headers } : {}),
    };
  }
  return {
    type: 'local',
    command: [
      ...(typeof server.command === 'string' ? [server.command] : []),
      ...(Array.isArray(server.args) ? server.args : []),
    ],
    ...(server.env && typeof server.env === 'object' ? { environment: server.env } : {}),
  };
}

/** Pick the subset of an agent's opaque config that OpenCode understands. */
function buildOpenCodeConfig(opaqueContent: string): Record<string, unknown> {
  let config: Record<string, unknown>;
  try {
    config = JSON.parse(opaqueContent);
  } catch {
    return {};
  }
  const result: Record<string, unknown> = {};
  if (typeof config.model === 'string') result.model = config.model;
  if (config.permissions && typeof config.permissions === 'object') result.permissions = config.permissions;
  // Legacy mcpServers inside an opaque config map through the same translation
  // into the documented `mcp` key.
  if (config.mcpServers && typeof config.mcpServers === 'object') {
    const servers: Record<string, unknown> = {};
    for (const [name, server] of Object.entries(config.mcpServers as Record<string, unknown>)) {
      if (server && typeof server === 'object') servers[name] = translateMcpServer(server as Record<string, unknown>);
    }
    result.mcp = { ...((result.mcp as Record<string, unknown>) ?? {}), ...servers };
  }
  return result;
}

export function writeOpenCodeFiles(resources: ResourceBase[]): TargetFile[] {
  const files: TargetFile[] = [];
  const openCodeConfig: Record<string, unknown> = {};
  const mcpServers: Record<string, unknown> = {};

  // First pass: collect all config and MCP servers
  for (const r of resources) {
    if (r.type === 'opaque' && r.content) {
      // Scanners normalize opaque content to plain JSON (TOML/JSONC included),
      // so parseability — not the filename — decides what maps.
      Object.assign(openCodeConfig, buildOpenCodeConfig(r.content));
    } else if (r.type === 'mcpServers' && r.content) {
      try {
        const serverConfig = JSON.parse(r.content);
        mcpServers[r.name] = translateMcpServer(serverConfig);
      } catch { /* invalid JSON, skip */ }
    }
  }

  // Add translated MCP servers to config under the documented `mcp` key
  if (Object.keys(mcpServers).length > 0) {
    openCodeConfig.mcp = { ...((openCodeConfig.mcp as Record<string, unknown>) ?? {}), ...mcpServers };
  }

  // Write opencode.json if we have anything to write
  if (Object.keys(openCodeConfig).length > 0) {
    files.push({
      path: 'opencode.json',
      content: JSON.stringify(openCodeConfig, null, 2),
      action: 'create'
    });
  }

  // Second pass: write instruction files
  for (const r of resources) {
    if (r.type === 'instructions') {
      files.push({ path: instructionsTarget(r.name), content: r.content || '', action: 'create' });
    }
  }

  return files;
}
