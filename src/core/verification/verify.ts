import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { FileVerification, ResourceVerification, VerificationReport, VerificationStatus } from './types.js';
import { CanonicalResource } from '../normalize/normalizer.js';

export async function verifyFile(
  filePath: string,
  expectedHash?: string
): Promise<FileVerification> {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      return {
        path: filePath,
        status: 'FAILED',
        message: 'Path exists but is not a file'
      };
    }

    if (expectedHash) {
      const content = await fs.readFile(filePath);
      const actualHash = crypto.createHash('sha256').update(content).digest('hex');

      if (actualHash === expectedHash) {
        return {
          path: filePath,
          status: 'FILE_MATCHES',
          expectedHash,
          actualHash,
          message: 'File hash matches expected'
        };
      } else {
        return {
          path: filePath,
          status: 'FAILED',
          expectedHash,
          actualHash,
          message: `Hash mismatch: expected ${expectedHash.slice(0, 12)}..., got ${actualHash.slice(0, 12)}...`
        };
      }
    }

    return {
      path: filePath,
      status: 'FILE_EXISTS',
      message: 'File exists'
    };
  } catch {
    return {
      path: filePath,
      status: 'FAILED',
      message: 'File not found'
    };
  }
}

export async function verifyConfig(
  configPath: string,
  parser: (content: string) => unknown
): Promise<FileVerification> {
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    parser(content);
    return {
      path: configPath,
      status: 'CONFIG_PARSES',
      message: 'Config file parses successfully'
    };
  } catch (err) {
    return {
      path: configPath,
      status: 'FAILED',
      message: `Config parse failed: ${(err as Error).message}`
    };
  }
}

export function verifyResource(resource: CanonicalResource): ResourceVerification {
  if (resource.content === undefined) {
    return {
      resourceId: resource.id,
      type: resource.type,
      name: resource.name,
      status: 'RESOURCE_DISCOVERED',
      message: 'Resource exists (no content to verify)'
    };
  }

  // Basic validation: check content is non-empty
  if (resource.content.trim().length === 0) {
    return {
      resourceId: resource.id,
      type: resource.type,
      name: resource.name,
      status: 'FAILED',
      message: 'Resource content is empty'
    };
  }

  // Check for suspicious content
  if (resource.content.includes('[REDACTED]')) {
    return {
      resourceId: resource.id,
      type: resource.type,
      name: resource.name,
      status: 'FAILED',
      message: 'Resource contains redacted content'
    };
  }

  return {
    resourceId: resource.id,
    type: resource.type,
    name: resource.name,
    status: 'RESOURCE_DISCOVERED',
    message: 'Resource present with content'
  };
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

  // Verify files
  for (const file of files) {
    const fullPath = path.join(targetDir, file.path);
    const result = await verifyFile(fullPath, file.expectedHash);
    fileResults.push(result);

    if (result.status === 'FAILED') {
      warnings.push(`File verification failed: ${file.path} - ${result.message}`);
    }
  }

  // Verify resources
  for (const resource of resources) {
    const result = verifyResource(resource);
    resourceResults.push(result);

    if (result.status === 'FAILED') {
      warnings.push(`Resource verification failed: ${resource.name} - ${result.message}`);
    }
  }

  const success = fileResults.every(f => f.status !== 'FAILED') &&
    resourceResults.every(r => r.status !== 'FAILED');

  return {
    migrationId,
    verifiedAt: new Date().toISOString(),
    success,
    files: fileResults,
    resources: resourceResults,
    warnings
  };
}
