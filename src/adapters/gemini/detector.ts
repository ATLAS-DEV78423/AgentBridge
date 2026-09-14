import fs from 'node:fs/promises';
import path from 'node:path';
import { DetectionResult } from '../../core/scanner/scanner.js';

export async function detectGemini(ctx: { root: string }): Promise<DetectionResult> {
  try {
    await fs.access(path.join(ctx.root, '.gemini', 'settings.json'));
    return { detected: true, agent: 'gemini' };
  } catch {
    return { detected: false };
  }
}
