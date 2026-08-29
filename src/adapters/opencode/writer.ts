import { NormalizedResource } from '../../core/normalize/normalizer.js';
import { TargetFile } from '../../core/translate/writer.js';

export function writeOpenCodeFiles(resources: NormalizedResource[], targetRoot: string): TargetFile[] {
  const files: TargetFile[] = [];

  for (const r of resources) {
    switch (r.capability) {
      case 'instruction':
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

      case 'skill':
        // Skills -> commands (simplified)
        if (r.content) {
          files.push({
            path: `commands/${r.name}`,
            content: r.content,
            action: 'create'
          });
        }
        break;

      case 'mcp':
        // MCP config copies directly
        if (r.content) {
          files.push({
            path: 'opencode.json',
            content: r.content,
            action: 'create'
          });
        }
        break;

      case 'hook':
      case 'agent':
      case 'permission':
      case 'command':
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
