import { CompatibilityRule } from '../core/compatibility/engine.js';
import { MigrationStatus } from '../core/model/types.js';

const RULES: CompatibilityRule[] = [
  // Claude → OpenCode
  { id: 'claude-code-instructions-opencode', sourceCapability: 'instructions', targetCapability: 'instructions', method: 'copy', status: MigrationStatus.DIRECT, confidence: 'high' },
  { id: 'claude-code-skills-opencode', sourceCapability: 'skills', method: 'omit', status: MigrationStatus.UNSUPPORTED, confidence: 'high' },
  { id: 'claude-code-commands-opencode', sourceCapability: 'commands', method: 'omit', status: MigrationStatus.UNSUPPORTED, confidence: 'high' },
  { id: 'claude-code-mcpServers-opencode', sourceCapability: 'mcpServers', targetCapability: 'mcpServers', method: 'rewrite', status: MigrationStatus.ADAPTED, confidence: 'medium' },
  { id: 'claude-code-agents-opencode', sourceCapability: 'agents', targetCapability: 'agents', method: 'copy', status: MigrationStatus.DIRECT, confidence: 'medium' },
  { id: 'claude-code-permissions-opencode', sourceCapability: 'permissions', method: 'omit', status: MigrationStatus.UNSUPPORTED, confidence: 'high' },
  { id: 'claude-code-hooks-opencode', sourceCapability: 'hooks', method: 'omit', status: MigrationStatus.UNSUPPORTED, confidence: 'high' },
  { id: 'claude-code-opaque-opencode', sourceCapability: 'opaque', targetCapability: 'opaque', method: 'rewrite', status: MigrationStatus.ADAPTED, confidence: 'medium' },
  // Claude → Kilo
  { id: 'claude-code-instructions-kilo', sourceCapability: 'instructions', targetCapability: 'instructions', method: 'copy', status: MigrationStatus.DIRECT, confidence: 'high' },
  { id: 'claude-code-skills-kilo', sourceCapability: 'skills', method: 'omit', status: MigrationStatus.UNSUPPORTED, confidence: 'high' },
  { id: 'claude-code-commands-kilo', sourceCapability: 'commands', method: 'omit', status: MigrationStatus.UNSUPPORTED, confidence: 'high' },
  { id: 'claude-code-mcpServers-kilo', sourceCapability: 'mcpServers', targetCapability: 'mcpServers', method: 'rewrite', status: MigrationStatus.ADAPTED, confidence: 'medium' },
  { id: 'claude-code-agents-kilo', sourceCapability: 'agents', method: 'omit', status: MigrationStatus.UNSUPPORTED, confidence: 'high' },
  { id: 'claude-code-permissions-kilo', sourceCapability: 'permissions', method: 'omit', status: MigrationStatus.UNSUPPORTED, confidence: 'high' },
  { id: 'claude-code-hooks-kilo', sourceCapability: 'hooks', method: 'omit', status: MigrationStatus.UNSUPPORTED, confidence: 'high' },
  { id: 'claude-code-opaque-kilo', sourceCapability: 'opaque', targetCapability: 'opaque', method: 'rewrite', status: MigrationStatus.ADAPTED, confidence: 'medium' },
];

export function getRulesForMigration(sourceAgent: string, targetAgent: string): CompatibilityRule[] {
  return RULES.filter(r => r.id.startsWith(`${sourceAgent}-`) && r.id.endsWith(`-${targetAgent}`));
}

export function getRule(sourceAgent: string, targetAgent: string, capability: string): CompatibilityRule | undefined {
  return RULES.find(r => r.id === `${sourceAgent}-${capability}-${targetAgent}`);
}
