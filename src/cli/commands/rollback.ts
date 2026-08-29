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

  // Read manifest
  let originals: Record<string, string | null> = {};
  try {
    const manifest = JSON.parse(await fs.readFile(path.join(backupBase, 'manifest.json'), 'utf-8'));
    originals = manifest.originals || {};
  } catch { /* no manifest */ }

  // Restore: null = file was created during migration → delete it
  //          string = original content → write it back
  for (const [relPath, originalContent] of Object.entries(originals)) {
    const fullPath = path.join(projectPath, relPath);
    if (originalContent === null) {
      try { await fs.unlink(fullPath); } catch { /* already gone */ }
    } else {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, originalContent);
    }
  }

  console.log(`\nMigration ${migrationId} rolled back.`);
  console.log('Source files restored.');
}
