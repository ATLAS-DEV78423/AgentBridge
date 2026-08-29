import { claudeAdapter } from '../../adapters/claude-code/index.js';
import { openCodeAdapter as opencodeAdapter } from '../../adapters/opencode/index.js';
import { kiloAdapter } from '../../adapters/kilo/index.js';
import { AgentAdapter } from '../../core/scanner/scanner.js';
import { normalizeBundle } from '../../core/normalize/normalizer.js';
import { writeOpenCodeFiles } from '../../adapters/opencode/writer.js';
import { createTransaction, applyTransaction } from '../../core/transaction/transaction.js';

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

  const ops = targetFiles
    .filter(f => f.action !== 'skip')
    .map(f => ({
      id: `op-${f.path}`,
      type: f.action as 'create' | 'modify',
      targetPath: f.path,
      content: f.content
    }));

  const tx = createTransaction(ops);
  await applyTransaction(tx, projectPath);

  console.log(`\nMigration ${tx.id}`);
  console.log(`${ops.length} operations applied.`);
  console.log(`Backup: .agentbridge/backups/${tx.id}`);
  console.log('\nMigration complete.');
}
