import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { verifyFile, verifyConfig, verifyResource, verifyMigration } from '../../../src/core/verification/verify.js';
import { CanonicalResource } from '../../../src/core/normalize/normalizer.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'verify-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('verifyFile', () => {
  it('detects existing file', async () => {
    const filePath = path.join(tmpDir, 'test.txt');
    await fs.writeFile(filePath, 'hello');

    const result = await verifyFile(filePath);
    expect(result.status).toBe('FILE_EXISTS');
  });

  it('verifies matching hash', async () => {
    const filePath = path.join(tmpDir, 'test.txt');
    await fs.writeFile(filePath, 'hello');

    const content = await fs.readFile(filePath);
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    const result = await verifyFile(filePath, hash);
    expect(result.status).toBe('FILE_MATCHES');
  });

  it('detects hash mismatch', async () => {
    const filePath = path.join(tmpDir, 'test.txt');
    await fs.writeFile(filePath, 'hello');

    const result = await verifyFile(filePath, 'wrong-hash');
    expect(result.status).toBe('FAILED');
  });

  it('detects missing file', async () => {
    const result = await verifyFile(path.join(tmpDir, 'nonexistent.txt'));
    expect(result.status).toBe('FAILED');
  });
});

describe('verifyConfig', () => {
  it('validates correct JSON', async () => {
    const configPath = path.join(tmpDir, 'config.json');
    await fs.writeFile(configPath, '{"key": "value"}');

    const result = await verifyConfig(configPath, JSON.parse);
    expect(result.status).toBe('CONFIG_PARSES');
  });

  it('detects invalid JSON', async () => {
    const configPath = path.join(tmpDir, 'config.json');
    await fs.writeFile(configPath, 'not json');

    const result = await verifyConfig(configPath, JSON.parse);
    expect(result.status).toBe('FAILED');
  });
});

describe('verifyResource', () => {
  it('validates resource with content', () => {
    const resource: CanonicalResource = {
      id: 'test-1', type: 'instructions', name: 'AGENTS.md', content: '# Test',
      provenance: { sourceAgent: 'test', sourcePath: 'AGENTS.md', scope: 'project', originalHash: 'abc' }
    };

    const result = verifyResource(resource);
    expect(result.status).toBe('RESOURCE_DISCOVERED');
  });

  it('detects empty content', () => {
    const resource: CanonicalResource = {
      id: 'test-1', type: 'instructions', name: 'AGENTS.md', content: '',
      provenance: { sourceAgent: 'test', sourcePath: 'AGENTS.md', scope: 'project', originalHash: 'abc' }
    };

    const result = verifyResource(resource);
    expect(result.status).toBe('FAILED');
  });
});

describe('verifyMigration', () => {
  it('verifies complete migration', async () => {
    const filePath = path.join(tmpDir, 'test.txt');
    await fs.writeFile(filePath, 'content');

    const resources: CanonicalResource[] = [{
      id: 'test-1', type: 'instructions', name: 'AGENTS.md', content: '# Test',
      provenance: { sourceAgent: 'test', sourcePath: 'AGENTS.md', scope: 'project', originalHash: 'abc' }
    }];

    const report = await verifyMigration('test-migration', tmpDir, [{ path: 'test.txt' }], resources);
    expect(report.success).toBe(true);
    expect(report.files.length).toBe(1);
    expect(report.resources.length).toBe(1);
  });

  it('detects failed verification', async () => {
    const resources: CanonicalResource[] = [{
      id: 'test-1', type: 'instructions', name: 'AGENTS.md', content: '',
      provenance: { sourceAgent: 'test', sourcePath: 'AGENTS.md', scope: 'project', originalHash: 'abc' }
    }];

    const report = await verifyMigration('test-migration', tmpDir, [{ path: 'nonexistent.txt' }], resources);
    expect(report.success).toBe(false);
    expect(report.warnings.length).toBeGreaterThan(0);
  });
});
