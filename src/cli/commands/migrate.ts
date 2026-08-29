import { adapters } from '../../adapters/registry.js';
import { normalizeBundle } from '../../core/normalize/normalizer.js';
import { evaluateCompatibility } from '../../core/compatibility/engine.js';
import { getRulesForMigration } from '../../registry/rules.js';
import { writeOpenCodeFiles } from '../../adapters/opencode/writer.js';
import { createTransaction, applyTransaction } from '../../core/transaction/transaction.js';

export async function executeMigrate(source: string, target: string, projectPath: string): Promise<void> {
  const sourceAdapter = adapters[source];
  if (!sourceAdapter) { console.error(`Unknown source: ${source}`); process.exit(1); }

  // Scan
  const bundle = await sourceAdapter.scanProject({ root: projectPath });
  const resources = normalizeBundle(bundle);
  const rules = getRulesForMigration(source, target);

  // Plan
  const results = resources.map(r => ({
    resource: r,
    compatibility: evaluateCompatibility(r.type, target, rules)
  }));

  const supported = results.filter(r => r.compatibility.status !== 'UNSUPPORTED');
  const unsupported = results.filter(r => r.compatibility.status === 'UNSUPPORTED');

  console.log(`\nMigrating: ${source} → ${target}`);
  console.log(`  Supported: ${supported.length} resources`);
  if (unsupported.length > 0) console.log(`  Unsupported: ${unsupported.length} resources`);

  // Generate target files
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

  if (ops.length === 0) {
    console.log('\nNo files to write.');
    return;
  }

  // Apply
  const tx = createTransaction(ops);
  await applyTransaction(tx, projectPath);

  console.log(`\nApplied ${ops.length} files.`);
  console.log(`Backup: .agentbridge/backups/${tx.id}`);
  console.log(`\nRollback: agent-migrate rollback ${projectPath} ${tx.id}`);
  console.log('\nMigration complete.');
}
