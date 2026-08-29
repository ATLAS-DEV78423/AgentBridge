import { CompatibilityRule } from '../core/compatibility/engine.js';
import { MigrationStatus } from '../core/model/types.js';

const RULES: CompatibilityRule[] = [
  // Claude → OpenCode
  { id: 'claude-code-instructions-opencode', sourceCapability: 'instructions', method: 'copy', status: MigrationStatus.DIRECT },
  { id: 'claude-code-mcpServers-opencode', sourceCapability: 'mcpServers', method: 'rewrite', status: MigrationStatus.ADAPTED },
  { id: 'claude-code-opaque-opencode', sourceCapability: 'opaque', method: 'rewrite', status: MigrationStatus.ADAPTED },
  // Claude → Kilo
  { id: 'claude-code-instructions-kilo', sourceCapability: 'instructions', method: 'copy', status: MigrationStatus.DIRECT },
  { id: 'claude-code-mcpServers-kilo', sourceCapability: 'mcpServers', method: 'rewrite', status: MigrationStatus.ADAPTED },
  { id: 'claude-code-opaque-kilo', sourceCapability: 'opaque', method: 'rewrite', status: MigrationStatus.ADAPTED },
];

export function getRulesForMigration(sourceAgent: string, targetAgent: string): CompatibilityRule[] {
  return RULES.filter(r => r.id.startsWith(`${sourceAgent}-`) && r.id.endsWith(`-${targetAgent}`));
}
