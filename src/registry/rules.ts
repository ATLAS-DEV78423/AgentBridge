import { MigrationStatus } from '../core/model/types.js';

export type CompatibilityRule = {
  id: string;
  sourceCapability: string;
  targetCapability?: string;
  method: 'copy' | 'rewrite' | 'generate' | 'omit';
  status: MigrationStatus;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
  warnings: string[];
};

const RULES: Record<string, CompatibilityRule[]> = {
  'claude-code->opencode': [
    { id: 'instruction-direct', sourceCapability: 'instruction', targetCapability: 'instruction', method: 'copy', status: MigrationStatus.DIRECT, confidence: 'high', reasons: ['Both support markdown instructions'], warnings: [] },
    { id: 'skill-adapted', sourceCapability: 'skill', targetCapability: 'command', method: 'rewrite', status: MigrationStatus.ADAPTED, confidence: 'medium', reasons: ['Skills map to commands'], warnings: ['Format may need adjustment'] },
    { id: 'mcp-direct', sourceCapability: 'mcp', targetCapability: 'mcp', method: 'copy', status: MigrationStatus.DIRECT, confidence: 'high', reasons: ['MCP is portable'], warnings: [] },
    { id: 'hook-unsupported', sourceCapability: 'hook', method: 'omit', status: MigrationStatus.UNSUPPORTED, confidence: 'high', reasons: ['No hook equivalent'], warnings: ['Hooks will not migrate'] }
  ],
  'claude-code->kilo': [
    { id: 'instruction-direct-kilo', sourceCapability: 'instruction', targetCapability: 'instruction', method: 'copy', status: MigrationStatus.DIRECT, confidence: 'high', reasons: ['Both support markdown'], warnings: [] },
    { id: 'skill-direct-kilo', sourceCapability: 'skill', targetCapability: 'skill', method: 'copy', status: MigrationStatus.DIRECT, confidence: 'high', reasons: ['Kilo supports Claude skills'], warnings: [] }
  ]
};

export function getRules(source: string, target: string): CompatibilityRule[] {
  return RULES[`${source}->${target}`] || [];
}
