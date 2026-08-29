export type AgentCapabilities = {
  agentId: string;
  displayName: string;
  capabilities: string[];
};

const CAPABILITIES: Record<string, AgentCapabilities> = {
  'claude-code': {
    agentId: 'claude-code',
    displayName: 'Claude Code',
    capabilities: ['instructions', 'skills', 'commands', 'mcpServers', 'agents', 'permissions', 'hooks']
  },
  'opencode': {
    agentId: 'opencode',
    displayName: 'OpenCode',
    capabilities: ['instructions', 'mcpServers', 'agents']
  },
  'kilo': {
    agentId: 'kilo',
    displayName: 'Kilo Code',
    capabilities: ['instructions', 'mcpServers']
  }
};

export function getCapabilities(agentId: string): AgentCapabilities | undefined {
  return CAPABILITIES[agentId];
}

export function listAgents(): AgentCapabilities[] {
  return Object.values(CAPABILITIES);
}

export function supportsCapability(agentId: string, capability: string): boolean {
  const caps = CAPABILITIES[agentId];
  return caps ? caps.capabilities.includes(capability) : false;
}
