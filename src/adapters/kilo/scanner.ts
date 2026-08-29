import fs from 'node:fs/promises';
import path from 'node:path';
import { AgentBundle } from '../../core/model/types.js';
import { ScanContext, createResource } from '../../core/scanner/scanner.js';

export async function scanKiloProject(ctx: ScanContext): Promise<AgentBundle> {
  const bundle: AgentBundle = {
    schemaVersion: '1.0.0',
    metadata: {
      name: path.basename(ctx.root),
      sourceAgent: { id: 'kilo', name: 'Kilo Code' },
      sourceRoot: ctx.root
    },
    instructions: [],
    skills: [],
    commands: [],
    agents: [],
    mcpServers: [],
    permissions: [],
    hooks: [],
    opaque: []
  };

  // Scan for instruction files
  for (const file of ['AGENTS.md']) {
    const filePath = path.join(ctx.root, file);
    try {
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        const content = await fs.readFile(filePath, 'utf-8');
        const resource = await createResource('instruction', file, filePath, ctx.root, content);
        resource.provenance.sourceAgent = 'kilo';
        bundle.instructions.push(resource);
      }
    } catch { /* skip */ }
  }

  // Scan for .kilo/config.json
  const configPath = path.join(ctx.root, '.kilo', 'config.json');
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const resource = await createResource('opaque', '.kilo/config.json', configPath, ctx.root, content);
    resource.provenance.sourceAgent = 'kilo';
    bundle.opaque.push(resource);
  } catch { /* config doesn't exist */ }

  return bundle;
}
