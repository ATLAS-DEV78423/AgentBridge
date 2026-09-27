export type MigrationStatus = 'DIRECT' | 'ADAPTED' | 'UNSUPPORTED';

/**
 * One scanned instruction file, MCP server, or opaque config. `type` is set
 * from the bundle section by flattenBundle — scanners leave it unset, so the
 * section a resource was scanned into is the only place that fact lives.
 */
export type ResourceBase = {
  name: string;
  content?: string;
  type?: string;
};

export type AgentBundle = {
  sourceAgent?: string;
  instructions: ResourceBase[];
  mcpServers: ResourceBase[];
  opaque: ResourceBase[];
};
