import { adapters } from '../../adapters/registry.js';
import { normalizeBundle } from '../../core/normalize/normalizer.js';
import { writeOpenCodeFiles } from '../../adapters/opencode/writer.js';
import { createTransaction, applyTransaction } from '../../core/transaction/transaction.js';

export async function executeApply(source: string, target: string, projectPath: string, dryRun = false): Promise<void> {
  const sourceAdapter = adapters[source];
  if (!sourceAdapter) { console.error(`Unknown agent: ${source}. Supported: ${Object.keys(adapters).join(', ')}`); process.exit(1); }

  const bundle = await sourceAdapter.scanProject({ root: projectPath });
  const resources = normalizeBundle(bundle);

  let targetFiles;
  if (target === 'opencode') {
    targetFiles = writeOpenCodeFiles(resources);
  } else {
    console.error(`Target writer for ${target} not yet implemented.`);
    process.exit(1);
  }

  const ops = targetFiles
    .filter(f => f.action !== 'skip')
    .map(f => ({
      id: `op-${f.path}`,
      type: f.action as 'create' | 'modify',
      targetPath: f.path,
      content: f.content
    }));

  if (dryRun) {
    console.log(`\nDry run: ${source} → ${target}`);
    console.log(`Would create ${ops.length} files:\n`);
    for (const op of ops) {
      console.log(`  + ${op.targetPath}`);
    }
    console.log('\nNo files written.');
    return;
  }

  const tx = createTransaction(ops);
  await applyTransaction(tx, projectPath);

  console.log(`\nMigration ${tx.id}`);
  console.log(`${ops.length} operations applied.`);
  console.log(`Backup: .agentbridge/backups/${tx.id}`);
  console.log('\nMigration complete.');
}
