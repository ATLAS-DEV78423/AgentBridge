import fs from 'node:fs/promises';
import path from 'node:path';
import { AgentBundle } from '../../core/model/types.js';
import { ScanContext, createResource } from '../../core/scanner/scanner.js';

const INSTRUCTION_FILES = ['AGENTS.md', 'OPENCODE.md'];
const CONFIG_FILES = ['opencode.json', 'opencode.jsonc'];

export async function scanOpenCodeProject(ctx: ScanContext): Promise<AgentBundle> {
  const bundle: AgentBundle = {
    schemaVersion: '1.0.0',
    metadata: {
      name: path.basename(ctx.root),
      sourceAgent: { id: 'opencode', name: 'OpenCode' },
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
        resource.provenance.sourceAgent = 'opencode';
        bundle.instructions.push(resource);
      }
    } catch {
      // File doesn't exist, skip
    }
  }

  // Scan for config files
  for (const file of CONFIG_FILES) {
    const filePath = path.join(ctx.root, file);
    try {
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        const content = await fs.readFile(filePath, 'utf-8');
        const resource = await createResource(
          'opaque',
          file,
          filePath,
          ctx.root,
          content
        );
        resource.provenance.sourceAgent = 'opencode';
        bundle.opaque.push(resource);
      }
    } catch {
      // File doesn't exist, skip
    }
  }

  return bundle;
}
