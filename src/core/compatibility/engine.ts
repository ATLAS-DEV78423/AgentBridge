import { MigrationStatus } from '../model/types.js';

export type CompatibilityRule = {
  id: string;
  sourceCapability: string;
  targetCapability?: string;
  method: 'copy' | 'rewrite' | 'generate' | 'omit';
  status: MigrationStatus;
  confidence: 'high' | 'medium' | 'low';
};

export type CompatibilityResult = {
  resourceId?: string;
  sourceCapability: string;
  targetCapability?: string;
  status: MigrationStatus;
  method: string;
  confidence: string;
  reasons: string[];
  warnings: string[];
};

export function evaluateCompatibility(
  sourceCapability: string,
  targetAgent: string,
  rules: CompatibilityRule[]
): CompatibilityResult {
  // Find matching rule
  const rule = rules.find(r => r.sourceCapability === sourceCapability);
  
  if (!rule) {
    return {
      sourceCapability,
      status: MigrationStatus.UNSUPPORTED,
      method: 'omit',
      confidence: 'high',
      reasons: ['No compatibility rule found'],
      warnings: []
    };
  }

  return {
    sourceCapability,
    targetCapability: rule.targetCapability,
    status: rule.status,
    method: rule.method,
    confidence: rule.confidence,
    reasons: [`Matched rule: ${rule.id}`],
    warnings: []
  };
}
