import fs from 'node:fs/promises';
import path from 'node:path';
import { DetectionResult, ScanContext } from '../../core/scanner/scanner.js';

const KILO_MARKERS = [
  '.kilo/config.json',
  '.kilo/config.yaml',
  '.kilo/settings.json'
];

export async function detectKilo(ctx: ScanContext): Promise<DetectionResult> {
  for (const marker of KILO_MARKERS) {
    const markerPath = path.join(ctx.root, marker);
    try {
      await fs.access(markerPath);
      return {
        detected: true,
        agent: 'kilo',
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
    reason: 'No Kilo configuration markers found'
  };
}
