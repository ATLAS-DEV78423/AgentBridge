import { describe, it, expect } from 'vitest';
import { evaluateCompatibility, CompatibilityRule } from '../../../src/core/compatibility/engine.js';
import { MigrationStatus } from '../../../src/core/model/types.js';

describe('Compatibility Engine', () => {
  const rules: CompatibilityRule[] = [
    {
      id: 'claude-skill-to-opencode',
      sourceCapability: 'skill',
      method: 'copy',
      status: MigrationStatus.DIRECT,
    },
    {
      id: 'claude-hook-to-opencode',
      sourceCapability: 'hook',
      method: 'omit',
      status: MigrationStatus.UNSUPPORTED,
    }
  ];

  it('evaluates direct mapping', () => {
    const result = evaluateCompatibility('skill', rules);
    expect(result.status).toBe(MigrationStatus.DIRECT);
    expect(result.method).toBe('copy');
  });

  it('evaluates unsupported mapping', () => {
    const result = evaluateCompatibility('hook', rules);
    expect(result.status).toBe(MigrationStatus.UNSUPPORTED);
    expect(result.method).toBe('omit');
  });

  it('returns unknown when no rule matches', () => {
    const result = evaluateCompatibility('permission', rules);
    expect(result.status).toBe(MigrationStatus.UNSUPPORTED);
    expect(result.method).toBe('omit');
  });

  it('returns per-resource results', () => {
    const resources = [
      { id: '1', type: 'skill', name: 'test-skill' },
      { id: '2', type: 'hook', name: 'test-hook' }
    ];
    const results = resources.map(r => ({
      ...r,
      compatibility: evaluateCompatibility(r.type, rules)
    }));
    expect(results[0].compatibility.status).toBe(MigrationStatus.DIRECT);
    expect(results[1].compatibility.status).toBe(MigrationStatus.UNSUPPORTED);
  });
});
