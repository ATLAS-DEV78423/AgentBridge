import { AgentBundle, ResourceBase } from '../model/types.js';

export type NormalizedResource = ResourceBase & { capability: string };

export function normalizeBundle(bundle: AgentBundle): NormalizedResource[] {
  const out: NormalizedResource[] = [];
  const map = (arr: ResourceBase[], cap: string) => arr.forEach(r => out.push({ ...r, capability: cap }));

  map(bundle.instructions, 'instruction');
  map(bundle.skills, 'skill');
  map(bundle.commands, 'command');
  map(bundle.mcpServers, 'mcp');
  map(bundle.agents, 'agent');
  map(bundle.permissions, 'permission');
  map(bundle.hooks, 'hook');
  map(bundle.opaque, 'opaque');

  return out;
}
