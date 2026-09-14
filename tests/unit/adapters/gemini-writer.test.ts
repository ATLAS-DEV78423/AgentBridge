import { describe, it, expect } from 'vitest';
import { writeGeminiFiles } from '../../../src/adapters/gemini/writer.js';
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

describe('writeGeminiFiles', () => {
  it('writes instructions as GEMINI.md (the file Gemini CLI reads)', () => {
    const files = writeGeminiFiles([inst('AGENTS.md', '# Rules')]);
    expect(files).toEqual([{ path: 'GEMINI.md', content: '# Rules', action: 'create' }]);
  });

  it('passes GEMINI.md through unchanged', () => {
    const files = writeGeminiFiles([inst('GEMINI.md', '# Gemini rules')]);
    expect(files[0].path).toBe('GEMINI.md');
  });

  it('translates claude stdio server as-is into .gemini/settings.json (no type field)', () => {
    const files = writeGeminiFiles([
      mcp('fs', { command: 'npx', args: ['-y', 'mcp-fs'], env: { FOO: '1' } }),
    ]);
    expect(files).toEqual([{
      path: '.gemini/settings.json',
      content: JSON.stringify({
        mcpServers: { fs: { command: 'npx', args: ['-y', 'mcp-fs'], env: { FOO: '1' } } },
      }, null, 2),
      action: 'create',
    }]);
  });

  it('strips explicit stdio type (gemini infers transport from shape)', () => {
    const files = writeGeminiFiles([
      mcp('gh', { type: 'stdio', command: 'github-mcp' }),
    ]);
    const settings = JSON.parse(files[0].content);
    expect(settings.mcpServers.gh).toEqual({ command: 'github-mcp' });
  });

  it('keeps remote url servers intact (url is a gemini transport key)', () => {
    const files = writeGeminiFiles([
      mcp('ctx7', { type: 'stdio', url: 'https://mcp.context7.com/mcp', headers: { Authorization: 'Bearer x' } }),
    ]);
    const settings = JSON.parse(files[0].content);
    expect(settings.mcpServers.ctx7).toEqual({ url: 'https://mcp.context7.com/mcp', headers: { Authorization: 'Bearer x' } });
  });

  it('ignores opaque configs (no mappable settings fields confirmed)', () => {
    expect(writeGeminiFiles([
      opaque('.claude/settings.json', JSON.stringify({ model: 'm' })),
      opaque('.kilo/kilo.jsonc', JSON.stringify({ model: 'm' })),
    ])).toEqual([]);
  });

  it('returns nothing for empty resources', () => {
    expect(writeGeminiFiles([])).toEqual([]);
  });
});
