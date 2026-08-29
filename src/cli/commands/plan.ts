import { claudeAdapter } from '../../adapters/claude-code/index.js';
import { opencodeAdapter } from '../../adapters/opencode/index.js';
import { kiloAdapter } from '../../adapters/kilo/index.js';
import { AgentAdapter } from '../../core/scanner/scanner.js';
import { normalizeBundle } from '../../core/normalize/normalizer.js';
import { evaluateResources } from '../../core/compatibility/engine.js';

const adapters: Record<string, AgentAdapter> = {
  'claude-code': claudeAdapter,
  'opencode': opencodeAdapter,
  'kilo': kiloAdapter
};

export async function executePlan(source: string, target: string, projectPath: string): Promise<void> {
  const sourceAdapter = adapters[source];
  if (!sourceAdapter) {
    console.error(`Unknown agent: ${source}`);
    process.exit(1);
  }

  const bundle = await sourceAdapter.scanProject({ root: projectPath });
  const resources = normalizeBundle(bundle);
  const results = evaluateResources(resources, source, target);

  console.log(`\n${source} -> ${target}\n`);
  console.log('Migration plan:');

  const counts = { DIRECT: 0, ADAPTED: 0, PARTIAL: 0, UNSUPPORTED: 0 };
  for (const r of results) {
    const icon = r.status === 'DIRECT' ? '✓' : r.status === 'ADAPTED' ? '≈' : r.status === 'PARTIAL' ? '⚠' : '✕';
    console.log(`  ${icon} ${r.sourceCapability.padEnd(15)} ${r.status}`);
    counts[r.status as keyof typeof counts]++;
  }

  console.log(`\n${counts.DIRECT} direct, ${counts.ADAPTED} adapted, ${counts.PARTIAL} partial, ${counts.UNSUPPORTED} unsupported`);
  console.log('\nNo files changed.');
}
