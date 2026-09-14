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

  it('maps model and drops claude-only permissions into .kilo/config.json', () => {
    const files = writeKiloFiles([
      opaque('.claude/settings.json', JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        permissions: { allow: ['read', 'write'] },
      })),
    ]);
    expect(files.length).toBe(1);
    expect(files[0].path).toBe('.kilo/config.json');
    expect(JSON.parse(files[0].content)).toEqual({ model: 'claude-sonnet-4-20250514' });
  });

  it('keeps maxTokens when migrating from kilo-shaped opaque input', () => {
    const files = writeKiloFiles([
      opaque('.kilo/config.json', JSON.stringify({ model: 'm', maxTokens: 4096 })),
    ]);
    expect(JSON.parse(files[0].content)).toEqual({ model: 'm', maxTokens: 4096 });
  });

  it('writes nothing when only mcpServers are present (no kilo mcp section)', () => {
    expect(writeKiloFiles([mcp('fs', { command: 'npx' })])).toEqual([]);
  });

  it('returns nothing for empty resources', () => {
    expect(writeKiloFiles([])).toEqual([]);
  });
});
