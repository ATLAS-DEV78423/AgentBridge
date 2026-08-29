import fs from 'node:fs/promises';
import path from 'node:path';
import { DetectionResult } from '../../core/scanner/scanner.js';

const CLAUDE_MARKERS = [
  '.claude/settings.json',
  '.claude/settings.local.json',
  'CLAUDE.md'
];

export async function detectClaude(ctx: { root: string }): Promise<DetectionResult> {
  for (const marker of CLAUDE_MARKERS) {
    const markerPath = path.join(ctx.root, marker);
    try {
      await fs.access(markerPath);
      return { detected: true, agent: 'claude-code' };
    } catch {
      // Continue checking
    }
  }

  return { detected: false };
}
