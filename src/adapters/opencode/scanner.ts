import fs from 'node:fs/promises';
import path from 'node:path';
import { AgentAdapter, DetectionResult } from '../../core/scanner/scanner.js';
import { AgentBundle } from '../../core/model/types.js';
import { parseJsonc } from '../../core/jsonc.js';
import { toCanonicalServer } from '../dialect.js';

/** OpenCode reads `opencode.json[c]` — and this tool's own writer emits .json. */
const OPENCODE_CONFIGS = ['opencode.jsonc', 'opencode.json'];

export async function detectOpenCode(ctx: { root: string }): Promise<DetectionResult> {
  for (const rel of OPENCODE_CONFIGS) {
    try {
      await fs.access(path.join(ctx.root, rel));
      return { detected: true };
    } catch { /* try next candidate */ }
  }
  return { detected: false };
}

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
        bundle.instructions.push({ name: file, content });
      }
    } catch { /* skip */ }
  }

  // Scan for opencode.jsonc / opencode.json (the writer emits .json)
  let configPath: string | null = null;
  for (const candidate of OPENCODE_CONFIGS) {
    try {
      await fs.access(path.join(ctx.root, candidate));
      configPath = candidate;
      break;
    } catch { /* try next candidate */ }
  }
  try {
    if (!configPath) throw new Error('no opencode config');
    const content = await fs.readFile(path.join(ctx.root, configPath), 'utf-8');
    // Extract MCP servers — documented key is `mcp`; legacy `mcpServers` still read.
    let normalized: string | null = null;
    try {
      const config = parseJsonc(content) as Record<string, unknown>;
      normalized = JSON.stringify(config);
      const sections = [config.mcp, config.mcpServers];
      for (const servers of sections) {
        if (!servers || typeof servers !== 'object') continue;
        for (const [name, server] of Object.entries(servers) as [string, Record<string, unknown>][]) {
          bundle.mcpServers.push({ name, content: JSON.stringify(toCanonicalServer(server)) });
        }
      }
    } catch { /* parse error, skip */ }

    // Store the parsed config so downstream writers get comment-free JSON
    bundle.opaque.push({ name: configPath, content: normalized ?? content });
  } catch { /* config doesn't exist */ }

  return bundle;
}

export const openCodeAdapter: AgentAdapter = {
  id: 'opencode',
  detect: detectOpenCode,
  scanProject: scanOpenCodeProject,
};
