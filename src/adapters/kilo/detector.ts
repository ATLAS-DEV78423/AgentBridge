import fs from 'node:fs/promises';
import path from 'node:path';
import { DetectionResult } from '../../core/scanner/scanner.js';

export async function detectKilo(ctx: { root: string }): Promise<DetectionResult> {
  try {
    const configPath = path.join(ctx.root, '.kilo', 'config.json');
    await fs.access(configPath);
    return { detected: true, agent: 'kilo' };
  } catch {
    return { detected: false };
  }
}
