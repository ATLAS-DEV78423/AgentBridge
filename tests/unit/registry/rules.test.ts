import { describe, it, expect } from 'vitest';
import { getRulesForMigration } from '../../../src/registry/rules.js';

describe('Compatibility Rules', () => {
  it('returns rules for claude-to-opencode', () => {
    const rules = getRulesForMigration('claude-code', 'opencode');
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.some(r => r.sourceCapability === 'instructions')).toBe(true);
  });

  it('returns empty for unknown target', () => {
    const rules = getRulesForMigration('claude-code', 'unknown');
    expect(rules).toEqual([]);
  });

  it('rule has required fields', () => {
    const rules = getRulesForMigration('claude-code', 'opencode');
    const rule = rules[0];
    expect(rule).toHaveProperty('id');
    expect(rule).toHaveProperty('sourceCapability');
    expect(rule).toHaveProperty('status');
    expect(rule).toHaveProperty('method');
    expect(rule).toHaveProperty('confidence');
  });
});
