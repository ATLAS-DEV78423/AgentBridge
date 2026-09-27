import { describe, it, expect } from 'vitest';
import { adapters } from '../../../src/adapters/registry.js';
import { getWriter, registerWriter } from '../../../src/core/writers.js';

const EXPECTED = [
  'claude-code', 'opencode', 'kilo', 'cursor', 'gemini', 'codex',
  'copilot', 'crush', 'grok', 'omp', 'muse-code', 'pi', 'cline', 'windsurf',
];

describe('adapter/writer registration invariant', () => {
  it('registers exactly one adapter AND one writer per agent, no strays', () => {
    expect(Object.keys(adapters).sort()).toEqual([...EXPECTED].sort());
    for (const id of EXPECTED) {
      expect(adapters[id], `adapter for ${id}`).toBeDefined();
      expect(getWriter(id), `writer for ${id}`).toBeDefined();
    }
  });

  it('rejects duplicate writer registration (the forgotten-overwrite bug class)', () => {
    expect(() => registerWriter('claude-code', () => [])).toThrow(/already registered/);
  });
});
