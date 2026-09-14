import { describe, it, expect } from 'vitest';
import { hasWriter, registerWriter } from '../../../src/core/writers.js';
// Registrations happen as side effects of the adapter registry (same as the CLI entry).
// Bare side-effect import: a named-but-unused import would be elided by the TS transform.
import '../../../src/adapters/registry.js';

describe('writer registry', () => {
  it('hasWriter is true for registered targets', () => {
    expect(hasWriter('opencode')).toBe(true);
    expect(hasWriter('claude-code')).toBe(true);
  });

  it('hasWriter is false for unknown targets', () => {
    expect(hasWriter('future-agent')).toBe(false);
    expect(hasWriter('')).toBe(false);
  });

  it('hasWriter sees targets registered after module load', () => {
    registerWriter('test-only-target', () => []);
    expect(hasWriter('test-only-target')).toBe(true);
  });
});
