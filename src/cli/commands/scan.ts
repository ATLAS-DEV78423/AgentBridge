import { adapters } from '../../adapters/registry.js';

export async function executeScan(projectPath: string): Promise<void> {
  let detectedAny = false;

  for (const [id, adapter] of Object.entries(adapters)) {
    const result = await adapter.detect({ root: projectPath });
    if (!result.detected) continue;
    detectedAny = true;

    const bundle = await adapter.scanProject({ root: projectPath });
    console.log(`\nDetected: ${bundle.sourceAgent || 'Unknown'} (id: ${id})`);
    console.log('');
    console.log('Found:');
    console.log(`  Instructions    ${bundle.instructions.length}`);
    console.log(`  MCP servers     ${bundle.mcpServers.length}`);
    console.log(`  Opaque          ${bundle.opaque.length}`);
  }

  if (!detectedAny) {
    console.log('No agent configurations detected.');
    return;
  }
  console.log('\nNo files changed.');
}
