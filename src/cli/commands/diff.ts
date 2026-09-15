import { adapters } from '../../adapters/registry.js';
import { flattenBundle, planMigration } from '../../core/pipeline.js';

export async function executeDiff(source: string, target: string, projectPath: string): Promise<void> {
  const sourceAdapter = adapters[source];
  if (!sourceAdapter) {
    console.error(`Unknown source agent: ${source}`);
    process.exit(1);
  }

  const bundle = await sourceAdapter.scanProject({ root: projectPath });
  const resources = flattenBundle(bundle);
  const plan = planMigration(source, target, resources);

  console.log(`\nDiff: ${source} → ${target}`);
  console.log('');

  let hasChanges = false;
  for (const { resource, status, method } of plan) {
    if (status !== 'UNSUPPORTED') {
      hasChanges = true;
      const action = method === 'copy' ? '+' : '~';
      console.log(`  ${action} ${resource.name} (${resource.type})`);
    }
  }

  if (!hasChanges) {
    console.log('  No files would be created or modified.');
  }

  console.log('\nNo files changed.');
}
