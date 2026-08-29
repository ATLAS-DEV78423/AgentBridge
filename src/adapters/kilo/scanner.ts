import fs from 'node:fs/promises';
import path from 'node:path';
import { AgentBundle } from '../../core/model/types.js';
import { createResource } from '../../core/scanner/scanner.js';

export async function scanKiloProject(ctx: { root: string }): Promise<AgentBundle> {
  const bundle: AgentBundle = {
    sourceAgent: 'Kilo Code',
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

  // Scan for .kilo/config.json
  const configPath = path.join(ctx.root, '.kilo', 'config.json');
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    bundle.opaque.push(createResource('opaque', '.kilo/config.json', configPath, ctx.root, content));
  } catch { /* config doesn't exist */ }

  return bundle;
}
