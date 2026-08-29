import { describe, it, expect } from 'vitest';
import { getCapabilities } from '../../../src/registry/capabilities.js';

describe('Capability Registry', () => {
  it('returns capabilities for claude-code', () => {
    const caps = getCapabilities('claude-code');
    expect(caps.supported).toContain('instruction');
    expect(caps.supported).toContain('skill');
    expect(caps.supported).toContain('mcp');
  });

  it('returns capabilities for opencode', () => {
    const caps = getCapabilities('opencode');
    expect(caps.supported).toContain('instruction');
    expect(caps.supported).toContain('permission');
  });

  it('returns capabilities for kilo', () => {
    const caps = getCapabilities('kilo');
    expect(caps.supported).toContain('instruction');
    expect(caps.supported).toContain('skill');
  });

  it('returns empty for unknown agent', () => {
    const caps = getCapabilities('unknown');
    expect(caps.supported).toEqual([]);
  });
});
