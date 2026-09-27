import fs from 'node:fs/promises';
import path from 'node:path';
import { AgentBundle } from '../../core/model/types.js';
import { AgentAdapter, DetectionResult } from '../../core/scanner/scanner.js';

const INSTRUCTION_FILES = ['AGENTS.md', 'CLAUDE.md'];

const CLAUDE_MARKERS = [
  '.claude/settings.json',
  '.claude/settings.local.json',
  'CLAUDE.md'
];

export async function detectClaude(ctx: { root: string }): Promise<DetectionResult> {
  for (const marker of CLAUDE_MARKERS) {
    try {
      await fs.access(path.join(ctx.root, marker));
      return { detected: true };
    } catch { /* try next marker */ }
  }
  return { detected: false };
}

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
        bundle.instructions.push({ name: file, content });
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

        bundle.opaque.push({ name: `.claude/${entry.name}`, content });

        // Extract MCP servers from settings.json
        if (entry.name === 'settings.json') {
          try {
            const settings = JSON.parse(content);
            if (settings.mcpServers && typeof settings.mcpServers === 'object') {
              for (const [name, server] of Object.entries(settings.mcpServers) as [string, Record<string, unknown>][]) {
                bundle.mcpServers.push({ name, content: JSON.stringify(server) });
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

export const claudeAdapter: AgentAdapter = {
  id: 'claude-code',
  detect: detectClaude,
  scanProject: scanClaudeProject,
};
