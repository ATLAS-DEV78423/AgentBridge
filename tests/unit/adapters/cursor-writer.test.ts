import { describe, it, expect } from 'vitest';
import { writeCursorFiles } from '../../../src/adapters/cursor/writer.js';
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

describe('writeCursorFiles', () => {
  it('passes instructions through unchanged', () => {
    expect(writeCursorFiles([inst('AGENTS.md', '# Rules')]))
      .toEqual([{ path: 'AGENTS.md', content: '# Rules', action: 'create' }]);
  });

  it('translates claude stdio server to cursor format (adds type: stdio)', () => {
    const files = writeCursorFiles([
      mcp('fs', { command: 'npx', args: ['-y', 'mcp-fs'], env: { FOO: '1' } }),
    ]);
    expect(files).toEqual([{
      path: '.cursor/mcp.json',
      content: JSON.stringify({
        mcpServers: { fs: { type: 'stdio', command: 'npx', args: ['-y', 'mcp-fs'], env: { FOO: '1' } } },
      }, null, 2),
      action: 'create',
    }]);
  });

  it('keeps explicit stdio type from opencode sources', () => {
    const files = writeCursorFiles([
      mcp('gh', { type: 'stdio', command: 'github-mcp' }),
    ]);
    const config = JSON.parse(files[0].content);
    expect(config.mcpServers.gh).toEqual({ type: 'stdio', command: 'github-mcp' });
  });

  it('passes remote url servers through (cursor remote shape matches)', () => {
    const files = writeCursorFiles([
      mcp('ctx7', { url: 'https://mcp.context7.com/mcp', headers: { Authorization: 'Bearer x' } }),
    ]);
    const config = JSON.parse(files[0].content);
    expect(config.mcpServers.ctx7).toEqual({ url: 'https://mcp.context7.com/mcp', headers: { Authorization: 'Bearer x' } });
  });

  it('ignores opaque configs (claude settings, kilo config carry no cursor-mappable fields)', () => {
    expect(writeCursorFiles([
      opaque('.claude/settings.json', JSON.stringify({ model: 'm' })),
      opaque('.kilo/kilo.jsonc', JSON.stringify({ model: 'm' })),
    ])).toEqual([]);
  });

  it('returns nothing for empty resources', () => {
    expect(writeCursorFiles([])).toEqual([]);
  });
});
