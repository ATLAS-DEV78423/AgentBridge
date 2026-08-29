import { adapters } from '../../adapters/registry.js';
import { flattenBundle, planMigration } from '../../core/pipeline.js';

export async function executePlan(source: string, target: string, projectPath: string): Promise<void> {
  const sourceAdapter = adapters[source];

  if (!sourceAdapter || !adapters[target]) {
    console.error(`Unknown agent: ${!sourceAdapter ? source : target}`);
    console.log('Supported agents: claude-code, opencode, kilo');
    process.exit(1);
  }

  const bundle = await sourceAdapter.scanProject({ root: projectPath });
  const resources = flattenBundle(bundle);
  const plan = planMigration(source, target, resources);

  console.log(`\nMigration Plan: ${source} → ${target}`);
  console.log(`Source: ${bundle.sourceAgent}`);
  console.log(`Resources: ${resources.length}`);
  console.log('');

  for (const { resource, compatibility } of plan) {
    const icon = compatibility.status === 'DIRECT' ? '✓' : compatibility.status === 'UNSUPPORTED' ? '✗' : '~';
    console.log(`  ${icon} ${resource.name} (${resource.type}) → ${compatibility.status}`);
  }

  console.log('\nNo files changed.');
}
