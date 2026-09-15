import { describe, it, expect } from 'vitest';
import { getRulesForMigration, AGENT_IDS } from '../../../src/registry/rules.js';

describe('Compatibility Rules', () => {
  it('returns rules for every ordered pair of known agents', () => {
    expect(AGENT_IDS).toHaveLength(12);
    for (const src of AGENT_IDS) {
      for (const dst of AGENT_IDS) {
        if (src === dst) continue;
        expect(getRulesForMigration(src, dst).length).toBe(3);
      }
    }
  });

  it('returns empty for unknown target', () => {
    expect(getRulesForMigration('claude-code', 'unknown')).toEqual([]);
  });

  it('instructions copy directly and mcp servers adapt for every pair', () => {
    for (const src of AGENT_IDS) {
      for (const dst of AGENT_IDS) {
        if (src === dst) continue;
        const rules = getRulesForMigration(src, dst);
        expect(rules.find(r => r.sourceCapability === 'instructions')?.status).toBe('DIRECT');
        expect(rules.find(r => r.sourceCapability === 'mcpServers')?.status).toBe('ADAPTED');
      }
    }
  });

  it('marks opaque ADAPTED only for targets that map opaque fields', () => {
    // Targets with a real model field: claude-code, opencode, kilo, codex.
    for (const target of ['claude-code', 'opencode', 'kilo', 'codex']) {
      for (const source of AGENT_IDS) {
        if (source === target) continue;
        expect(getRulesForMigration(source, target).find(r => r.sourceCapability === 'opaque')?.status).toBe('ADAPTED');
      }
    }
    // Cursor/Gemini + all factory agents have no confirmed model field.
    for (const target of ['cursor', 'gemini', 'copilot', 'crush', 'grok', 'omp', 'muse-code', 'pi']) {
      for (const source of AGENT_IDS) {
        if (source === target) continue;
        expect(getRulesForMigration(source, target).find(r => r.sourceCapability === 'opaque')?.status).toBe('UNSUPPORTED');
      }
    }
  });
});
