import { claudeAdapter } from '../../adapters/claude-code/index.js';
import { openCodeAdapter } from '../../adapters/opencode/index.js';
import { kiloAdapter } from '../../adapters/kilo/index.js';
import { AgentAdapter } from '../../core/scanner/scanner.js';

const adapters: AgentAdapter[] = [claudeAdapter, openCodeAdapter, kiloAdapter];

export async function executeScan(projectPath: string): Promise<void> {
  for (const adapter of adapters) {
    const result = await adapter.detect({ root: projectPath });
    if (result.detected) {
      const bundle = await adapter.scanProject({ root: projectPath });
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
      return;
    }
  }

  console.log('No agent configurations detected.');
}
