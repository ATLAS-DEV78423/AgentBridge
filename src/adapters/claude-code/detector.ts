import fs from 'node:fs/promises';
import path from 'node:path';
import { DetectionResult, ScanContext } from '../../core/scanner/scanner.js';

const CLAUDE_MARKERS = [
  '.claude/settings.json',
  '.claude/settings.local.json',
  'CLAUDE.md'
];

export async function detectClaude(ctx: ScanContext): Promise<DetectionResult> {
  for (const marker of CLAUDE_MARKERS) {
    const markerPath = path.join(ctx.root, marker);
    try {
      await fs.access(markerPath);
      return {
        detected: true,
        agent: 'claude-code',
        confidence: 'high',
        reason: `Found ${marker}`
      };
    } catch {
      // Continue checking
    }
  }
  
  return {
    detected: false,
    confidence: 'high',
    reason: 'No Claude configuration markers found'
  };
}
