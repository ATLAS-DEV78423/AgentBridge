import fs from 'node:fs/promises';
import path from 'node:path';
import { AgentBundle } from '../../core/model/types.js';
import { createResource } from '../../core/scanner/scanner.js';

export async function scanOpenCodeProject(ctx: { root: string }): Promise<AgentBundle> {
  const bundle: AgentBundle = {
    sourceAgent: 'OpenCode',
    instructions: [],
    mcpServers: [],
    opaque: []
  };

  // Scan for instruction files
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

  // Scan for opencode.jsonc
  const configPath = path.join(ctx.root, 'opencode.jsonc');
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    bundle.opaque.push(createResource('opaque', 'opencode.jsonc', configPath, ctx.root, content));

    // Extract MCP servers from config
    try {
      const config = JSON.parse(content);
      if (config.mcpServers) {
        for (const [name, server] of Object.entries(config.mcpServers) as [string, any][]) {
          bundle.mcpServers.push(createResource('mcpServer', name, configPath, ctx.root, JSON.stringify(server)));
        }
      }
    } catch { /* parse error, skip */ }
  } catch { /* config doesn't exist */ }

  return bundle;
}
