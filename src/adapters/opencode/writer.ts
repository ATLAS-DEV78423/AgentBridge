import { ResourceBase } from '../../core/model/types.js';
import { TargetFile } from '../../core/writers.js';

/** Translate Claude Code MCP server config to OpenCode format. */
function translateMcpServer(claudeConfig: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  // OpenCode requires explicit type field; Claude infers stdio
  result.type = 'stdio';
  if (claudeConfig.command) result.command = claudeConfig.command;
  if (claudeConfig.args) result.args = claudeConfig.args;
  if (claudeConfig.env) result.env = claudeConfig.env;
  return result;
}

/** Build opencode.json from Claude Code settings. */
function buildOpenCodeConfig(claudeSettings: Record<string, unknown>): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  if (claudeSettings.model) config.model = claudeSettings.model;
  if (claudeSettings.permissions) config.permissions = claudeSettings.permissions;
  // MCP servers are handled separately via translateMcpServer
  return config;
}

export function writeOpenCodeFiles(resources: ResourceBase[]): TargetFile[] {
  const files: TargetFile[] = [];
  const openCodeConfig: Record<string, unknown> = {};
  const mcpServers: Record<string, unknown> = {};
  let hasSettings = false;

  // First pass: collect all config and MCP servers
  for (const r of resources) {
    if (r.type === 'opaque' && r.name.includes('settings.json') && r.content) {
      try {
        Object.assign(openCodeConfig, buildOpenCodeConfig(JSON.parse(r.content)));
        hasSettings = true;
      } catch { /* invalid JSON, skip */ }
    } else if (r.type === 'mcpServers' && r.content) {
      // MCP from dedicated mcpServers resources
      try {
        const serverConfig = JSON.parse(r.content);
        mcpServers[r.name] = translateMcpServer(serverConfig);
      } catch { /* invalid JSON, skip */ }
    }
  }

  // Add translated MCP servers to config
  if (Object.keys(mcpServers).length > 0) {
    openCodeConfig.mcpServers = mcpServers;
  }

  // Write opencode.json if we have anything to write
  if (hasSettings || Object.keys(mcpServers).length > 0) {
    files.push({
      path: 'opencode.json',
      content: JSON.stringify(openCodeConfig, null, 2),
      action: 'create'
    });
  }

  // Second pass: write instruction files
  for (const r of resources) {
    if (r.type === 'instructions') {
      files.push({ path: r.name, content: r.content || '', action: 'create' });
    }
  }

  return files;
}
