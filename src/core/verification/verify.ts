import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { FileVerification, ResourceVerification, VerificationReport } from './types.js';
import { CanonicalResource } from '../normalize/normalizer.js';

export async function verifyFile(filePath: string, expectedHash?: string): Promise<FileVerification> {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      return { path: filePath, status: 'FAILED', message: 'Path exists but is not a file' };
    }

    if (expectedHash) {
      const content = await fs.readFile(filePath);
      const actualHash = crypto.createHash('sha256').update(content).digest('hex');
      if (actualHash === expectedHash) {
        return { path: filePath, status: 'FILE_MATCHES', expectedHash, actualHash, message: 'File hash matches' };
      }
      return { path: filePath, status: 'FAILED', expectedHash, actualHash, message: `Hash mismatch` };
    }

    return { path: filePath, status: 'FILE_EXISTS', message: 'File exists' };
  } catch {
    return { path: filePath, status: 'FAILED', message: 'File not found' };
  }
}

export function verifyResource(resource: CanonicalResource): ResourceVerification {
  const base = { resourceId: resource.id, type: resource.type, name: resource.name };

  if (resource.content === undefined) {
    return { ...base, status: 'RESOURCE_DISCOVERED', message: 'No content to verify' };
  }
  if (resource.content.trim().length === 0) {
    return { ...base, status: 'FAILED', message: 'Content is empty' };
  }
  if (resource.content.includes('[REDACTED]')) {
    return { ...base, status: 'FAILED', message: 'Contains redacted content' };
  }
  return { ...base, status: 'RESOURCE_DISCOVERED', message: 'Present with content' };
}

export async function verifyMigration(
  migrationId: string,
  targetDir: string,
  files: { path: string; expectedHash?: string }[],
  resources: CanonicalResource[]
): Promise<VerificationReport> {
  const fileResults: FileVerification[] = [];
  const resourceResults: ResourceVerification[] = [];
  const warnings: string[] = [];

  for (const file of files) {
    const result = await verifyFile(path.join(targetDir, file.path), file.expectedHash);
    fileResults.push(result);
    if (result.status === 'FAILED') warnings.push(`${file.path}: ${result.message}`);
  }

  for (const resource of resources) {
    const result = verifyResource(resource);
    resourceResults.push(result);
    if (result.status === 'FAILED') warnings.push(`${resource.name}: ${result.message}`);
  }

  return {
    migrationId,
    verifiedAt: new Date().toISOString(),
    success: fileResults.every(f => f.status !== 'FAILED') && resourceResults.every(r => r.status !== 'FAILED'),
    files: fileResults,
    resources: resourceResults,
    warnings
  };
}
