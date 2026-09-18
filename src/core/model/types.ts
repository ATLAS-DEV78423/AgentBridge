export type MigrationStatus = 'DIRECT' | 'ADAPTED' | 'UNSUPPORTED';

export type ResourceBase = {
  id: string;
  type: string;
  name: string;
  content?: string;
};

export type AgentBundle = {
  sourceAgent?: string;
  instructions: ResourceBase[];
  mcpServers: ResourceBase[];
  opaque: ResourceBase[];
};
