import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { exportBundle } from '../../../src/core/bundle/export.js';
import { importBundle } from '../../../src/core/bundle/import.js';
import { validateBundle } from '../../../src/core/bundle/validate.js';
import { AgentBundle } from '../../../src/core/model/types.js';

const MOCK_BUNDLE: AgentBundle = {
  schemaVersion: '1.0.0',
  metadata: {
    name: 'test-project',
    sourceAgent: { id: 'claude-code', name: 'Claude Code' },
    sourceRoot: '/test/project'
  },
  instructions: [{
    id: 'inst-1', type: 'instructions', name: 'AGENTS.md', content: '# Instructions',
    provenance: { sourceAgent: 'claude-code', sourcePath: 'AGENTS.md', scope: 'project', originalHash: 'abc' }
  }],
  skills: [],
  commands: [],
  agents: [],
  mcpServers: [],
  permissions: [],
  hooks: [],
  opaque: []
};

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bundle-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('bundle export', () => {
  it('exports bundle to file', async () => {
    const outputPath = path.join(tmpDir, 'test.bundle.json');
    const result = await exportBundle(MOCK_BUNDLE, outputPath);

    expect(result.manifest.schemaVersion).toBe('1.0.0');
    expect(result.manifest.sourceAgent).toBe('claude-code');
    expect(result.manifest.resourceCount).toBe(1);
    expect(result.manifest.checksum).toBeDefined();

    const content = await fs.readFile(outputPath, 'utf-8');
    expect(content).toContain('AGENTS.md');
  });

  it('calculates correct checksum', async () => {
    const outputPath = path.join(tmpDir, 'test.bundle.json');
    const result = await exportBundle(MOCK_BUNDLE, outputPath);

    const content = await fs.readFile(outputPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.manifest.checksum).toBe(result.manifest.checksum);
  });

  it('redacts secrets when option enabled', async () => {
    const bundleWithSecret: AgentBundle = {
      ...MOCK_BUNDLE,
      mcpServers: [{
        id: 'mcp-1', type: 'mcpServers', name: 'api',
        content: '{"apiKey": "sk-123456"}',
        provenance: { sourceAgent: 'claude-code', sourcePath: 'config', scope: 'project', originalHash: 'def' }
      }]
    };

    const outputPath = path.join(tmpDir, 'redacted.bundle.json');
    await exportBundle(bundleWithSecret, outputPath, { redactSecrets: true });

    const content = await fs.readFile(outputPath, 'utf-8');
    expect(content).toContain('[REDACTED]');
    expect(content).not.toContain('sk-123456');
  });
});

describe('bundle validation', () => {
  it('validates correct bundle', async () => {
    const outputPath = path.join(tmpDir, 'test.bundle.json');
    await exportBundle(MOCK_BUNDLE, outputPath);

    const content = await fs.readFile(outputPath, 'utf-8');
    const data = JSON.parse(content);

    const result = validateBundle(data);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('rejects invalid format', () => {
    const result = validateBundle(null);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects corrupted checksum', async () => {
    const outputPath = path.join(tmpDir, 'test.bundle.json');
    await exportBundle(MOCK_BUNDLE, outputPath);

    const content = await fs.readFile(outputPath, 'utf-8');
    const data = JSON.parse(content);
    data.manifest.checksum = 'invalid';

    const result = validateBundle(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Checksum'))).toBe(true);
  });
});

describe('bundle import', () => {
  it('imports valid bundle', async () => {
    const outputPath = path.join(tmpDir, 'test.bundle.json');
    await exportBundle(MOCK_BUNDLE, outputPath);

    const result = await importBundle(outputPath);
    expect(result.success).toBe(true);
    expect(result.bundle).toBeDefined();
    expect(result.bundle!.metadata.sourceAgent?.id).toBe('claude-code');
  });

  it('rejects invalid JSON', async () => {
    const outputPath = path.join(tmpDir, 'invalid.json');
    await fs.writeFile(outputPath, 'not json');

    const result = await importBundle(outputPath);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('Invalid JSON'))).toBe(true);
  });

  it('rejects missing file', async () => {
    const result = await importBundle(path.join(tmpDir, 'nonexistent.json'));
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
