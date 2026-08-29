import { describe, it, expect } from 'vitest';
import { evaluateCompatibility, CompatibilityRule } from '../../../src/core/compatibility/engine.js';
import { MigrationStatus } from '../../../src/core/model/types.js';

describe('Compatibility Engine', () => {
  const rules: CompatibilityRule[] = [
    {
      id: 'claude-skill-to-opencode',
      sourceCapability: 'skill',
      targetCapability: 'skill',
      method: 'copy',
      status: MigrationStatus.DIRECT,
      confidence: 'high'
    },
    {
      id: 'claude-hook-to-opencode',
      sourceCapability: 'hook',
      targetCapability: undefined,
      method: 'omit',
      status: MigrationStatus.UNSUPPORTED,
      confidence: 'high'
    }
  ];

  it('evaluates direct mapping', () => {
    const result = evaluateCompatibility('skill', 'opencode', rules);
    expect(result.status).toBe(MigrationStatus.DIRECT);
    expect(result.method).toBe('copy');
    expect(result.confidence).toBe('high');
  });

  it('evaluates unsupported mapping', () => {
    const result = evaluateCompatibility('hook', 'opencode', rules);
    expect(result.status).toBe(MigrationStatus.UNSUPPORTED);
    expect(result.method).toBe('omit');
  });

  it('returns unknown when no rule matches', () => {
    const result = evaluateCompatibility('permission', 'opencode', rules);
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
      compatibility: evaluateCompatibility(r.type, 'opencode', rules)
    }));
    expect(results[0].compatibility.status).toBe(MigrationStatus.DIRECT);
    expect(results[1].compatibility.status).toBe(MigrationStatus.UNSUPPORTED);
  });
});

import { evaluateResources } from '../../../src/core/compatibility/engine.js';
import { NormalizedResource } from '../../../src/core/normalize/normalizer.js';

describe('Enhanced Compatibility Engine', () => {
  it('evaluates multiple resources', () => {
    const resources: NormalizedResource[] = [
      { id: '1', type: 'instruction', name: 'AGENTS.md', capability: 'instruction',
        provenance: { sourceAgent: 'claude-code', sourcePath: 'AGENTS.md', scope: 'project', originalHash: 'abc' } },
      { id: '2', type: 'hook', name: 'pre-commit', capability: 'hook',
        provenance: { sourceAgent: 'claude-code', sourcePath: '.claude/hooks/pre-commit', scope: 'project', originalHash: 'def' } }
    ];
    const results = evaluateResources(resources, 'claude-code', 'opencode');
    expect(results.length).toBe(2);
    expect(results[0].status).toBe('DIRECT');
    expect(results[1].status).toBe('UNSUPPORTED');
  });
});
