import { describe, it, expect } from 'vitest';
import { writeKiloFiles } from '../../../src/adapters/kilo/writer.js';
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

describe('writeKiloFiles', () => {
  it('passes instructions through unchanged', () => {
    expect(writeKiloFiles([inst('AGENTS.md', '# Rules')]))
      .toEqual([{ path: 'AGENTS.md', content: '# Rules', action: 'create' }]);
  });

  it('writes CLAUDE.md at its own path', () => {
    expect(writeKiloFiles([inst('CLAUDE.md', '# Claude')])[0].path).toBe('CLAUDE.md');
  });

  it('normalizes GEMINI.md instructions to AGENTS.md', () => {
    expect(writeKiloFiles([inst('GEMINI.md', '# Rules')])[0].path).toBe('AGENTS.md');
  });

  it('maps claude settings into .kilo/kilo.jsonc, dropping claude-only fields', () => {
    const files = writeKiloFiles([
      opaque('.claude/settings.json', JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        permissions: { allow: ['read', 'write'] },
      })),
    ]);
    expect(files.length).toBe(1);
    expect(files[0].path).toBe('.kilo/kilo.jsonc');
    expect(JSON.parse(files[0].content)).toEqual({ model: 'claude-sonnet-4-20250514' });
  });

  it('translates claude stdio mcpServers to kilo local format (array command, environment)', () => {
    const files = writeKiloFiles([
      mcp('fs', { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '.'], env: { FOO: '1' } }),
    ]);
    expect(files).toEqual([{
      path: '.kilo/kilo.jsonc',
      content: JSON.stringify({
        mcp: {
          fs: { type: 'local', command: ['npx', '-y', '@modelcontextprotocol/server-filesystem', '.'], environment: { FOO: '1' } },
        },
      }, null, 2),
      action: 'create',
    }]);
  });

  it('normalizes opencode-style explicit stdio type to kilo local', () => {
    const files = writeKiloFiles([
      mcp('gh', { type: 'stdio', command: 'github-mcp' }),
    ]);
    const config = JSON.parse(files[0].content);
    expect(config.mcp.gh).toEqual({ type: 'local', command: ['github-mcp'] });
  });

  it('translates remote url servers to kilo remote format', () => {
    const files = writeKiloFiles([
      mcp('ctx7', { url: 'https://mcp.context7.com/mcp', headers: { Authorization: 'Bearer x' } }),
    ]);
    const config = JSON.parse(files[0].content);
    expect(config.mcp.ctx7).toEqual({ type: 'remote', url: 'https://mcp.context7.com/mcp', headers: { Authorization: 'Bearer x' } });
  });

  it('merges mcp servers with settings from opaque config', () => {
    const files = writeKiloFiles([
      mcp('fs', { command: 'npx', args: [] }),
      opaque('.claude/settings.json', JSON.stringify({ model: 'm' })),
    ]);
    const config = JSON.parse(files[0].content);
    expect(config.model).toBe('m');
    expect(config.mcp.fs).toEqual({ type: 'local', command: ['npx'] });
  });

  it('returns nothing for empty resources', () => {
    expect(writeKiloFiles([])).toEqual([]);
  });
});
