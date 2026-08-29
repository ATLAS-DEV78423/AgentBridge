import { claudeAdapter } from '../../adapters/claude-code/index.js';
import { opencodeAdapter } from '../../adapters/opencode/index.js';
import { kiloAdapter } from '../../adapters/kilo/index.js';
import { AgentAdapter } from '../../core/scanner/scanner.js';
import { normalizeBundle } from '../../core/normalize/normalizer.js';
import { writeOpenCodeFiles } from '../../adapters/opencode/writer.js';
import { createMigrationPlan, applyMigration } from '../../core/transaction/manager.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const adapters: Record<string, AgentAdapter> = {
  'claude-code': claudeAdapter,
  'opencode': opencodeAdapter,
  'kilo': kiloAdapter
};

export async function executeApply(source: string, target: string, projectPath: string): Promise<void> {
  const sourceAdapter = adapters[source];
  if (!sourceAdapter) {
    console.error(`Unknown agent: ${source}`);
    process.exit(1);
  }

  const bundle = await sourceAdapter.scanProject({ root: projectPath });
  const resources = normalizeBundle(bundle);

  let targetFiles;
  if (target === 'opencode') {
    targetFiles = writeOpenCodeFiles(resources, projectPath);
  } else {
    console.error(`Target writer for ${target} not yet implemented.`);
    process.exit(1);
  }

  const plan = createMigrationPlan(source, target, projectPath, targetFiles);
  const result = await applyMigration(plan);

  console.log(`\nMigration ${result.id}\n`);
  console.log(`${result.applied} operations applied.`);
  console.log(`${result.skipped} operations skipped.`);
  if (result.failed > 0) {
    console.log(`${result.failed} operations failed.`);
  }
  console.log(`\nBackup: ${result.backupDir}`);
  console.log('\nMigration complete.');
}
