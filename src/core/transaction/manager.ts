import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { TargetFile } from '../translate/writer.js';
import { hashFile } from '../filesystem/hashing.js';

export type Operation = {
  id: string;
  type: 'create' | 'update' | 'skip';
  targetPath: string;
  content: string;
  expectedHash?: string;
};

export type MigrationPlan = {
  id: string;
  source: string;
  target: string;
  projectRoot: string;
  operations: Operation[];
  createdAt: string;
};

export type MigrationResult = {
  id: string;
  success: boolean;
  applied: number;
  skipped: number;
  failed: number;
  backupDir: string;
  error?: string;
};

export function createMigrationPlan(
  source: string,
  target: string,
  projectRoot: string,
  files: TargetFile[]
): MigrationPlan {
  return {
    id: randomUUID(),
    source,
    target,
    projectRoot,
    operations: files.filter(f => f.action !== 'skip').map(f => ({
      id: randomUUID(),
      type: f.action,
      targetPath: f.path,
      content: f.content
    })),
    createdAt: new Date().toISOString()
  };
}

export async function applyMigration(plan: MigrationPlan): Promise<MigrationResult> {
  const backupDir = path.join(plan.projectRoot, '.agentbridge', 'backups', plan.id);
  await fs.mkdir(backupDir, { recursive: true });

  let applied = 0;
  let skipped = 0;
  let failed = 0;

  for (const op of plan.operations) {
    const targetPath = path.join(plan.projectRoot, op.targetPath);

    try {
      // Backup existing file if it exists
      try {
        await fs.access(targetPath);
        const backupPath = path.join(backupDir, op.targetPath);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.copyFile(targetPath, backupPath);
      } catch {
        // File doesn't exist yet, no backup needed
      }

      // Write the new file
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, op.content, 'utf-8');
      applied++;
    } catch (err) {
      failed++;
    }
  }

  return {
    id: plan.id,
    success: failed === 0,
    applied,
    skipped,
    failed,
    backupDir
  };
}

export async function rollbackMigration(plan: MigrationPlan, backupDir: string): Promise<void> {
  for (const op of plan.operations) {
    const targetPath = path.join(plan.projectRoot, op.targetPath);
    const backupPath = path.join(backupDir, op.targetPath);

    try {
      await fs.access(backupPath);
      await fs.copyFile(backupPath, targetPath);
    } catch {
      // No backup exists, file was new - delete it
      try {
        await fs.unlink(targetPath);
      } catch {
        // File doesn't exist
      }
    }
  }
}
