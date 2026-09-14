import { describe, it, expect } from 'vitest';
import { writeOpenCodeFiles } from '../../../src/adapters/opencode/writer.js';
import { ResourceBase } from '../../../src/core/model/types.js';

const inst = (name: string, content: string): ResourceBase => ({
  id: `instructions-${name}`, type: 'instructions', name, content,
});
const opaque = (name: string, content: string): ResourceBase => ({
  id: `opaque-${name}`, type: 'opaque', name, content,
});

describe('writeOpenCodeFiles', () => {
  it('passes instructions through unchanged', () => {
    expect(writeOpenCodeFiles([inst('AGENTS.md', '# Rules')]))
      .toEqual([{ path: 'AGENTS.md', content: '# Rules', action: 'create' }]);
  });

  it('normalizes GEMINI.md instructions to AGENTS.md', () => {
    const files = writeOpenCodeFiles([inst('GEMINI.md', '# Rules')]);
    expect(files[0].path).toBe('AGENTS.md');
  });

  it('builds opencode.json from claude settings', () => {
    const files = writeOpenCodeFiles([
      opaque('.claude/settings.json', JSON.stringify({ model: 'm', permissions: { allow: ['read'] } })),
    ]);
    expect(files[0].path).toBe('opencode.json');
    expect(JSON.parse(files[0].content)).toEqual({ model: 'm', permissions: { allow: ['read'] } });
  });

  it('extracts model from kilo config (.kilo/kilo.jsonc)', () => {
    const files = writeOpenCodeFiles([
      opaque('.kilo/kilo.jsonc', JSON.stringify({ model: 'm', maxTokens: 4096 })),
    ]);
    expect(files[0].path).toBe('opencode.json');
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
