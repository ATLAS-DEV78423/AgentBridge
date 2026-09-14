import { ResourceBase } from '../../core/model/types.js';
import { TargetFile } from '../../core/writers.js';

/** Claude Code infers stdio from `command`; OpenCode's explicit `type` is not valid here. */
function translateMcpServer(server: Record<string, unknown>): Record<string, unknown> {
  const { type: _type, ...rest } = server;
  return rest;
}

/** Pick the subset of an agent's opaque config that Claude Code understands. */
function buildClaudeSettings(opaqueContent: string): Record<string, unknown> {
  let config: Record<string, unknown>;
  try {
    config = JSON.parse(opaqueContent);
  } catch {
    return {};
  }
  const settings: Record<string, unknown> = {};
  if (typeof config.model === 'string') settings.model = config.model;
  if (config.permissions && typeof config.permissions === 'object') settings.permissions = config.permissions;
  if (config.mcpServers && typeof config.mcpServers === 'object') {
    const servers: Record<string, unknown> = {};
    for (const [name, server] of Object.entries(config.mcpServers as Record<string, unknown>)) {
      if (server && typeof server === 'object') servers[name] = translateMcpServer(server as Record<string, unknown>);
    }
    settings.mcpServers = servers;
  }
  return settings;
}

export function writeClaudeFiles(resources: ResourceBase[]): TargetFile[] {
  const files: TargetFile[] = [];
  const settings: Record<string, unknown> = {};
  const mcpServers: Record<string, unknown> = {};
  let hasSettings = false;

  for (const r of resources) {
    if (r.type === 'instructions' && r.content) {
      // GEMINI.md is Gemini-only; agents here read AGENTS.md/CLAUDE.md.
      const targetPath = r.name === 'GEMINI.md' ? 'AGENTS.md' : r.name;
      files.push({ path: targetPath, content: r.content, action: 'create' });
    } else if (r.type === 'opaque' && r.content) {
      Object.assign(settings, buildClaudeSettings(r.content));
      hasSettings = true;
    } else if (r.type === 'mcpServers' && r.content) {
      try {
        mcpServers[r.name] = translateMcpServer(JSON.parse(r.content));
      } catch { /* invalid JSON, skip */ }
    }
  }

  if (Object.keys(mcpServers).length > 0) settings.mcpServers = mcpServers;

  if (hasSettings || Object.keys(mcpServers).length > 0) {
    files.push({ path: '.claude/settings.json', content: JSON.stringify(settings, null, 2), action: 'create' });
  }

  return files;
}
