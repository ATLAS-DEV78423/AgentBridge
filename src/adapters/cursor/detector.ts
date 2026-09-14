import fs from 'node:fs/promises';
import path from 'node:path';
import { DetectionResult } from '../../core/scanner/scanner.js';

export async function detectCursor(ctx: { root: string }): Promise<DetectionResult> {
  try {
    await fs.access(path.join(ctx.root, '.cursor', 'mcp.json'));
    return { detected: true, agent: 'cursor' };
  } catch {
    return { detected: false };
  }
}
