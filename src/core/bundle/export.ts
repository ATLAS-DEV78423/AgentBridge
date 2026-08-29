import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { AgentBundle } from '../model/types.js';
import { BUNDLE_SCHEMA_VERSION, Bundle } from './types.js';

const SECRET_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /token/i,
  /password/i,
  /credential/i,
  /auth[_-]?token/i
];

function containsSecret(value: string): boolean {
  return SECRET_PATTERNS.some(p => p.test(value));
}

function redactSecrets(bundle: AgentBundle): AgentBundle {
  const redacted = JSON.parse(JSON.stringify(bundle));
  for (const section of ['instructions', 'skills', 'commands', 'agents', 'mcpServers', 'permissions', 'hooks', 'opaque'] as const) {
    for (const resource of redacted[section]) {
      if (resource.content && containsSecret(resource.content)) resource.content = '[REDACTED]';
      if (resource.metadata) {
        for (const [key, value] of Object.entries(resource.metadata)) {
          if (typeof value === 'string' && containsSecret(value)) resource.metadata[key] = '[REDACTED]';
        }
      }
    }
  }
  return redacted;
}

export async function exportBundle(
  bundle: AgentBundle,
  outputPath: string,
  options: { redactSecrets?: boolean } = {}
): Promise<Bundle> {
  const processedBundle = options.redactSecrets ? redactSecrets(bundle) : bundle;
  const bundleJson = JSON.stringify(processedBundle, null, 2);
  const checksum = crypto.createHash('sha256').update(bundleJson).digest('hex');

  const bundleData: Bundle = {
    manifest: {
      schemaVersion: BUNDLE_SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
      sourceAgent: bundle.metadata.sourceAgent?.id,
      sourceRoot: bundle.metadata.sourceRoot,
      checksum,
      resourceCount: processedBundle.instructions.length + processedBundle.skills.length +
        processedBundle.commands.length + processedBundle.agents.length +
        processedBundle.mcpServers.length + processedBundle.permissions.length +
        processedBundle.hooks.length + processedBundle.opaque.length
    },
    bundle: processedBundle
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(bundleData, null, 2));
  return bundleData;
}
