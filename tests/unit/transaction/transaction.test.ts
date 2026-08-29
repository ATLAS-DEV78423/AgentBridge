import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createTransaction, applyTransaction } from '../../../src/core/transaction/transaction.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('transaction engine', () => {
  it('creates a new file', async () => {
    const tx = createTransaction([{
      type: 'create',
      targetPath: 'test.txt',
      content: 'hello'
    }]);

    await applyTransaction(tx, tmpDir);

    const content = await fs.readFile(path.join(tmpDir, 'test.txt'), 'utf-8');
    expect(content).toBe('hello');
  });

  it('backs up existing file before overwrite', async () => {
    await fs.writeFile(path.join(tmpDir, 'existing.txt'), 'original');

    const tx = createTransaction([{
      type: 'create',
      targetPath: 'existing.txt',
      content: 'modified'
    }]);

    await applyTransaction(tx, tmpDir);

    const content = await fs.readFile(path.join(tmpDir, 'existing.txt'), 'utf-8');
    expect(content).toBe('modified');

    // Verify manifest tracks original content
    const backupDir = path.join(tmpDir, '.agentbridge', 'backups', tx.id);
    const manifest = JSON.parse(await fs.readFile(path.join(backupDir, 'manifest.json'), 'utf-8'));
    expect(manifest.originals['existing.txt']).toBe('original');
  });

  it('tracks created files as null in manifest', async () => {
    const tx = createTransaction([{
      type: 'create',
      targetPath: 'new.txt',
      content: 'new content'
    }]);

    await applyTransaction(tx, tmpDir);

    const backupDir = path.join(tmpDir, '.agentbridge', 'backups', tx.id);
    const manifest = JSON.parse(await fs.readFile(path.join(backupDir, 'manifest.json'), 'utf-8'));
    expect(manifest.originals['new.txt']).toBeNull();
  });

  it('rolls back via manifest', async () => {
    await fs.writeFile(path.join(tmpDir, 'existing.txt'), 'original');

    const tx = createTransaction([{
      type: 'create',
      targetPath: 'existing.txt',
      content: 'modified'
    }]);

    await applyTransaction(tx, tmpDir);

    // Read manifest and restore
    const backupDir = path.join(tmpDir, '.agentbridge', 'backups', tx.id);
    const manifest = JSON.parse(await fs.readFile(path.join(backupDir, 'manifest.json'), 'utf-8'));

    for (const [relPath, originalContent] of Object.entries(manifest.originals)) {
      const fullPath = path.join(tmpDir, relPath);
      if (originalContent === null) {
        await fs.unlink(fullPath);
      } else {
        await fs.writeFile(fullPath, originalContent as string);
      }
    }

    const content = await fs.readFile(path.join(tmpDir, 'existing.txt'), 'utf-8');
    expect(content).toBe('original');
  });
});
