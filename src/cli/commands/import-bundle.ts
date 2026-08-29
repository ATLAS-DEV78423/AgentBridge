import { importBundle } from '../../core/bundle/import.js';
import { validateBundle } from '../../core/bundle/validate.js';
import { output, OutputFormat } from '../output/formatter.js';

export async function executeImport(
  bundlePath: string,
  fmt: OutputFormat = 'human'
): Promise<void> {
  const result = await importBundle(bundlePath);

  if (!result.success) {
    if (fmt === 'json') {
      output({
        success: false,
        command: 'import',
        data: null,
        error: result.errors.join('; ')
      });
    } else {
      console.error('\nImport failed:');
      for (const err of result.errors) {
        console.error(`  ✗ ${err}`);
      }
    }
    process.exit(1);
  }

  const bundle = result.bundle!;

  if (fmt === 'json') {
    output({
      success: true,
      command: 'import',
      data: {
        agent: bundle.metadata.sourceAgent?.id,
        name: bundle.metadata.name,
        resources: bundle.instructions.length + bundle.skills.length +
          bundle.commands.length + bundle.agents.length +
          bundle.mcpServers.length + bundle.permissions.length +
          bundle.hooks.length + bundle.opaque.length
      }
    });
  } else {
    console.log(`\nImported bundle:`);
    console.log(`  Agent: ${bundle.metadata.sourceAgent?.name || 'Unknown'}`);
    console.log(`  Name: ${bundle.metadata.name}`);
    console.log(`  Instructions: ${bundle.instructions.length}`);
    console.log(`  Skills: ${bundle.skills.length}`);
    console.log(`  Commands: ${bundle.commands.length}`);
    console.log(`  MCP servers: ${bundle.mcpServers.length}`);
    console.log(`  Agents: ${bundle.agents.length}`);
    console.log('\nBundle validated and ready for migration.');
  }
}
