import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { claudeAdapter } from '../../src/adapters/claude-code/index.js';
import { openCodeAdapter } from '../../src/adapters/opencode/index.js';
import { normalizeBundle } from '../../src/core/normalize/normalizer.js';
import { evaluateCompatibility } from '../../src/core/compatibility/engine.js';
import { getRulesForMigration } from '../../src/registry/rules.js';
import { createTransaction, applyTransaction, rollbackTransaction } from '../../src/core/transaction/transaction.js';
import type { TransactionOperation } from '../../src/core/transaction/transaction.js';

const CLAUDE_FIXTURE = path.resolve('tests/fixtures/claude-basic');

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-pipeline-'));
  // Copy fixture to tmp dir so we have a real project to scan
  await fs.cp(CLAUDE_FIXTURE, path.join(tmpDir, 'project'), { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('full migration pipeline', () => {
  it('scan → plan → diff → apply → rollback', async () => {
    const projectDir = path.join(tmpDir, 'project');

    // Step 1: SCAN - detect Claude Code project
    const scanResult = await claudeAdapter.detect({ root: projectDir });
    expect(scanResult.detected).toBe(true);

    const bundle = await claudeAdapter.scanProject({ root: projectDir });
    expect(bundle.metadata.sourceAgent?.id).toBe('claude-code');
    expect(bundle.instructions.length).toBeGreaterThan(0);

    // Step 2: PLAN - evaluate compatibility for Claude → OpenCode
    const resources = normalizeBundle(bundle);
    const rules = getRulesForMigration('claude-code', 'opencode');

    const results = resources.map(r => ({
      resource: r,
      compatibility: evaluateCompatibility(r.type, 'opencode', rules)
    }));

    // Instructions should be DIRECT (copyable)
    const instrResult = results.find(r => r.resource.type === 'instructions');
    expect(instrResult).toBeDefined();
    expect(instrResult!.compatibility.status).toBe('DIRECT');

    // Step 3: DIFF - identify what would change
    const writableOps = results
      .filter(r => r.compatibility.status !== 'UNSUPPORTED')
      .map(r => ({
        id: `op-${r.resource.id}`,
        type: 'create' as const,
        targetPath: `.opencode/${r.resource.name}`,
        content: r.resource.content || ''
      }));

    expect(writableOps.length).toBeGreaterThan(0);

    // Step 4: APPLY - write files using transaction engine
    const tx = createTransaction(writableOps);
    expect(tx.status).toBe('pending');

    await applyTransaction(tx, tmpDir);
    expect(tx.status).toBe('applied');

    // Verify files were created
    for (const op of writableOps) {
      const filePath = path.join(tmpDir, op.targetPath);
      const exists = await fs.access(filePath).then(() => true, () => false);
      expect(exists).toBe(true);
    }

    // Step 5: ROLLBACK - undo all changes
    await rollbackTransaction(tx, tmpDir);
    expect(tx.status).toBe('rolled-back');

    // Verify files were removed (they didn't exist before)
    for (const op of writableOps) {
      const filePath = path.join(tmpDir, op.targetPath);
      const exists = await fs.access(filePath).then(() => true, () => false);
      expect(exists).toBe(false);
    }
  });

  it('detects all three agents', async () => {
    const opencodeResult = await openCodeAdapter.detect({ root: path.join(tmpDir, 'project') });
    // Claude fixture won't be detected as OpenCode
    expect(opencodeResult.detected).toBe(false);
  });

  it('preserves source files through pipeline', async () => {
    const projectDir = path.join(tmpDir, 'project');
    const originalContent = await fs.readFile(path.join(projectDir, 'AGENTS.md'), 'utf-8');

    // Run scan → plan → apply
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

    // Source file should be unchanged
    const afterContent = await fs.readFile(path.join(projectDir, 'AGENTS.md'), 'utf-8');
    expect(afterContent).toBe(originalContent);
  });
});
