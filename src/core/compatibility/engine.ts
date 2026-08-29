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

import { getRules } from '../../registry/rules.js';
import { NormalizedResource } from '../normalize/normalizer.js';

export function evaluateResources(
  resources: NormalizedResource[],
  source: string,
  target: string
): CompatibilityResult[] {
  const rules = getRules(source, target);
  return resources.map(r => {
    const rule = rules.find(rule => rule.sourceCapability === r.capability);
    return {
      resourceId: r.id,
      sourceCapability: r.capability,
      targetCapability: rule?.targetCapability,
      status: rule?.status || MigrationStatus.UNSUPPORTED,
      method: rule?.method || 'omit',
      confidence: rule?.confidence || 'high',
      reasons: rule?.reasons || ['No rule found'],
      warnings: rule?.warnings || []
    };
  });
}
