import fs from 'node:fs/promises';
import path from 'node:path';
import { output, OutputFormat } from '../output/formatter.js';

type MigrationEntry = {
  id: string;
  createdAt: string;
  files: string[];
};

export async function executeHistory(projectPath: string, fmt: OutputFormat = 'human'): Promise<void> {
  const backupDir = path.join(projectPath, '.agentbridge', 'backups');

  try {
    await fs.access(backupDir);
  } catch {
    if (fmt === 'json') {
      output({ success: true, command: 'history', data: { migrations: [] } });
    } else {
      console.log('\nNo migrations found.');
    }
    return;
  }

  const entries = await fs.readdir(backupDir, { withFileTypes: true });
  const migrations: MigrationEntry[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const migrationDir = path.join(backupDir, entry.name);
    const files = await fs.readdir(migrationDir);
    const stat = await fs.stat(migrationDir);
    migrations.push({
      id: entry.name,
      createdAt: stat.mtime.toISOString(),
      files
    });
  }

  migrations.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (fmt === 'json') {
    output({ success: true, command: 'history', data: { migrations } });
  } else {
    if (migrations.length === 0) {
      console.log('\nNo migrations found.');
      return;
    }
    console.log(`\nMigration History (${migrations.length} total):\n`);
    for (const m of migrations) {
      console.log(`  ${m.id}`);
      console.log(`    Created: ${m.createdAt}`);
      console.log(`    Files: ${m.files.join(', ')}`);
      console.log(`    Rollback: agent-migrate rollback ${projectPath} ${m.id}`);
      console.log('');
    }
  }
}
