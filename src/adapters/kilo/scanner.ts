import fs from 'node:fs/promises';
import path from 'node:path';
import { AgentBundle } from '../../core/model/types.js';
import { ScanContext, createResource } from '../../core/scanner/scanner.js';

const INSTRUCTION_FILES = ['AGENTS.md', 'KILO.md'];
const CONFIG_DIR = '.kilo';
const CONFIG_FILES = ['config.json', 'config.yaml', 'settings.json'];

export async function scanKiloProject(ctx: ScanContext): Promise<AgentBundle> {
  const bundle: AgentBundle = {
    schemaVersion: '1.0.0',
    metadata: {
      name: path.basename(ctx.root),
      sourceAgent: { id: 'kilo', name: 'Kilo' },
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
  for (const file of INSTRUCTION_FILES) {
    const filePath = path.join(ctx.root, file);
    try {
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        const content = await fs.readFile(filePath, 'utf-8');
        const resource = await createResource(
          'instruction',
          file,
          filePath,
          ctx.root,
          content
        );
        resource.provenance.sourceAgent = 'kilo';
        bundle.instructions.push(resource);
      }
    } catch {
      // File doesn't exist, skip
    }
  }

  // Scan .kilo directory for config files
  const kiloDir = path.join(ctx.root, CONFIG_DIR);
  try {
    const entries = await fs.readdir(kiloDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && CONFIG_FILES.includes(entry.name)) {
        const filePath = path.join(kiloDir, entry.name);
        const content = await fs.readFile(filePath, 'utf-8');
        const resource = await createResource(
          'opaque',
          `${CONFIG_DIR}/${entry.name}`,
          filePath,
          ctx.root,
          content
        );
        resource.provenance.sourceAgent = 'kilo';
        bundle.opaque.push(resource);
      }
    }
  } catch {
    // .kilo directory doesn't exist
  }

  return bundle;
}
