import fs from 'node:fs/promises';
import path from 'node:path';
import { DetectionResult } from '../../core/scanner/scanner.js';

export async function detectKilo(ctx: { root: string }): Promise<DetectionResult> {
  for (const rel of ['.kilo/kilo.jsonc', '.kilo/config.json']) {
    try {
      await fs.access(path.join(ctx.root, rel));
      return { detected: true, agent: 'kilo' };
    } catch { /* next marker */ }
  }
  return { detected: false };
}
