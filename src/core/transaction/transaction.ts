import fs from 'node:fs/promises';
import path from 'node:path';

export type TransactionOperation = {
  targetPath: string;
  content: string;
};

export type Transaction = {
  id: string;
  operations: TransactionOperation[];
};

export function createTransaction(ops: TransactionOperation[]): Transaction {
  return {
    id: crypto.randomUUID(),
    operations: ops,
  };
}

export async function applyTransaction(tx: Transaction, targetDir: string): Promise<void> {
  const backupDir = path.join(targetDir, '.agentbridge', 'backups', tx.id);
  await fs.mkdir(backupDir, { recursive: true });

  // The manifest holds every original: string = restore this content,
  // null = the migration created the file, so rollback deletes it. The backup
  // copies themselves are redundant with it and nothing reads them.
  const originals: Record<string, string | null> = {};

  for (const op of tx.operations) {
    const fullPath = path.join(targetDir, op.targetPath);
    const existing = await fs.readFile(fullPath, 'utf-8').catch(() => null);
    originals[op.targetPath] = existing;

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, op.content);
  }

  await fs.writeFile(path.join(backupDir, 'manifest.json'), JSON.stringify({ originals }));
}
