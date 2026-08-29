import fs from 'node:fs/promises';
import path from 'node:path';
import { AgentBundle } from '../../core/model/types.js';
import { ScanContext, createResource } from '../../core/scanner/scanner.js';

const INSTRUCTION_FILES = ['AGENTS.md', 'CLAUDE.md'];

export async function scanClaudeProject(ctx: ScanContext): Promise<AgentBundle> {
  const bundle: AgentBundle = {
    schemaVersion: '1.0.0',
    metadata: {
      name: path.basename(ctx.root),
      sourceAgent: { id: 'claude-code', name: 'Claude Code' },
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
        resource.provenance.sourceAgent = 'claude-code';
        bundle.instructions.push(resource);
      }
    } catch {
      // File doesn't exist, skip
    }
  }

  // Scan for .claude directory
  const claudeDir = path.join(ctx.root, '.claude');
  try {
    const entries = await fs.readdir(claudeDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        const filePath = path.join(claudeDir, entry.name);
        const content = await fs.readFile(filePath, 'utf-8');
        
        const resource = await createResource(
          'opaque',
          `.claude/${entry.name}`,
          filePath,
          ctx.root,
          content
        );
        resource.provenance.sourceAgent = 'claude-code';
        bundle.opaque.push(resource);
      }
    }
  } catch {
    // .claude directory doesn't exist
  }

  return bundle;
}
