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

export async function executePlan(source: string, target: string, projectPath: string): Promise<void> {
  const sourceAdapter = adapters[source];
  const targetAdapter = adapters[target];

  if (!sourceAdapter || !targetAdapter) {
    console.error(`Unknown agent: ${!sourceAdapter ? source : target}`);
    console.log('Supported agents: claude-code, opencode, kilo');
    process.exit(1);
  }

  const bundle = await sourceAdapter.scanProject({ root: projectPath });
  const resources = normalizeBundle(bundle);
  const rules = getRulesForMigration(source, target);

  console.log(`\nMigration Plan: ${source} → ${target}`);
  console.log(`Source: ${bundle.metadata.sourceAgent?.name}`);
  console.log(`Resources: ${resources.length}`);
  console.log('');

  for (const resource of resources) {
    const result = evaluateCompatibility(resource.type, target, rules);
    const icon = result.status === 'DIRECT' ? '✓' : result.status === 'UNSUPPORTED' ? '✗' : '~';
    console.log(`  ${icon} ${resource.name} (${resource.type}) → ${result.status}`);
    if (result.warnings.length > 0) {
      for (const w of result.warnings) {
        console.log(`    ⚠ ${w}`);
      }
    }
  }

  console.log('\nNo files changed.');
}
