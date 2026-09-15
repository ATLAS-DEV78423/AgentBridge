import fs from 'node:fs/promises';
import path from 'node:path';
import { DetectionResult, createResource } from '../../core/scanner/scanner.js';
import { AgentBundle } from '../../core/model/types.js';
import { parseToml } from '../../core/toml.js';

/** Strip agent-dialect fields so servers flow in the canonical command/args/env + url shape. */
function canonicalServer(server: Record<string, unknown>): Record<string, unknown> {
  const { type: _type, ...rest } = server;
  return rest;
}

export async function detectCodex(ctx: { root: string }): Promise<DetectionResult> {
  try {
    await fs.access(path.join(ctx.root, '.codex', 'config.toml'));
    return { detected: true, agent: 'codex' };
  } catch {
    return { detected: false };
  }
}

export async function scanCodexProject(ctx: { root: string }): Promise<AgentBundle> {
  const bundle: AgentBundle = { sourceAgent: 'codex', instructions: [], mcpServers: [], opaque: [] };

  // AGENTS.md is native for Codex; only scan it when a codex config also exists.
  const agentsPath = path.join(ctx.root, 'AGENTS.md');
  try {
    const content = await fs.readFile(agentsPath, 'utf-8');
    bundle.instructions.push(createResource('instructions', 'AGENTS.md', agentsPath, ctx.root, content));
  } catch { /* absent */ }

  const configPath = path.join(ctx.root, '.codex', 'config.toml');
  let doc: Record<string, unknown>;
  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    doc = parseToml(raw);
  } catch {
    return bundle; // absent or unsupported TOML — nothing extractable
  }

  bundle.opaque.push(createResource('opaque', '.codex/config.toml', configPath, ctx.root, JSON.stringify(doc)));

  const servers = doc.mcp_servers;
  if (servers && typeof servers === 'object') {
    for (const [name, server] of Object.entries(servers as Record<string, unknown>)) {
      if (server && typeof server === 'object') {
        bundle.mcpServers.push(createResource('mcpServers', name, configPath, ctx.root, JSON.stringify(canonicalServer(server as Record<string, unknown>))));
      }
    }
  }

  return bundle;
}
