import { AgentBundle, ResourceBase } from '../model/types.js';

export type CanonicalResource = ResourceBase;

export function normalizeBundle(bundle: AgentBundle): CanonicalResource[] {
  const resources: CanonicalResource[] = [];

  for (const section of ['instructions', 'skills', 'commands', 'agents', 'mcpServers', 'permissions', 'hooks', 'opaque'] as const) {
    for (const resource of bundle[section]) {
      resources.push({
        ...resource,
        type: section === 'opaque' ? resource.type : section
      });
    }
  }

  return resources;
}
