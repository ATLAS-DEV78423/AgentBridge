import { describe, it, expect } from 'vitest';
import { writeClaudeFiles } from '../../../src/adapters/claude-code/writer.js';
import { ResourceBase } from '../../../src/core/model/types.js';

const inst = (name: string, content: string): ResourceBase => ({
  id: `instructions-${name}`, type: 'instructions', name, content,
});
const mcp = (name: string, config: object): ResourceBase => ({
  id: `mcpServers-${name}`, type: 'mcpServers', name, content: JSON.stringify(config),
});
const opaque = (name: string, content: string): ResourceBase => ({
  id: `opaque-${name}`, type: 'opaque', name, content,
});

describe('writeClaudeFiles', () => {
  it('passes instructions through unchanged', () => {
    const files = writeClaudeFiles([inst('AGENTS.md', '# Rules')]);
    expect(files).toEqual([{ path: 'AGENTS.md', content: '# Rules', action: 'create' }]);
  });

  it('normalizes foreign instruction files (GEMINI.md) to AGENTS.md', () => {
    const files = writeClaudeFiles([inst('GEMINI.md', '# Rules')]);
    expect(files[0].path).toBe('AGENTS.md');
  });

  it('writes CLAUDE.md at its own path', () => {
    const files = writeClaudeFiles([inst('CLAUDE.md', '# Claude rules')]);
    expect(files[0].path).toBe('CLAUDE.md');
  });

  it('builds .claude/settings.json from OpenCode config with mcpServers translated', () => {
    const files = writeClaudeFiles([
      opaque('opencode.jsonc', JSON.stringify({
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        mcpServers: {
          fs: { type: 'stdio', command: 'npx', args: ['-y', 'mcp-fs'], env: { FOO: '1' } },
        },
      })),
    ]);
    expect(files.length).toBe(1);
    expect(files[0].path).toBe('.claude/settings.json');
    const settings = JSON.parse(files[0].content);
    expect(settings.model).toBe('claude-sonnet-4-20250514');
    expect(settings.provider).toBeUndefined();
    expect(settings.mcpServers.fs).toEqual({ command: 'npx', args: ['-y', 'mcp-fs'], env: { FOO: '1' } });
  });

  it('extracts only model from Kilo config', () => {
    const files = writeClaudeFiles([
      opaque('.kilo/config.json', JSON.stringify({
        model: 'claude-sonnet-4-20250514', maxTokens: 8192, systemPrompt: 'You are helpful.',
      })),
    ]);
    const settings = JSON.parse(files[0].content);
    expect(settings).toEqual({ model: 'claude-sonnet-4-20250514' });
  });

  it('adds dedicated mcpServers resources into settings (drops OpenCode type field)', () => {
    const files = writeClaudeFiles([
      mcp('fs', { type: 'stdio', command: 'npx', args: [] }),
      mcp('gh', { command: 'github-mcp' }),
    ]);
    const settings = JSON.parse(files[0].content);
    expect(settings.mcpServers.fs).toEqual({ command: 'npx', args: [] });
    expect(settings.mcpServers.gh).toEqual({ command: 'github-mcp' });
  });

  it('returns nothing for empty resources', () => {
    expect(writeClaudeFiles([])).toEqual([]);
  });
});
