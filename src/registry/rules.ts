import { CompatibilityRule } from '../core/compatibility/engine.js';
import { MigrationStatus } from '../core/model/types.js';

const AGENTS = ['claude-code', 'opencode', 'kilo'] as const;

const CAPABILITIES: { capability: string; method: 'copy' | 'rewrite'; status: MigrationStatus }[] = [
  { capability: 'instructions', method: 'copy', status: MigrationStatus.DIRECT },
  { capability: 'mcpServers', method: 'rewrite', status: MigrationStatus.ADAPTED },
  { capability: 'opaque', method: 'rewrite', status: MigrationStatus.ADAPTED },
];

const RULES: CompatibilityRule[] = AGENTS.flatMap(source =>
  AGENTS
    .filter(target => target !== source)
    .flatMap(target =>
      CAPABILITIES.map(({ capability, method, status }) => ({
        id: `${source}-${capability}-${target}`,
        sourceCapability: capability,
        method,
        status,
      }))
    )
);

export function getRulesForMigration(sourceAgent: string, targetAgent: string): CompatibilityRule[] {
  return RULES.filter(r => r.id.startsWith(`${sourceAgent}-`) && r.id.endsWith(`-${targetAgent}`));
}
