import { ResourceBase } from '../../core/model/types.js';
import { TargetFile } from '../../core/writers.js';

/**
 * Gemini CLI infers transport from shape (command → stdio, url/httpUrl → remote),
 * so the explicit stdio `type` written by other agents must be stripped.
 * url/httpUrl/headers/env all carry over directly.
 */
function translateMcpServer(server: Record<string, unknown>): Record<string, unknown> {
  const { type: _type, ...rest } = server;
  return rest;
}

export function writeGeminiFiles(resources: ResourceBase[]): TargetFile[] {
  const files: TargetFile[] = [];
  const mcpServers: Record<string, unknown> = {};

  for (const r of resources) {
    if (r.type === 'instructions' && r.content) {
      files.push({ path: 'GEMINI.md', content: r.content, action: 'create' });
    } else if (r.type === 'mcpServers' && r.content) {
      try {
        mcpServers[r.name] = translateMcpServer(JSON.parse(r.content));
      } catch { /* invalid JSON, skip */ }
    }
    // Opaque configs (claude settings, kilo config) intentionally unmapped:
    // their fields have no confirmed .gemini/settings.json equivalents.
  }

  if (Object.keys(mcpServers).length > 0) {
    files.push({
      path: '.gemini/settings.json',
      content: JSON.stringify({ mcpServers }, null, 2),
      action: 'create',
    });
  }

  return files;
}
