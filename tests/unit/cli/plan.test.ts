import { describe, it, expect } from 'vitest';
import { executePlan } from '../../../src/cli/commands/plan.js';

describe('CLI plan command', () => {
  it('executePlan is a function', () => {
    expect(typeof executePlan).toBe('function');
  });

  it('plan outputs compatibility report', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await executePlan('claude-code', 'opencode', 'tests/fixtures/claude-basic');
    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('Migration plan');
    expect(output).toContain('DIRECT');
    consoleSpy.mockRestore();
  });
});
