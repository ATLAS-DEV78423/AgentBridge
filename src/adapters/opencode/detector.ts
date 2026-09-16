import fs from 'node:fs/promises';
import path from 'node:path';
import { DetectionResult } from '../../core/scanner/scanner.js';

/** OpenCode reads `opencode.json[c]` — and this tool's own writer emits .json. */
const OPENCODE_CONFIGS = ['opencode.jsonc', 'opencode.json'];

export async function detectOpenCode(ctx: { root: string }): Promise<DetectionResult> {
  for (const rel of OPENCODE_CONFIGS) {
    try {
      await fs.access(path.join(ctx.root, rel));
      return { detected: true, agent: 'opencode' };
    } catch { /* try next candidate */ }
  }
  return { detected: false };
}
