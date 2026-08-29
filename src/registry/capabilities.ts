export type AgentCapabilities = {
  id: string;
  displayName: string;
  supported: string[];
};

const CAPABILITIES: Record<string, AgentCapabilities> = {
  'claude-code': {
    id: 'claude-code',
    displayName: 'Claude Code',
    supported: ['instruction', 'skill', 'command', 'mcp', 'agent', 'permission', 'hook']
  },
  'opencode': {
    id: 'opencode',
    displayName: 'OpenCode',
    supported: ['instruction', 'command', 'mcp', 'agent', 'permission']
  },
  'kilo': {
    id: 'kilo',
    displayName: 'Kilo',
    supported: ['instruction', 'skill', 'mcp', 'permission']
  }
};

export function getCapabilities(agentId: string): AgentCapabilities {
  return CAPABILITIES[agentId] || { id: agentId, displayName: agentId, supported: [] };
}
