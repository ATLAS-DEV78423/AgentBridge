export enum MigrationStatus {
  DIRECT = 'DIRECT',
  ADAPTED = 'ADAPTED',
  UNSUPPORTED = 'UNSUPPORTED',
}

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
