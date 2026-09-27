import fs from 'node:fs/promises';
import path from 'node:path';
import { AgentAdapter, DetectionResult } from '../../core/scanner/scanner.js';
import { AgentBundle } from '../../core/model/types.js';
import { parseJsonc } from '../../core/jsonc.js';
import { toCanonicalServer } from '../dialect.js';

const KILO_CONFIGS = ['.kilo/kilo.jsonc', '.kilo/config.json'];

export async function detectKilo(ctx: { root: string }): Promise<DetectionResult> {
  for (const rel of KILO_CONFIGS) {
    try {
      await fs.access(path.join(ctx.root, rel));
      return { detected: true };
    } catch { /* next marker */ }
  }
  return { detected: false };
}

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
        bundle.instructions.push({ name: file, content });
      }
    } catch { /* skip */ }
  }

  // Scan for kilo config — .kilo/kilo.jsonc is the documented location,
  // .kilo/config.json kept as legacy fallback.
  for (const rel of KILO_CONFIGS) {
    const configPath = path.join(ctx.root, rel);
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      // Extract mcp servers (kilo stores them under a top-level "mcp" key),
      // normalized to the canonical shape the target writers consume.
      let normalized: string | null = null;
      try {
        const config = parseJsonc(content) as Record<string, unknown>;
        normalized = JSON.stringify(config);
        if (config.mcp && typeof config.mcp === 'object') {
          for (const [name, server] of Object.entries(config.mcp) as [string, Record<string, unknown>][]) {
            bundle.mcpServers.push({ name, content: JSON.stringify(toCanonicalServer(server)) });
          }
        }
      } catch { /* parse error, skip */ }

      // Store the parsed config so downstream writers get comment-free JSON
      bundle.opaque.push({ name: rel, content: normalized ?? content });
      break;
    } catch { /* this config doesn't exist */ }
  }

  return bundle;
}

export const kiloAdapter: AgentAdapter = {
  id: 'kilo',
  detect: detectKilo,
  scanProject: scanKiloProject,
};
