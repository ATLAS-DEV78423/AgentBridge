import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { hashFile } from '../filesystem/hashing.js';

export type TransactionOperation = {
  id: string;
  type: 'create' | 'modify' | 'delete';
  targetPath: string;
  content?: string;
  beforeHash?: string;
  backupPath?: string;
};

export type Transaction = {
  id: string;
  operations: TransactionOperation[];
  status: 'pending' | 'applied' | 'rolled-back';
  createdAt: string;
};

export function createTransaction(ops: TransactionOperation[]): Transaction {
  return {
    id: crypto.randomUUID(),
    operations: ops,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
}

export async function applyTransaction(tx: Transaction, targetDir: string): Promise<void> {
  const backupDir = path.join(targetDir, '.agentbridge', 'backups', tx.id);
  await fs.mkdir(backupDir, { recursive: true });

  for (const op of tx.operations) {
    const fullPath = path.join(targetDir, op.targetPath);

    if (op.type === 'create' || op.type === 'modify') {
      // Backup existing file if it exists
      try {
        const existing = await fs.readFile(fullPath);
        const backupPath = path.join(backupDir, path.basename(op.targetPath));
        await fs.writeFile(backupPath, existing);
        op.backupPath = backupPath;
        op.beforeHash = crypto.createHash('sha256').update(existing).digest('hex');
      } catch { /* file doesn't exist, no backup needed */ }

      // Write the new content
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, op.content || '');
    } else if (op.type === 'delete') {
      try {
        const existing = await fs.readFile(fullPath);
        const backupPath = path.join(backupDir, path.basename(op.targetPath));
        await fs.writeFile(backupPath, existing);
        op.backupPath = backupPath;
        await fs.unlink(fullPath);
      } catch { /* file doesn't exist */ }
    }
  }

  tx.status = 'applied';
}

export async function rollbackTransaction(tx: Transaction, targetDir: string): Promise<void> {
  for (const op of tx.operations) {
    if (op.backupPath) {
      const fullPath = path.join(targetDir, op.targetPath);
      try {
        const backup = await fs.readFile(op.backupPath);
        await fs.writeFile(fullPath, backup);
      } catch { /* backup doesn't exist */ }
    } else if (op.type === 'create') {
      // No backup means file didn't exist before, delete it
      const fullPath = path.join(targetDir, op.targetPath);
      try { await fs.unlink(fullPath); } catch { /* already gone */ }
    }
  }

  tx.status = 'rolled-back';
}
