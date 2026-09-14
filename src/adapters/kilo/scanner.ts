import fs from 'node:fs/promises';
import path from 'node:path';
import { AgentBundle } from '../../core/model/types.js';
import { createResource } from '../../core/scanner/scanner.js';
import { parseJsonc } from '../../core/jsonc.js';

/**
 * Kilo's local format (array command, environment) → the canonical
 * command/args/env shape shared by the other adapters; remote keeps url/headers.
 */
function toCanonicalServer(server: Record<string, unknown>): Record<string, unknown> {
  if (server.type === 'local' && Array.isArray(server.command)) {
    const [command, ...args] = server.command as unknown[];
    return {
      ...(typeof command === 'string' ? { command } : {}),
      ...(args.length > 0 ? { args } : {}),
      ...(server.environment && typeof server.environment === 'object' ? { env: server.environment } : {}),
    };
  }
  if (typeof server.url === 'string') {
    return { url: server.url, ...(server.headers ? { headers: server.headers } : {}) };
  }
  return server;
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
        bundle.instructions.push(createResource('instruction', file, filePath, ctx.root, content));
      }
    } catch { /* skip */ }
  }

  // Scan for kilo config — .kilo/kilo.jsonc is the documented location,
  // .kilo/config.json kept as legacy fallback.
  for (const rel of ['.kilo/kilo.jsonc', '.kilo/config.json']) {
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
          for (const [name, server] of Object.entries(config.mcp) as [string, any][]) {
            bundle.mcpServers.push(createResource('mcpServer', name, configPath, ctx.root, JSON.stringify(toCanonicalServer(server))));
          }
        }
      } catch { /* parse error, skip */ }

      // Store the parsed config so downstream writers get comment-free JSON
      bundle.opaque.push(createResource('opaque', rel, configPath, ctx.root, normalized ?? content));
      break;
    } catch { /* this config doesn't exist */ }
  }

  return bundle;
}
