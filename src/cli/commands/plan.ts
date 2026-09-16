import { adapters } from '../../adapters/registry.js';
import { flattenBundle, planMigration } from '../../core/pipeline.js';

/** Same agents as the runtime registry — the list can't drift from reality. */
function unknownAgent(id: string, role: 'source' | 'target'): never {
  // One stderr write, then exit: a stdout line would race process.exit and
  // be lost when output is piped.
  console.error(`Unknown ${role} agent: ${id}\nSupported agents: ${Object.keys(adapters).join(', ')}`);
  process.exit(1);
}

export function requireAgent(id: string, role: 'source' | 'target'): void {
  if (!adapters[id]) unknownAgent(id, role);
}

export async function executePlan(source: string, target: string, projectPath: string): Promise<void> {
  if (!adapters[source]) unknownAgent(source, 'source');
  if (!adapters[target]) unknownAgent(target, 'target');

  const sourceAdapter = adapters[source];
  const bundle = await sourceAdapter.scanProject({ root: projectPath });
  const resources = flattenBundle(bundle);
  const plan = planMigration(source, target, resources);

  console.log(`\nMigration Plan: ${source} → ${target}`);
  console.log(`Source: ${bundle.sourceAgent}`);
  console.log(`Resources: ${resources.length}`);
  console.log('');

  for (const { resource, status } of plan) {
    const icon = status === 'DIRECT' ? '✓' : status === 'UNSUPPORTED' ? '✗' : '~';
    console.log(`  ${icon} ${resource.name} (${resource.type}) → ${status}`);
  }

  console.log('\nNo files changed.');
}
