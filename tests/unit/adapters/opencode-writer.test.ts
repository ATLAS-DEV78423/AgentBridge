import { describe, it, expect } from 'vitest';
import { writeOpenCodeFiles } from '../../../src/adapters/opencode/writer.js';
import { ResourceBase } from '../../../src/core/model/types.js';

const inst = (name: string, content: string): ResourceBase => ({
  id: `instructions-${name}`, type: 'instructions', name, content,
});
const opaque = (name: string, content: string): ResourceBase => ({
  id: `opaque-${name}`, type: 'opaque', name, content,
});
const mcp = (name: string, server: Record<string, unknown>): ResourceBase => ({
  id: `mcp-${name}`, type: 'mcpServers', name, content: JSON.stringify(server),
});

describe('writeOpenCodeFiles (documented dialect)', () => {
  it('passes instructions through unchanged', () => {
    expect(writeOpenCodeFiles([inst('AGENTS.md', '# Rules')]))
      .toEqual([{ path: 'AGENTS.md', content: '# Rules', action: 'create' }]);
  });

  it('normalizes GEMINI.md instructions to AGENTS.md', () => {
    const files = writeOpenCodeFiles([inst('GEMINI.md', '# Rules')]);
    expect(files[0].path).toBe('AGENTS.md');
  });

  it('emits the documented mcp key with local command arrays and environment', () => {
    const files = writeOpenCodeFiles([
      opaque('.claude/settings.json', JSON.stringify({ model: 'm' })),
      mcp('fs', { command: 'npx', args: ['-y', 'fs'], env: { K: 'v' } }),
    ]);
    const [config] = files;
    expect(config.path).toBe('opencode.json');
    const doc = JSON.parse(config.content);
    expect(doc.mcp.fs).toEqual({
      type: 'local',
      command: ['npx', '-y', 'fs'],
      environment: { K: 'v' },
    });
  });

  it('emits remote servers as type remote with url, not the invalid stdio shape', () => {
    const files = writeOpenCodeFiles([
      mcp('web', { url: 'https://example.invalid/mcp', headers: { Authorization: 'Bearer t' } }),
    ]);
    const doc = JSON.parse(files[0].content);
    expect(doc.mcp.web).toEqual({
      type: 'remote',
      url: 'https://example.invalid/mcp',
      headers: { Authorization: 'Bearer t' },
    });
  });

  it('still maps a legacy mcpServers-shaped opaque config (tolerance)', () => {
    const files = writeOpenCodeFiles([
      opaque('.claude/settings.json', JSON.stringify({
        model: 'm',
        mcpServers: { fs: { command: 'npx', args: ['-y', 'fs'], env: { K: 'v' } } },
      })),
    ]);
    const doc = JSON.parse(files[0].content);
    expect(doc.model).toBe('m');
    expect(doc.mcp.fs).toEqual({ type: 'local', command: ['npx', '-y', 'fs'], environment: { K: 'v' } });
  });

  it('extracts model from kilo config (.kilo/kilo.jsonc)', () => {
    const files = writeOpenCodeFiles([
      opaque('.kilo/kilo.jsonc', JSON.stringify({ model: 'm', maxTokens: 4096 })),
    ]);
    expect(JSON.parse(files[0].content)).toEqual({ model: 'm' });
  });

  it('extracts model from legacy kilo config (.kilo/config.json)', () => {
    const files = writeOpenCodeFiles([
      opaque('.kilo/config.json', JSON.stringify({ model: 'm' })),
    ]);
    expect(JSON.parse(files[0].content)).toEqual({ model: 'm' });
  });

  it('returns nothing for empty resources', () => {
    expect(writeOpenCodeFiles([])).toEqual([]);
  });
});
