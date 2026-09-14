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

  const AGENTS = ['claude-code', 'opencode', 'kilo', 'cursor'];

  it('marks opaque ADAPTED only for targets that map opaque fields', () => {
    expect(getRulesForMigration('claude-code', 'opencode').find(r => r.sourceCapability === 'opaque')?.status).toBe('ADAPTED');
    expect(getRulesForMigration('opencode', 'claude-code').find(r => r.sourceCapability === 'opaque')?.status).toBe('ADAPTED');
    expect(getRulesForMigration('claude-code', 'kilo').find(r => r.sourceCapability === 'opaque')?.status).toBe('UNSUPPORTED');
    expect(getRulesForMigration('opencode', 'kilo').find(r => r.sourceCapability === 'opaque')?.status).toBe('UNSUPPORTED');
    expect(getRulesForMigration('claude-code', 'cursor').find(r => r.sourceCapability === 'opaque')?.status).toBe('UNSUPPORTED');
    expect(getRulesForMigration('kilo', 'cursor').find(r => r.sourceCapability === 'opaque')?.status).toBe('UNSUPPORTED');
  });

  it('returns rules for claude-code-to-cursor with mcp translation', () => {
    const rules = getRulesForMigration('claude-code', 'cursor');
    expect(rules.length).toBe(3);
    expect(rules.find(r => r.sourceCapability === 'mcpServers')?.status).toBe('ADAPTED');
  });

  it('returns rules for cursor-to-claude-code (reverse)', () => {
    const rules = getRulesForMigration('cursor', 'claude-code');
    expect(rules.length).toBe(3);
    expect(rules.some(r => r.sourceCapability === 'instructions')).toBe(true);
  });

  it('returns rules for opencode-to-claude-code', () => {
    const rules = getRulesForMigration('opencode', 'claude-code');
    expect(rules.length).toBe(3);
    expect(rules.some(r => r.sourceCapability === 'instructions')).toBe(true);
    expect(rules.some(r => r.sourceCapability === 'mcpServers')).toBe(true);
  });

  it('returns rules for kilo-to-claude-code', () => {
    const rules = getRulesForMigration('kilo', 'claude-code');
    expect(rules.length).toBe(3);
  });

  it('returns rules for every ordered pair of known agents', () => {
    for (const src of AGENTS) {
      for (const dst of AGENTS) {
        if (src === dst) continue;
        expect(getRulesForMigration(src, dst).length).toBe(3);
      }
    }
  });

  it('rule has required fields', () => {
    const rules = getRulesForMigration('claude-code', 'opencode');
    const rule = rules[0];
    expect(rule).toHaveProperty('id');
    expect(rule).toHaveProperty('sourceCapability');
    expect(rule).toHaveProperty('status');
    expect(rule).toHaveProperty('method');
    expect(rule).toHaveProperty('method');
  });
});
