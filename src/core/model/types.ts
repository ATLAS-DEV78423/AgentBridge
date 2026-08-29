export enum MigrationStatus {
  EXACT = 'EXACT',
  DIRECT = 'DIRECT',
  ADAPTED = 'ADAPTED',
  PARTIAL = 'PARTIAL',
  UNSUPPORTED = 'UNSUPPORTED',
  SKIPPED = 'SKIPPED',
  BLOCKED = 'BLOCKED'
}

export type AgentRef = {
  id: string;
  name: string;
  version?: string;
};

export type Provenance = {
  sourceAgent: string;
  sourcePath: string;
  scope: 'project' | 'user' | 'system' | 'unknown';
  originalHash: string;
};

export type CompatibilityResult = {
  resourceId: string;
  sourceCapability: string;
  targetCapability?: string;
  status: MigrationStatus;
  method: 'copy' | 'rewrite' | 'generate' | 'omit';
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
  warnings: string[];
  requiresApproval: boolean;
};

export type ResourceBase = {
  id: string;
  type: string;
  name: string;
  content?: string;
  metadata?: Record<string, unknown>;
  provenance: Provenance;
  compatibility?: CompatibilityResult;
};

export type AgentBundle = {
  schemaVersion: string;
  metadata: {
    name: string;
    createdAt?: string;
    sourceAgent?: AgentRef;
    sourceRoot?: string;
  };
  instructions: ResourceBase[];
  skills: ResourceBase[];
  commands: ResourceBase[];
  agents: ResourceBase[];
  mcpServers: ResourceBase[];
  permissions: ResourceBase[];
  hooks: ResourceBase[];
  opaque: ResourceBase[];
};
