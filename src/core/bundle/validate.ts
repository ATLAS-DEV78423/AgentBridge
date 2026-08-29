import crypto from 'node:crypto';
import { Bundle, BUNDLE_SCHEMA_VERSION } from './types.js';

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export function validateBundle(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid bundle format'], warnings: [] };
  }

  const bundle = data as Record<string, unknown>;
  const manifest = bundle.manifest as Record<string, unknown> | undefined;

  // Check manifest
  if (!manifest || typeof bundle.manifest !== 'object') {
    errors.push('Missing or invalid manifest');
  } else {
    if (manifest.schemaVersion !== BUNDLE_SCHEMA_VERSION) {
      warnings.push(`Schema version mismatch: expected ${BUNDLE_SCHEMA_VERSION}, got ${manifest.schemaVersion}`);
    }

    if (typeof manifest.checksum !== 'string') {
      errors.push('Missing checksum in manifest');
    }

    if (typeof manifest.resourceCount !== 'number') {
      warnings.push('Missing resource count in manifest');
    }
  }

  // Check bundle
  if (!bundle.bundle || typeof bundle.bundle !== 'object') {
    errors.push('Missing or invalid bundle data');
  } else {
    const inner = bundle.bundle as Record<string, unknown>;

    if (!inner.schemaVersion) {
      errors.push('Missing schemaVersion in bundle');
    }

    // Verify checksum
    if (manifest && typeof manifest.checksum === 'string') {
      const bundleJson = JSON.stringify(inner, null, 2);
      const actualChecksum = crypto.createHash('sha256').update(bundleJson).digest('hex');
      if (actualChecksum !== manifest.checksum) {
        errors.push('Checksum mismatch - bundle may be corrupted');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
