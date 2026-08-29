import fs from 'node:fs/promises';
import path from 'node:path';
import { ScanContext, DetectionResult } from '../../core/scanner/scanner.js';

export async function detectKilo(ctx: ScanContext): Promise<DetectionResult> {
  try {
    const configPath = path.join(ctx.root, '.kilo', 'config.json');
    await fs.access(configPath);
    return { detected: true, agent: 'kilo', confidence: 'high', reason: 'Found .kilo/config.json' };
  } catch {
    return { detected: false, confidence: 'high', reason: 'No .kilo/config.json found' };
  }
}
