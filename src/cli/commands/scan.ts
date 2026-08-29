import { adapters } from '../../adapters/registry.js';

export async function executeScan(projectPath: string): Promise<void> {
  for (const adapter of Object.values(adapters)) {
    const result = await adapter.detect({ root: projectPath });
    if (result.detected) {
      const bundle = await adapter.scanProject({ root: projectPath });
      console.log(`\nDetected: ${bundle.sourceAgent || 'Unknown'}`);
      console.log('');
      console.log('Found:');
      console.log(`  Instructions    ${bundle.instructions.length}`);
      console.log(`  MCP servers     ${bundle.mcpServers.length}`);
      console.log(`  Opaque          ${bundle.opaque.length}`);
      console.log('\nNo files changed.');
      return;
    }
  }

  console.log('No agent configurations detected.');
}
