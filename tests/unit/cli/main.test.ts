import { describe, it, expect } from 'vitest';
import { showHelp, HELP_TEXT } from '../../../src/cli/commands/help.js';

describe('CLI', () => {
  it('has help text with required sections', () => {
    expect(HELP_TEXT).toContain('Usage:');
    expect(HELP_TEXT).toContain('Commands:');
    expect(HELP_TEXT).toContain('scan');
    expect(HELP_TEXT).toContain('plan');
    expect(HELP_TEXT).toContain('diff');
    expect(HELP_TEXT).toContain('doctor');
    expect(HELP_TEXT).toContain('export');
    expect(HELP_TEXT).toContain('import');
    expect(HELP_TEXT).toContain('--json');
  });

  it('showHelp outputs help text', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    showHelp();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
