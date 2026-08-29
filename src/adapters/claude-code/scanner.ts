import fs from 'node:fs/promises';
import path from 'node:path';
import { AgentBundle } from '../../core/model/types.js';
import { createResource } from '../../core/scanner/scanner.js';

const INSTRUCTION_FILES = ['AGENTS.md', 'CLAUDE.md'];

export async function scanClaudeProject(ctx: { root: string }): Promise<AgentBundle> {
  const bundle: AgentBundle = {
    sourceAgent: 'Claude Code',
    instructions: [],
    mcpServers: [],
    opaque: []
  };

  // Scan for instruction files
  for (const file of INSTRUCTION_FILES) {
    const filePath = path.join(ctx.root, file);
    try {
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        const content = await fs.readFile(filePath, 'utf-8');
        bundle.instructions.push(createResource('instruction', file, filePath, ctx.root, content));
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

        bundle.opaque.push(createResource('opaque', `.claude/${entry.name}`, filePath, ctx.root, content));

        // Extract MCP servers from settings.json
        if (entry.name === 'settings.json') {
          try {
            const settings = JSON.parse(content);
            if (settings.mcpServers && typeof settings.mcpServers === 'object') {
              for (const [name, server] of Object.entries(settings.mcpServers) as [string, Record<string, unknown>][]) {
                bundle.mcpServers.push(createResource('mcpServer', name, filePath, ctx.root, JSON.stringify(server)));
              }
            }
          } catch { /* parse error, skip */ }
        }
      }
    }
  } catch {
    // .claude directory doesn't exist
  }

  return bundle;
}
