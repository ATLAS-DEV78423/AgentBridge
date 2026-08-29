import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { claudeAdapter } from '../../src/adapters/claude-code/index.js';
import { openCodeAdapter } from '../../src/adapters/opencode/index.js';
import { kiloAdapter } from '../../src/adapters/kilo/index.js';
import { normalizeBundle } from '../../src/core/normalize/normalizer.js';
import { evaluateCompatibility } from '../../src/core/compatibility/engine.js';
import { getRulesForMigration } from '../../src/registry/rules.js';
import { createTransaction, applyTransaction, rollbackTransaction } from '../../src/core/transaction/transaction.js';
import { exportBundle } from '../../src/core/bundle/export.js';
import { importBundle } from '../../src/core/bundle/import.js';
import { validateBundle } from '../../src/core/bundle/validate.js';
import { verifyMigration } from '../../src/core/verification/verify.js';
import type { TransactionOperation } from '../../src/core/transaction/transaction.js';

const CLAUDE_FIXTURE = path.resolve('tests/fixtures/claude-basic');
const OPENCODE_FIXTURE = path.resolve('tests/fixtures/opencode-basic');
const KILO_FIXTURE = path.resolve('tests/fixtures/kilo-basic');

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-pipeline-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('full migration pipeline', () => {
  it('scan → plan → diff → apply → verify → rollback', async () => {
    const projectDir = path.join(tmpDir, 'project');
    await fs.cp(CLAUDE_FIXTURE, projectDir, { recursive: true });

    // Step 1: SCAN
    const scanResult = await claudeAdapter.detect({ root: projectDir });
    expect(scanResult.detected).toBe(true);

    const bundle = await claudeAdapter.scanProject({ root: projectDir });
    expect(bundle.metadata.sourceAgent?.id).toBe('claude-code');
    expect(bundle.instructions.length).toBeGreaterThan(0);

    // Step 2: PLAN
    const resources = normalizeBundle(bundle);
    const rules = getRulesForMigration('claude-code', 'opencode');
    const results = resources.map(r => ({
      resource: r,
      compatibility: evaluateCompatibility(r.type, 'opencode', rules)
    }));

    const instrResult = results.find(r => r.resource.type === 'instructions');
    expect(instrResult).toBeDefined();
    expect(instrResult!.compatibility.status).toBe('DIRECT');

    // Step 3: DIFF
    const writableOps = results
      .filter(r => r.compatibility.status !== 'UNSUPPORTED')
      .map(r => ({
        id: `op-${r.resource.id}`,
        type: 'create' as const,
        targetPath: `.opencode/${r.resource.name}`,
        content: r.resource.content || ''
      }));

    expect(writableOps.length).toBeGreaterThan(0);

    // Step 4: APPLY
    const tx = createTransaction(writableOps);
    await applyTransaction(tx, tmpDir);
    expect(tx.status).toBe('applied');

    for (const op of writableOps) {
      const filePath = path.join(tmpDir, op.targetPath);
      const exists = await fs.access(filePath).then(() => true, () => false);
      expect(exists).toBe(true);
    }

    // Step 5: VERIFY
    const verifyReport = await verifyMigration(
      'test-migration',
      tmpDir,
      writableOps.map(op => ({ path: op.targetPath })),
      resources.filter(r => evaluateCompatibility(r.type, 'opencode', rules).status !== 'UNSUPPORTED')
    );
    expect(verifyReport.success).toBe(true);
    expect(verifyReport.files.length).toBeGreaterThan(0);

    // Step 6: ROLLBACK
    await rollbackTransaction(tx, tmpDir);
    expect(tx.status).toBe('rolled-back');

    for (const op of writableOps) {
      const filePath = path.join(tmpDir, op.targetPath);
      const exists = await fs.access(filePath).then(() => true, () => false);
      expect(exists).toBe(false);
    }
  });

  it('export → import → validate bundle', async () => {
    const projectDir = path.join(tmpDir, 'project');
    await fs.cp(CLAUDE_FIXTURE, projectDir, { recursive: true });

    // Export bundle
    const bundle = await claudeAdapter.scanProject({ root: projectDir });
    const bundlePath = path.join(tmpDir, 'export.json');
    const exported = await exportBundle(bundle, bundlePath, { redactSecrets: true });

    expect(exported.manifest.schemaVersion).toBe('1.0.0');
    expect(exported.manifest.resourceCount).toBeGreaterThan(0);

    // Validate bundle
    const content = await fs.readFile(bundlePath, 'utf-8');
    const data = JSON.parse(content);
    const validation = validateBundle(data);
    expect(validation.valid).toBe(true);

    // Import bundle
    const imported = await importBundle(bundlePath);
    expect(imported.success).toBe(true);
    expect(imported.bundle).toBeDefined();
    expect(imported.bundle!.metadata.sourceAgent?.id).toBe('claude-code');
  });

  it('detects all three agents correctly', async () => {
    // Claude
    await fs.cp(CLAUDE_FIXTURE, path.join(tmpDir, 'claude'), { recursive: true });
    const claudeResult = await claudeAdapter.detect({ root: path.join(tmpDir, 'claude') });
    expect(claudeResult.detected).toBe(true);
    expect(claudeResult.agent).toBe('claude-code');

    // OpenCode
    await fs.cp(OPENCODE_FIXTURE, path.join(tmpDir, 'opencode'), { recursive: true });
    const openCodeResult = await openCodeAdapter.detect({ root: path.join(tmpDir, 'opencode') });
    expect(openCodeResult.detected).toBe(true);
    expect(openCodeResult.agent).toBe('opencode');

    // Kilo
    await fs.cp(KILO_FIXTURE, path.join(tmpDir, 'kilo'), { recursive: true });
    const kiloResult = await kiloAdapter.detect({ root: path.join(tmpDir, 'kilo') });
    expect(kiloResult.detected).toBe(true);
    expect(kiloResult.agent).toBe('kilo');
  });

  it('preserves source files through entire pipeline', async () => {
    const projectDir = path.join(tmpDir, 'project');
    await fs.cp(CLAUDE_FIXTURE, projectDir, { recursive: true });

    const originalContent = await fs.readFile(path.join(projectDir, 'AGENTS.md'), 'utf-8');

    // Full pipeline
    const bundle = await claudeAdapter.scanProject({ root: projectDir });
    const resources = normalizeBundle(bundle);
    const rules = getRulesForMigration('claude-code', 'opencode');

    const ops: TransactionOperation[] = resources
      .filter(r => evaluateCompatibility(r.type, 'opencode', rules).status !== 'UNSUPPORTED')
      .map(r => ({
        id: `op-${r.id}`,
        type: 'create' as const,
        targetPath: `.opencode/${r.name}`,
        content: r.content || ''
      }));

    const tx = createTransaction(ops);
    await applyTransaction(tx, tmpDir);
    await rollbackTransaction(tx, tmpDir);

    // Source should be unchanged
    const afterContent = await fs.readFile(path.join(projectDir, 'AGENTS.md'), 'utf-8');
    expect(afterContent).toBe(originalContent);
  });

  it('handles empty project gracefully', async () => {
    const emptyDir = path.join(tmpDir, 'empty');
    await fs.mkdir(emptyDir);

    const scanResult = await claudeAdapter.detect({ root: emptyDir });
    expect(scanResult.detected).toBe(false);

    const bundle = await claudeAdapter.scanProject({ root: emptyDir });
    expect(bundle.instructions.length).toBe(0);
    expect(bundle.skills.length).toBe(0);
    expect(bundle.mcpServers.length).toBe(0);
  });

  it('reports correct compatibility for all resource types', async () => {
    const bundle = await claudeAdapter.scanProject({ root: CLAUDE_FIXTURE });
    const resources = normalizeBundle(bundle);
    const rules = getRulesForMigration('claude-code', 'opencode');

    for (const resource of resources) {
      const result = evaluateCompatibility(resource.type, 'opencode', rules);
      expect(result.status).toBeDefined();
      expect(result.method).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.reasons.length).toBeGreaterThan(0);
    }
  });

  it('handles malformed config gracefully', async () => {
    const malformedDir = path.join(tmpDir, 'malformed');
    await fs.mkdir(malformedDir);
    await fs.writeFile(path.join(malformedDir, 'AGENTS.md'), 'test');

    const bundle = await claudeAdapter.scanProject({ root: malformedDir });
    expect(bundle.instructions.length).toBe(1);
    // Should not throw
  });

  it('transaction rollback restores exact original state', async () => {
    const projectDir = path.join(tmpDir, 'project');
    await fs.cp(CLAUDE_FIXTURE, projectDir, { recursive: true });

    // Create a file, modify it, rollback
    const testFile = path.join(tmpDir, 'test.txt');
    await fs.writeFile(testFile, 'original');

    const tx = createTransaction([{
      id: 'op-1',
      type: 'modify',
      targetPath: 'test.txt',
      content: 'modified'
    }]);

    await applyTransaction(tx, tmpDir);
    expect(await fs.readFile(testFile, 'utf-8')).toBe('modified');

    await rollbackTransaction(tx, tmpDir);
    expect(await fs.readFile(testFile, 'utf-8')).toBe('original');
  });

  it('bundle export/import round-trip preserves data', async () => {
    const projectDir = path.join(tmpDir, 'project');
    await fs.cp(CLAUDE_FIXTURE, projectDir, { recursive: true });

    const bundle = await claudeAdapter.scanProject({ root: projectDir });
    const bundlePath = path.join(tmpDir, 'bundle.json');
    await exportBundle(bundle, bundlePath);

    const imported = await importBundle(bundlePath);
    expect(imported.success).toBe(true);

    // Verify data preserved
    expect(imported.bundle!.instructions.length).toBe(bundle.instructions.length);
    expect(imported.bundle!.metadata.sourceAgent?.id).toBe('claude-code');
  });
});
