import { claudeAdapter } from '../../adapters/claude-code/index.js';
import { openCodeAdapter } from '../../adapters/opencode/index.js';
import { kiloAdapter } from '../../adapters/kilo/index.js';
import { AgentAdapter } from '../../core/scanner/scanner.js';
import { normalizeBundle } from '../../core/normalize/normalizer.js';
import { evaluateCompatibility } from '../../core/compatibility/engine.js';
import { getRulesForMigration } from '../../registry/rules.js';

const adapters: Record<string, AgentAdapter> = {
  'claude-code': claudeAdapter,
  'opencode': openCodeAdapter,
  'kilo': kiloAdapter
};

export async function executeDiff(source: string, target: string, projectPath: string): Promise<void> {
  const sourceAdapter = adapters[source];
  if (!sourceAdapter) {
    console.error(`Unknown source agent: ${source}`);
    process.exit(1);
  }

  const bundle = await sourceAdapter.scanProject({ root: projectPath });
  const resources = normalizeBundle(bundle);
  const rules = getRulesForMigration(source, target);

  console.log(`\nDiff: ${source} → ${target}`);
  console.log('');

  let hasChanges = false;
  for (const resource of resources) {
    const result = evaluateCompatibility(resource.type, target, rules);
    if (result.status !== 'UNSUPPORTED') {
      hasChanges = true;
      const action = result.method === 'copy' ? '+' : result.method === 'rewrite' ? '~' : '-';
      console.log(`  ${action} ${resource.name} (${resource.type})`);
    }
  }

  if (!hasChanges) {
    console.log('  No files would be created or modified.');
  }

  console.log('\nNo files changed.');
}
