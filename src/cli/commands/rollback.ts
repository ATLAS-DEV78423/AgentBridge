import { rollbackTransaction, Transaction, TransactionOperation } from '../../core/transaction/transaction.js';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function executeRollback(projectPath: string, migrationId: string): Promise<void> {
  const backupBase = path.join(projectPath, '.agentbridge', 'backups', migrationId);

  try {
    await fs.access(backupBase);
  } catch {
    console.error(`Migration ${migrationId} not found.`);
    process.exit(1);
  }

  // Read backed up files to determine operations
  const files = await readDirRecursive(backupBase);
  const ops: TransactionOperation[] = [];

  for (const file of files) {
    const relativePath = path.relative(backupBase, file);
    const content = await fs.readFile(file, 'utf-8');
    ops.push({
      id: `rollback-${relativePath}`,
      type: 'modify',
      targetPath: relativePath,
      content
    });
  }

  const tx: Transaction = {
    id: migrationId,
    operations: ops,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  await rollbackTransaction(tx, projectPath);
  console.log(`\nMigration ${migrationId} rolled back.`);
  console.log('Source files restored.');
}

async function readDirRecursive(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await readDirRecursive(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}
