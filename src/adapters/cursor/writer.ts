import { ResourceBase } from '../../core/model/types.js';
import { TargetFile } from '../../core/writers.js';

/**
 * Translate stdio-style MCP server config to Cursor's format
 * (per cursor.com/docs): type: "stdio" is required, remote (url) entries
 * pass through as-is since Cursor's remote shape matches.
 */
function translateMcpServer(server: Record<string, unknown>): Record<string, unknown> {
  if (typeof server.url === 'string') return server;
  return { type: 'stdio', ...server };
}

export function writeCursorFiles(resources: ResourceBase[]): TargetFile[] {
  const files: TargetFile[] = [];
  const mcpServers: Record<string, unknown> = {};

  for (const r of resources) {
    if (r.type === 'instructions' && r.content) {
      // GEMINI.md is Gemini-only; other agents read AGENTS.md.
      const targetPath = r.name === 'GEMINI.md' ? 'AGENTS.md' : r.name;
      files.push({ path: targetPath, content: r.content, action: 'create' });
    } else if (r.type === 'mcpServers' && r.content) {
      try {
        mcpServers[r.name] = translateMcpServer(JSON.parse(r.content));
      } catch { /* invalid JSON, skip */ }
    }
    // Opaque configs (claude settings, kilo config) intentionally unmapped:
    // model/permissions have no .cursor/mcp.json equivalent.
  }

  if (Object.keys(mcpServers).length > 0) {
    files.push({
      path: '.cursor/mcp.json',
      content: JSON.stringify({ mcpServers }, null, 2),
      action: 'create',
    });
  }

  return files;
}
