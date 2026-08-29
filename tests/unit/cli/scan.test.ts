import { describe, it, expect } from 'vitest';
import { executeScan } from '../../../src/cli/commands/scan.js';

describe('CLI scan command', () => {
  it('executeScan is a function', () => {
    expect(typeof executeScan).toBe('function');
  });

  it('scan command outputs inventory', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await executeScan('tests/fixtures/claude-basic');
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('Instructions');
    consoleSpy.mockRestore();
  });
});
