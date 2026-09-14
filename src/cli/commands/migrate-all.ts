import { adapters } from '../../adapters/registry.js';
import { migratePipeline } from '../../core/pipeline.js';

export type MigrateAllResult = Record<string, { txId: string | null; fileCount: number }>;

export async function executeMigrateAll(
  source: string,
  projectPath: string,
  dryRun = false,
): Promise<MigrateAllResult> {
  if (!adapters[source]) {
    console.error(`Unknown source agent: ${source}`);
    console.log('Supported agents: ' + Object.keys(adapters).join(', '));
    process.exit(1);
  }

  const targets = (await Promise.all(
    Object.entries(adapters).map(async ([id, adapter]) => {
      if (id === source) return null;
      const detection = await adapter.detect({ root: projectPath });
      return detection.detected ? id : null;
    }),
  )).filter((id): id is string => id !== null);

  console.log(`\nSyncing: ${source} → ${targets.length ? targets.join(', ') : '(no other agents detected)'}`);

  const results: MigrateAllResult = {};
  for (const target of targets) {
    console.log(`\n━━ ${source} → ${target} ━━`);
    const { txId, fileCount } = await migratePipeline(source, target, projectPath, dryRun);
    results[target] = { txId, fileCount };
  }

  if (targets.length === 0) {
    console.log('\nNothing to do: no other agents detected in this project.');
  } else if (dryRun) {
    console.log(`\nDry run complete: ${targets.length} target(s) planned, no files written.`);
  } else {
    console.log(`\nSynced ${source} → ${targets.join(', ')}.`);
    for (const [target, { txId }] of Object.entries(results)) {
      if (txId) console.log(`  Rollback ${target}: agent-migrate rollback ${projectPath} ${txId}`);
    }
  }

  return results;
}
