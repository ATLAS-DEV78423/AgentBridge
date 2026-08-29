import fs from 'node:fs/promises';
import path from 'node:path';
import { DetectionResult, ScanContext } from '../../core/scanner/scanner.js';

const OPENCODE_MARKERS = [
  'opencode.json',
  'opencode.jsonc',
  '.opencode/config.json',
  '.opencode/config.jsonc'
];

export async function detectOpenCode(ctx: ScanContext): Promise<DetectionResult> {
  for (const marker of OPENCODE_MARKERS) {
    const markerPath = path.join(ctx.root, marker);
    try {
      await fs.access(markerPath);
      return {
        detected: true,
        agent: 'opencode',
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
    reason: 'No OpenCode configuration markers found'
  };
}
