import { claudeAdapter } from '../../adapters/claude-code/index.js';
import { opencodeAdapter } from '../../adapters/opencode/index.js';
import { kiloAdapter } from '../../adapters/kilo/index.js';
import { AgentAdapter } from '../../core/scanner/scanner.js';
import { normalizeBundle } from '../../core/normalize/normalizer.js';
import { writeOpenCodeFiles } from '../../adapters/opencode/writer.js';

const adapters: Record<string, AgentAdapter> = {
  'claude-code': claudeAdapter,
  'opencode': opencodeAdapter,
  'kilo': kiloAdapter
};

export async function executeDiff(source: string, target: string, projectPath: string): Promise<void> {
  const sourceAdapter = adapters[source];
  if (!sourceAdapter) {
    console.error(`Unknown agent: ${source}`);
    process.exit(1);
  }

  // Scan source
  const bundle = await sourceAdapter.scanProject({ root: projectPath });
  const resources = normalizeBundle(bundle);

  // Generate target files (only OpenCode for now)
  let targetFiles;
  if (target === 'opencode') {
    targetFiles = writeOpenCodeFiles(resources, projectPath);
  } else {
    console.error(`Target writer for ${target} not yet implemented.`);
    process.exit(1);
  }

  console.log(`\n${source} -> ${target}`);
  console.log('Migration diff:\n');

  const creates = targetFiles.filter(f => f.action === 'create');
  const skips = targetFiles.filter(f => f.action === 'skip');

  if (creates.length === 0) {
    console.log('  No files to create.');
  } else {
    for (const f of creates) {
      console.log(`  + ${f.path} (${f.content.length} bytes)`);
    }
  }

  if (skips.length > 0) {
    console.log(`\n  Skipped ${skips.length} unsupported resource(s).`);
  }

  console.log('\nNo files changed.');
}
