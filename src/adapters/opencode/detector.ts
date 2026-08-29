import fs from 'node:fs/promises';
import path from 'node:path';
import { DetectionResult } from '../../core/scanner/scanner.js';

export async function detectOpenCode(ctx: { root: string }): Promise<DetectionResult> {
  try {
    const configPath = path.join(ctx.root, 'opencode.jsonc');
    await fs.access(configPath);
    return { detected: true, agent: 'opencode' };
  } catch {
    return { detected: false };
  }
}
