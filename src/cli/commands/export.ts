import { claudeAdapter } from '../../adapters/claude-code/index.js';
import { openCodeAdapter } from '../../adapters/opencode/index.js';
import { kiloAdapter } from '../../adapters/kilo/index.js';
import { AgentAdapter } from '../../core/scanner/scanner.js';
import { exportBundle } from '../../core/bundle/export.js';
import { output, OutputFormat } from '../output/formatter.js';

const adapters: Record<string, AgentAdapter> = {
  'claude-code': claudeAdapter,
  'opencode': openCodeAdapter,
  'kilo': kiloAdapter
};

export async function executeExport(
  agent: string | undefined,
  projectPath: string,
  outputPath: string,
  fmt: OutputFormat = 'human'
): Promise<void> {
  // Detect agent if not specified
  let detectedAgent: string | undefined = agent;
  if (!detectedAgent) {
    for (const [id, adapter] of Object.entries(adapters)) {
      const result = await adapter.detect({ root: projectPath });
      if (result.detected) {
        detectedAgent = id;
        break;
      }
    }
  }

  if (!detectedAgent || !adapters[detectedAgent]) {
    console.error('No agent detected. Specify an agent or run in a project with agent config.');
    process.exit(1);
  }

  const bundle = await adapters[detectedAgent].scanProject({ root: projectPath });
  const result = await exportBundle(bundle, outputPath, { redactSecrets: true });

  if (fmt === 'json') {
    output({
      success: true,
      command: 'export',
      data: {
        path: outputPath,
        agent: detectedAgent,
        resources: result.manifest.resourceCount,
        checksum: result.manifest.checksum
      }
    });
  } else {
    console.log(`\nExported bundle to: ${outputPath}`);
    console.log(`  Agent: ${detectedAgent}`);
    console.log(`  Resources: ${result.manifest.resourceCount}`);
    console.log(`  Checksum: ${result.manifest.checksum.slice(0, 12)}...`);
    console.log('\nNo files changed in source project.');
  }
}
