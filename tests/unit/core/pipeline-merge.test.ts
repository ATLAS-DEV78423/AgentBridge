import { describe, it, expect } from 'vitest';
import { deepMergeJson } from '../../../src/core/pipeline.js';

describe('deepMergeJson', () => {
  it('preserves target-only keys', () => {
    expect(deepMergeJson({ theme: 'dark', model: 'old' }, { model: 'new' }))
      .toEqual({ theme: 'dark', model: 'new' });
  });

  it('merges nested objects with new values winning', () => {
    expect(deepMergeJson(
      { a: { x: 1, y: 2 }, b: 1 },
      { a: { y: 3, z: 4 } },
    )).toEqual({ a: { x: 1, y: 3, z: 4 }, b: 1 });
  });

  it('replaces arrays wholesale (incoming args are authoritative)', () => {
    expect(deepMergeJson({ args: ['old'] }, { args: ['-y', 'new'] }))
      .toEqual({ args: ['-y', 'new'] });
  });

  it('merges per-server config inside mcpServers, keeping user-only servers', () => {
    expect(deepMergeJson(
      { mcpServers: { fs: { command: 'old', timeout: 5 }, userSrv: { command: 'keep' } } },
      { mcpServers: { fs: { command: 'npx', args: ['-y', 'fs'] } } },
    )).toEqual({
      mcpServers: {
        fs: { command: 'npx', args: ['-y', 'fs'], timeout: 5 },
        userSrv: { command: 'keep' },
      },
    });
  });

  it('incoming null/undefined values still overwrite', () => {
    expect(deepMergeJson({ a: 1, b: 2 }, { a: null, b: undefined } as any))
      .toEqual({ a: null, b: undefined });
  });
});
