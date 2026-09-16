import fs from 'node:fs/promises';
import path from 'node:path';
import { AgentBundle } from '../../core/model/types.js';
import { createResource } from '../../core/scanner/scanner.js';
import { parseJsonc } from '../../core/jsonc.js';

/**
 * OpenCode's documented dialect (opencode.ai/docs/mcp-servers) → the
 * canonical command/args/env shape shared by the other adapters:
 * local servers carry an array `command` + `environment`, remote keep url/headers.
 * Legacy configs using `mcpServers` with stdio/command strings are still read.
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
        bundle.instructions.push(createResource('instruction', file, filePath, ctx.root, content));
      }
    } catch { /* skip */ }
  }

  // Scan for opencode.jsonc / opencode.json (the writer emits .json)
  let configPath: string | null = null;
  for (const candidate of ['opencode.jsonc', 'opencode.json']) {
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
        for (const [name, server] of Object.entries(servers) as [string, any][]) {
          bundle.mcpServers.push(createResource('mcpServer', name, configPath, ctx.root, JSON.stringify(toCanonicalServer(server))));
        }
      }
    } catch { /* parse error, skip */ }

    // Store the parsed config so downstream writers get comment-free JSON
    bundle.opaque.push(createResource('opaque', configPath, path.join(ctx.root, configPath), ctx.root, normalized ?? content));
  } catch { /* config doesn't exist */ }

  return bundle;
}
