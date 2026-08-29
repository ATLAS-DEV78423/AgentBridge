import fs from 'node:fs/promises';
import path from 'node:path';

export type TransactionOperation = {
  type: 'create';
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

  // Track originals for rollback: { relativePath → originalContent | null }
  const originals: Record<string, string | null> = {};

  for (const op of tx.operations) {
    const fullPath = path.join(targetDir, op.targetPath);
    const backupName = op.targetPath.replace(/[/\\]/g, '__');

    // Backup existing file if it exists
    let existed = false;
    try {
      const existing = await fs.readFile(fullPath, 'utf-8');
      await fs.writeFile(path.join(backupDir, backupName), existing);
      originals[op.targetPath] = existing;
      existed = true;
    } catch { /* file doesn't exist, no backup needed */ }

    // Write the new content
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, op.content);

    if (!existed) originals[op.targetPath] = null;
  }

  // Save manifest: originals = null means file was created (delete on rollback)
  await fs.writeFile(path.join(backupDir, 'manifest.json'), JSON.stringify({ originals }));
}
