import { CanonicalResource } from '../../core/normalize/normalizer.js';

type TargetFile = {
  path: string;
  content: string;
  action: 'create' | 'update' | 'skip';
};

export function writeOpenCodeFiles(resources: CanonicalResource[], targetRoot: string): TargetFile[] {
  const files: TargetFile[] = [];

  for (const r of resources) {
    switch (r.type) {
      case 'instructions':
        // Instructions copy directly as AGENTS.md
        files.push({
          path: r.name,
          content: r.content || '',
          action: 'create'
        });
        break;

      case 'opaque':
        // Claude settings -> opencode.json
        if (r.name.includes('settings.json') && r.content) {
          try {
            const claudeSettings = JSON.parse(r.content);
            const openCodeConfig: Record<string, unknown> = {};

            // Map model
            if (claudeSettings.model) {
              openCodeConfig.model = claudeSettings.model;
            }

            // Map permissions
            if (claudeSettings.permissions) {
              openCodeConfig.permissions = claudeSettings.permissions;
            }

            files.push({
              path: 'opencode.json',
              content: JSON.stringify(openCodeConfig, null, 2),
              action: 'create'
            });
          } catch {
            // Invalid JSON, skip
          }
        }
        break;

      case 'skills':
        // Skills -> commands (simplified)
        if (r.content) {
          files.push({
            path: `commands/${r.name}`,
            content: r.content,
            action: 'create'
          });
        }
        break;

      case 'mcpServers':
        // MCP config copies directly
        if (r.content) {
          files.push({
            path: 'opencode.json',
            content: r.content,
            action: 'create'
          });
        }
        break;

      case 'hooks':
      case 'agents':
      case 'permissions':
      case 'commands':
      default:
        // Skip unsupported for now
        files.push({
          path: r.name,
          content: '',
          action: 'skip'
        });
        break;
    }
  }

  return files;
}
