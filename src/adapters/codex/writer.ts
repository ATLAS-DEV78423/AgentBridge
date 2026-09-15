import { ResourceBase } from '../../core/model/types.js';
import { TargetFile } from '../../core/writers.js';
import { serializeToml } from '../../core/toml.js';
import { instructionsTarget } from '../simple-agents.js';

/** Strip the explicit stdio tag other agents write — Codex infers transport from shape. */
function canonicalServer(server: Record<string, unknown>): Record<string, unknown> {
  const { type: _type, ...rest } = server;
  return rest;
}

/**
 * Rebuilds the .codex/config.toml doc from resources: model comes from the
 * source's opaque config, mcp_servers from canonical servers, instructions
 * go to AGENTS.md. serializeToml emits nested objects as section tables,
 * matching Codex's documented layout ([mcp_servers.name], [mcp_servers.name.env]).
 */
export function writeCodexFiles(resources: ResourceBase[]): TargetFile[] {
  const files: TargetFile[] = [];
  const doc: Record<string, unknown> = {};

  for (const r of resources) {
    if (r.type === 'instructions' && r.content) {
      files.push({ path: instructionsTarget(r.name), content: r.content, action: 'create' });
    } else if (r.type === 'opaque' && r.content) {
      try {
        const parsed = JSON.parse(r.content) as Record<string, unknown>;
        if (typeof parsed.model === 'string') {
          doc.model = parsed.model;
        }
      } catch { /* not JSON — skip */ }
    } else if (r.type === 'mcpServers' && r.content) {
      try {
        const server = canonicalServer(JSON.parse(r.content) as Record<string, unknown>);
        doc.mcp_servers = { ...((doc.mcp_servers as Record<string, unknown>) ?? {}), [r.name]: server };
      } catch { /* invalid JSON, skip */ }
    }
  }

  if (Object.keys(doc).length > 0) {
    files.push({ path: '.codex/config.toml', content: serializeToml(doc), action: 'create' });
  }

  return files;
}
