import fs from 'node:fs/promises';
import path from 'node:path';
import { AgentBundle } from '../../core/model/types.js';
import { ScanContext, createResource } from '../../core/scanner/scanner.js';

export async function scanOpenCodeProject(ctx: ScanContext): Promise<AgentBundle> {
  const bundle: AgentBundle = {
    schemaVersion: '1.0.0',
    metadata: {
      name: path.basename(ctx.root),
      sourceAgent: { id: 'opencode', name: 'OpenCode' },
      sourceRoot: ctx.root
    },
    instructions: [],
    skills: [],
    commands: [],
    agents: [],
    mcpServers: [],
    permissions: [],
    hooks: [],
    opaque: []
  };

  // Scan for instruction files
  for (const file of ['AGENTS.md']) {
    const filePath = path.join(ctx.root, file);
    try {
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        const content = await fs.readFile(filePath, 'utf-8');
        const resource = await createResource('instruction', file, filePath, ctx.root, content);
        resource.provenance.sourceAgent = 'opencode';
        bundle.instructions.push(resource);
      }
    } catch { /* skip */ }
  }

  // Scan for opencode.jsonc
  const configPath = path.join(ctx.root, 'opencode.jsonc');
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const resource = await createResource('opaque', 'opencode.jsonc', configPath, ctx.root, content);
    resource.provenance.sourceAgent = 'opencode';
    bundle.opaque.push(resource);

    // Extract MCP servers from config
    try {
      const config = JSON.parse(content);
      if (config.mcpServers) {
        for (const [name, server] of Object.entries(config.mcpServers) as [string, any][]) {
          const mcpResource = await createResource(
            'mcpServer', name, configPath, ctx.root,
            JSON.stringify(server), { command: server.command, args: server.args }
          );
          mcpResource.provenance.sourceAgent = 'opencode';
          bundle.mcpServers.push(mcpResource);
        }
      }
    } catch { /* parse error, skip */ }
  } catch { /* config doesn't exist */ }

  return bundle;
}
