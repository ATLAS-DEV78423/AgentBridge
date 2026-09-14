import { ResourceBase } from '../../core/model/types.js';
import { TargetFile } from '../../core/writers.js';

export function writeKiloFiles(resources: ResourceBase[]): TargetFile[] {
  const files: TargetFile[] = [];
  const config: Record<string, unknown> = {};
  let hasConfig = false;

  for (const r of resources) {
    if (r.type === 'instructions' && r.content) {
      files.push({ path: r.name, content: r.content, action: 'create' });
    } else if (r.type === 'opaque' && r.content) {
      // ponytail: only model/maxTokens map today; Kilo's scanned config schema
      // has no mcpServers/permissions sections — extend here when it does.
      try {
        const parsed = JSON.parse(r.content);
        if (typeof parsed.model === 'string') config.model = parsed.model;
        if (typeof parsed.maxTokens === 'number') config.maxTokens = parsed.maxTokens;
        hasConfig = true;
      } catch { /* invalid JSON, skip */ }
    }
    // mcpServers resources deliberately ignored: no mcp section in .kilo/config.json
  }

  if (hasConfig) {
    files.push({ path: '.kilo/config.json', content: JSON.stringify(config, null, 2), action: 'create' });
  }

  return files;
}
