import { describe, it, expect } from 'vitest';
import { getCapabilities, listAgents, supportsCapability } from '../../../src/registry/capabilities.js';
import { getRulesForMigration, getRule } from '../../../src/registry/rules.js';

describe('capabilities', () => {
  it('returns capabilities for known agent', () => {
    const caps = getCapabilities('claude-code');
    expect(caps).toBeDefined();
    expect(caps!.capabilities).toContain('instructions');
  });

  it('returns undefined for unknown agent', () => {
    expect(getCapabilities('unknown')).toBeUndefined();
  });

  it('lists all agents', () => {
    const agents = listAgents();
    expect(agents.length).toBe(3);
  });

  it('checks capability support', () => {
    expect(supportsCapability('claude-code', 'instructions')).toBe(true);
    expect(supportsCapability('opencode', 'skills')).toBe(false);
  });
});

describe('rules', () => {
  it('returns rules for migration path', () => {
    const rules = getRulesForMigration('claude-code', 'opencode');
    expect(rules.length).toBe(8);
  });

  it('finds specific rule', () => {
    const rule = getRule('claude-code', 'opencode', 'instructions');
    expect(rule).toBeDefined();
    expect(rule!.method).toBe('copy');
  });

  it('returns empty for nonexistent path', () => {
    const rules = getRulesForMigration('opencode', 'claude-code');
    expect(rules.length).toBe(0);
  });
});
