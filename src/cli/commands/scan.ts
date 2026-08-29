import { claudeAdapter } from '../../adapters/claude-code/index.js';
import { opencodeAdapter } from '../../adapters/opencode/index.js';
import { kiloAdapter } from '../../adapters/kilo/index.js';
import { AgentAdapter } from '../../core/scanner/scanner.js';

const adapters: AgentAdapter[] = [claudeAdapter, opencodeAdapter, kiloAdapter];

export async function executeScan(projectPath: string): Promise<void> {
  const detected = [];

  for (const adapter of adapters) {
    const result = await adapter.detect({ root: projectPath });
    if (result.detected) {
      detected.push({ adapter, result });
    }
  }

  if (detected.length === 0) {
    console.log('No agent configurations detected.');
    return;
  }

  console.log('\nDetected agents:');
  for (const { adapter, result } of detected) {
    console.log(`  ${adapter.id} (${result.reason})`);
  }

  // Scan with first detected agent
  const { adapter } = detected[0];
  const bundle = await adapter.scanProject({ root: projectPath });

  console.log('');
  console.log(`Scanning ${bundle.metadata.sourceAgent?.name || 'Unknown'}:`);
  console.log('  Instructions    ' + bundle.instructions.length);
  console.log('  Skills          ' + bundle.skills.length);
  console.log('  Commands        ' + bundle.commands.length);
  console.log('  MCP servers     ' + bundle.mcpServers.length);
  console.log('  Agents          ' + bundle.agents.length);
  console.log('  Permissions     ' + bundle.permissions.length);
  console.log('  Hooks           ' + bundle.hooks.length);
  console.log('  Opaque          ' + bundle.opaque.length);
  console.log('\nNo files changed.');
}
