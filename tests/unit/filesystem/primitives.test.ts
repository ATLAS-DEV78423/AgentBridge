import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  atomicWrite,
  backupFile,
  restoreBackup,
  safePath
} from '../../../src/core/filesystem/index.js';
import { hashFile } from '../../../src/core/filesystem/hashing.js';

describe('Filesystem Primitives', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-migrate-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('atomicWrite', () => {
    it('creates a new file', async () => {
      const filePath = path.join(tmpDir, 'test.txt');
      await atomicWrite(filePath, 'hello world');
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('hello world');
    });

    it('overwrites existing file and creates backup', async () => {
      const filePath = path.join(tmpDir, 'test.txt');
      await fs.writeFile(filePath, 'original');
      await atomicWrite(filePath, 'updated');
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('updated');
      const backupPath = filePath + '.bak';
      const backupExists = await fs.access(backupPath).then(() => true).catch(() => false);
      expect(backupExists).toBe(true);
    });
  });

  describe('backupFile', () => {
    it('creates a backup with .bak extension', async () => {
      const filePath = path.join(tmpDir, 'test.txt');
      await fs.writeFile(filePath, 'content');
      const backupPath = await backupFile(filePath);
      expect(backupPath).toBe(filePath + '.bak');
      const backupContent = await fs.readFile(backupPath, 'utf-8');
      expect(backupContent).toBe('content');
    });
  });

  describe('restoreBackup', () => {
    it('restores file from backup', async () => {
      const filePath = path.join(tmpDir, 'test.txt');
      const backupPath = filePath + '.bak';
      await fs.writeFile(backupPath, 'backup content');
      await restoreBackup(filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('backup content');
    });

    it('fails if backup does not exist', async () => {
      const filePath = path.join(tmpDir, 'test.txt');
      await expect(restoreBackup(filePath)).rejects.toThrow('Backup not found');
    });
  });

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

  describe('hashFile', () => {
    it('returns sha256 hash of file', async () => {
      const filePath = path.join(tmpDir, 'test.txt');
      await fs.writeFile(filePath, 'hello');
      const hash = await hashFile(filePath);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('same content produces same hash', async () => {
      const file1 = path.join(tmpDir, 'a.txt');
      const file2 = path.join(tmpDir, 'b.txt');
      await fs.writeFile(file1, 'same');
      await fs.writeFile(file2, 'same');
      const hash1 = await hashFile(file1);
      const hash2 = await hashFile(file2);
      expect(hash1).toBe(hash2);
    });
  });
});
