import { adapters } from '../adapters/registry.js';
import { AgentBundle, ResourceBase } from './model/types.js';
import { evaluateCompatibility, CompatibilityResult } from './compatibility/engine.js';
import { getRulesForMigration } from '../registry/rules.js';
import { createTransaction, applyTransaction, TransactionOperation } from './transaction/transaction.js';
import { getWriter } from './writers.js';

/** Flatten AgentBundle's typed arrays into a single ResourceBase[] with type set from section name. */
export function flattenBundle(bundle: AgentBundle): ResourceBase[] {
  const resources: ResourceBase[] = [];
  for (const section of ['instructions', 'mcpServers', 'opaque'] as const) {
    for (const resource of bundle[section]) {
      resources.push({ ...resource, type: section === 'opaque' ? resource.type : section });
    }
  }
  return resources;
}

export type PlanResult = {
  resource: ResourceBase;
  compatibility: CompatibilityResult;
};

export function planMigration(source: string, target: string, resources: ResourceBase[]): PlanResult[] {
  const rules = getRulesForMigration(source, target);
  return resources.map(resource => ({
    resource,
    compatibility: evaluateCompatibility(resource.type, rules)
  }));
}

export async function migratePipeline(
  source: string,
  target: string,
  projectPath: string,
  dryRun = false
): Promise<{ txId: string | null; fileCount: number }> {
  const sourceAdapter = adapters[source];
  if (!sourceAdapter) throw new Error(`Unknown source agent: ${source}`);

  const writeFn = getWriter(target);
  if (!writeFn) throw new Error(`Target writer for ${target} not yet implemented`);

  const bundle = await sourceAdapter.scanProject({ root: projectPath });
  const resources = flattenBundle(bundle);
  const plan = planMigration(source, target, resources);
  const supported = plan.filter(p => p.compatibility.status !== 'UNSUPPORTED');

  console.log(`\nMigrating: ${source} → ${target}`);
  console.log(`  Supported: ${supported.length} resources`);
  if (plan.length > supported.length) console.log(`  Unsupported: ${plan.length - supported.length} resources`);

  const targetFiles = writeFn(resources);
  const ops: TransactionOperation[] = targetFiles
    .filter(f => f.action !== 'skip')
    .map(f => ({
      type: 'create' as const,
      targetPath: f.path,
      content: f.content
    }));

  if (ops.length === 0) {
    console.log('\nNo files to write.');
    return { txId: null, fileCount: 0 };
  }

  if (dryRun) {
    console.log(`\nDry run: ${source} → ${target}`);
    console.log(`Would create ${ops.length} files:\n`);
    for (const op of ops) {
      console.log(`  + ${op.targetPath}`);
    }
    console.log('\nNo files written.');
    return { txId: null, fileCount: ops.length };
  }

  const tx = createTransaction(ops);
  await applyTransaction(tx, projectPath);

  console.log(`\nApplied ${ops.length} files.`);
  console.log(`Backup: .agentbridge/backups/${tx.id}`);
  console.log(`\nRollback: agent-migrate rollback ${projectPath} ${tx.id}`);
  console.log('\nMigration complete.');

  return { txId: tx.id, fileCount: ops.length };
}
