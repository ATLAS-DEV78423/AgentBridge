import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { safePath } from '../../../src/core/filesystem/primitives.js';

describe('Filesystem Primitives', () => {
  describe('safePath', () => {
    it('allows paths within root', () => {
      const root = path.resolve('/home/user/project');
      const result = safePath(root, 'src/index.ts');
      expect(result).toContain('src');
      expect(result).toContain('index.ts');
    });

    it('rejects path traversal', () => {
      const root = path.resolve('/home/user/project');
      expect(() => safePath(root, '../etc/passwd')).toThrow('Path traversal');
    });

    it('rejects absolute paths', () => {
      const root = path.resolve('/home/user/project');
      expect(() => safePath(root, '/etc/passwd')).toThrow('Absolute path');
    });
  });
});
