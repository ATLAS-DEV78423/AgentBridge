import crypto from 'node:crypto';
import { Bundle, BUNDLE_SCHEMA_VERSION } from './types.js';

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateBundle(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid bundle format'] };
  }

  const bundle = data as Record<string, unknown>;
  const manifest = bundle.manifest as Record<string, unknown> | undefined;

  if (!manifest || typeof bundle.manifest !== 'object') {
    errors.push('Missing or invalid manifest');
  } else {
    if (manifest.schemaVersion !== BUNDLE_SCHEMA_VERSION) {
      errors.push(`Schema version mismatch: expected ${BUNDLE_SCHEMA_VERSION}`);
    }
    if (typeof manifest.checksum !== 'string') {
      errors.push('Missing checksum in manifest');
    }
  }

  if (!bundle.bundle || typeof bundle.bundle !== 'object') {
    errors.push('Missing or invalid bundle data');
  } else {
    const inner = bundle.bundle as Record<string, unknown>;
    if (!inner.schemaVersion) errors.push('Missing schemaVersion in bundle');

    if (manifest && typeof manifest.checksum === 'string') {
      const actualChecksum = crypto.createHash('sha256').update(JSON.stringify(inner, null, 2)).digest('hex');
      if (actualChecksum !== manifest.checksum) errors.push('Checksum mismatch');
    }
  }

  return { valid: errors.length === 0, errors };
}
