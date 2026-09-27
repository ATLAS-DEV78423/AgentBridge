import { ResourceBase } from '../../core/model/types.js';
import { TargetFile } from '../../core/writers.js';
import { instructionsTarget } from '../simple-agents.js';
import { fromCanonicalServer } from '../dialect.js';

/** Kilo writes the same local/remote dialect as OpenCode, under its own key. */
const translateMcpServer = fromCanonicalServer;

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
      files.push({ path: instructionsTarget(r.name), content: r.content });
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
    files.push({ path: '.kilo/kilo.jsonc', content: JSON.stringify(config, null, 2) });
  }

  return files;
}
