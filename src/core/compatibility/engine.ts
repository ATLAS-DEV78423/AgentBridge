import { MigrationStatus } from '../model/types.js';

export type CompatibilityRule = {
  id: string;
  sourceCapability: string;
  method: 'copy' | 'rewrite' | 'omit';
  status: MigrationStatus;
};

export type CompatibilityResult = {
  sourceCapability: string;
  status: MigrationStatus;
  method: string;
};

export function evaluateCompatibility(
  sourceCapability: string,
  rules: CompatibilityRule[]
): CompatibilityResult {
  const rule = rules.find(r => r.sourceCapability === sourceCapability);

  if (!rule) {
    return {
      sourceCapability,
      status: MigrationStatus.UNSUPPORTED,
      method: 'omit',
    };
  }

  return {
    sourceCapability,
    status: rule.status,
    method: rule.method,
  };
}
