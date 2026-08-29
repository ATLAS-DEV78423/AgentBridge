import fs from 'node:fs/promises';
import path from 'node:path';
import { ScanContext, DetectionResult } from '../../core/scanner/scanner.js';

export async function detectOpenCode(ctx: ScanContext): Promise<DetectionResult> {
  try {
    const configPath = path.join(ctx.root, 'opencode.jsonc');
    await fs.access(configPath);
    return { detected: true, agent: 'opencode', confidence: 'high', reason: 'Found opencode.jsonc' };
  } catch {
    return { detected: false, confidence: 'high', reason: 'No opencode.jsonc found' };
  }
}
