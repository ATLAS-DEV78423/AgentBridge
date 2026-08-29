import { claudeAdapter } from '../../adapters/claude-code/index.js';
import { validateBundle } from '../../core/model/schema.js';

export async function executeScan(projectPath: string): Promise<void> {
  const adapters = [claudeAdapter];
  let bundle = null;

  for (const adapter of adapters) {
    const result = await adapter.detect({ root: projectPath });
    if (result.detected) {
      bundle = await adapter.scanProject({ root: projectPath });
      break;
    }
  }

  if (!bundle) {
    console.log('No agent configurations detected.');
    return;
  }

  console.log(`\nDetected: ${bundle.metadata.sourceAgent?.name || 'Unknown'}`);
  console.log('');
  console.log('Found:');
  console.log(`  Instructions    ${bundle.instructions.length}`);
  console.log(`  Skills          ${bundle.skills.length}`);
  console.log(`  Commands        ${bundle.commands.length}`);
  console.log(`  MCP servers     ${bundle.mcpServers.length}`);
  console.log(`  Agents          ${bundle.agents.length}`);
  console.log(`  Permissions     ${bundle.permissions.length}`);
  console.log(`  Hooks           ${bundle.hooks.length}`);
  console.log(`  Opaque          ${bundle.opaque.length}`);
  console.log('\nNo files changed.');
}
