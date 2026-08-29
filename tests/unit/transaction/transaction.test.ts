import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createTransaction, applyTransaction, rollbackTransaction } from '../../../src/core/transaction/transaction.js';

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
      id: 'op1',
      type: 'create',
      targetPath: 'test.txt',
      content: 'hello'
    }]);

    await applyTransaction(tx, tmpDir);
    expect(tx.status).toBe('applied');

    const content = await fs.readFile(path.join(tmpDir, 'test.txt'), 'utf-8');
    expect(content).toBe('hello');
  });

  it('backs up existing file before overwrite', async () => {
    await fs.writeFile(path.join(tmpDir, 'existing.txt'), 'original');

    const tx = createTransaction([{
      id: 'op1',
      type: 'modify',
      targetPath: 'existing.txt',
      content: 'modified'
    }]);

    await applyTransaction(tx, tmpDir);
    const content = await fs.readFile(path.join(tmpDir, 'existing.txt'), 'utf-8');
    expect(content).toBe('modified');
    expect(tx.operations[0].backupPath).toBeDefined();
  });

  it('rolls back to original state', async () => {
    await fs.writeFile(path.join(tmpDir, 'existing.txt'), 'original');

    const tx = createTransaction([{
      id: 'op1',
      type: 'modify',
      targetPath: 'existing.txt',
      content: 'modified'
    }]);

    await applyTransaction(tx, tmpDir);
    await rollbackTransaction(tx, tmpDir);

    const content = await fs.readFile(path.join(tmpDir, 'existing.txt'), 'utf-8');
    expect(content).toBe('original');
    expect(tx.status).toBe('rolled-back');
  });

  it('deletes a created file on rollback', async () => {
    const tx = createTransaction([{
      id: 'op1',
      type: 'create',
      targetPath: 'new.txt',
      content: 'new content'
    }]);

    await applyTransaction(tx, tmpDir);
    expect(await fs.access(path.join(tmpDir, 'new.txt')).then(() => true, () => false)).toBe(true);

    await rollbackTransaction(tx, tmpDir);
    expect(await fs.access(path.join(tmpDir, 'new.txt')).then(() => true, () => false)).toBe(false);
  });
});
