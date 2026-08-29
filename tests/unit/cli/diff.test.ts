import { describe, it, expect } from 'vitest';
import { executeDiff } from '../../../src/cli/commands/diff.js';

describe('CLI diff command', () => {
  it('executeDiff is a function', () => {
    expect(typeof executeDiff).toBe('function');
  });

  it('diff outputs migration preview', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await executeDiff('claude-code', 'opencode', 'tests/fixtures/claude-basic');
    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('Migration diff');
    expect(output).toContain('+');
    expect(output).toContain('AGENTS.md');
    consoleSpy.mockRestore();
  });
});
