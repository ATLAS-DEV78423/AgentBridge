import fs from 'node:fs/promises';
import { AgentBundle } from '../model/types.js';
import { Bundle } from './types.js';
import { validateBundle } from './validate.js';

export type ImportResult = {
  success: boolean;
  bundle?: AgentBundle;
  errors: string[];
};

export async function importBundle(bundlePath: string): Promise<ImportResult> {
  try {
    const content = await fs.readFile(bundlePath, 'utf-8');
    const data = JSON.parse(content);

    const validation = validateBundle(data);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors
      };
    }

    const bundle = data as Bundle;
    return {
      success: true,
      bundle: bundle.bundle,
      errors: []
    };
  } catch (err) {
    if (err instanceof SyntaxError) {
      return { success: false, errors: ['Invalid JSON in bundle file'] };
    }
    return { success: false, errors: [`Failed to read bundle: ${(err as Error).message}`] };
  }
}
