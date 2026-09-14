import fs from 'node:fs/promises';
import path from 'node:path';
import { AgentBundle } from '../../core/model/types.js';
import { createResource } from '../../core/scanner/scanner.js';

export async function scanCursorProject(ctx: { root: string }): Promise<AgentBundle> {
  const bundle: AgentBundle = {
    sourceAgent: 'Cursor',
    instructions: [],
    mcpServers: [],
    opaque: [],
  };

  for (const file of ['AGENTS.md']) {
    const filePath = path.join(ctx.root, file);
    try {
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        const content = await fs.readFile(filePath, 'utf-8');
        bundle.instructions.push(createResource('instruction', file, filePath, ctx.root, content));
      }
    } catch { /* skip */ }
  }

  const configPath = path.join(ctx.root, '.cursor', 'mcp.json');
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    bundle.opaque.push(createResource('opaque', '.cursor/mcp.json', configPath, ctx.root, content));

    try {
      const config = JSON.parse(content);
      if (config.mcpServers && typeof config.mcpServers === 'object') {
        for (const [name, server] of Object.entries(config.mcpServers) as [string, any][]) {
          bundle.mcpServers.push(createResource('mcpServer', name, configPath, ctx.root, JSON.stringify(server)));
        }
      }
    } catch { /* parse error, skip */ }
  } catch { /* config doesn't exist */ }

  return bundle;
}
