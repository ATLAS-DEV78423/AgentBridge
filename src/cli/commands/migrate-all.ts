import { adapters } from '../../adapters/registry.js';
import { hasWriter } from '../../core/writers.js';
import { migratePipeline } from '../../core/pipeline.js';
import { requireAgent } from './plan.js';

export type MigrateAllResult = Record<string, { txId: string | null; fileCount: number }>;

export async function executeMigrateAll(
  source: string,
  projectPath: string,
  dryRun = false,
): Promise<MigrateAllResult> {
  requireAgent(source, 'source');

  const targets = (await Promise.all(
    Object.entries(adapters).map(async ([id, adapter]) => {
      if (id === source) return null;
      const detection = await adapter.detect({ root: projectPath });
      return detection.detected ? id : null;
    }),
  )).filter((id): id is string => id !== null);

  // Pre-flight: refuse to start unless every detected target can be written,
  // so a partial migration never happens because of a missing writer.
  const missing = targets.filter(t => !hasWriter(t));
  if (missing.length > 0) {
    throw new Error(
      `No target writer for: ${missing.join(', ')}. ` +
      `Aborting before touching any files (nothing was migrated).`,
    );
  }

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
