import { describe, it, expect } from 'vitest';
import { getWriter, registerWriter } from '../../../src/core/writers.js';
// Registrations happen as side effects of the adapter registry (same as the CLI entry).
// Bare side-effect import: a named-but-unused import would be elided by the TS transform.
import '../../../src/adapters/registry.js';

describe('writer registry', () => {
  it('resolves registered targets', () => {
    expect(getWriter('opencode')).toBeDefined();
    expect(getWriter('claude-code')).toBeDefined();
  });

  it('returns undefined for unknown targets', () => {
    expect(getWriter('future-agent')).toBeUndefined();
    expect(getWriter('')).toBeUndefined();
  });

  it('resolves targets registered after module load', () => {
    registerWriter('test-only-target', () => []);
    expect(getWriter('test-only-target')).toBeDefined();
  });
});
