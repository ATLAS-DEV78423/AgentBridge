import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createMigrationPlan, applyMigration, rollbackMigration, MigrationPlan } from '../../../src/core/transaction/manager.js';
import { TargetFile } from '../../../src/core/translate/writer.js';

describe('Transaction Manager', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tx-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('creates migration plan from target files', () => {
    const files: TargetFile[] = [
      { path: 'AGENTS.md', content: '# Test', action: 'create' },
      { path: 'opencode.json', content: '{}', action: 'create' }
    ];
    const plan = createMigrationPlan('claude-code', 'opencode', tmpDir, files);
    expect(plan.id).toBeDefined();
    expect(plan.operations.length).toBe(2);
    expect(plan.source).toBe('claude-code');
  });

  it('applies migration and creates files', async () => {
    const files: TargetFile[] = [
      { path: 'AGENTS.md', content: '# Migrated', action: 'create' }
    ];
    const plan = createMigrationPlan('claude-code', 'opencode', tmpDir, files);
    const result = await applyMigration(plan);
    expect(result.success).toBe(true);
    expect(result.applied).toBe(1);
    const content = await fs.readFile(path.join(tmpDir, 'AGENTS.md'), 'utf-8');
    expect(content).toBe('# Migrated');
  });

  it('creates backup before overwrite', async () => {
    // Create existing file
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# Original');
    const files: TargetFile[] = [
      { path: 'AGENTS.md', content: '# Overwritten', action: 'update' }
    ];
    const plan = createMigrationPlan('claude-code', 'opencode', tmpDir, files);
    const result = await applyMigration(plan);
    expect(result.success).toBe(true);
    // Backup should exist
    const backupPath = path.join(result.backupDir, 'AGENTS.md');
    const backupExists = await fs.access(backupPath).then(() => true).catch(() => false);
    expect(backupExists).toBe(true);
  });

  it('rollback restores original files', async () => {
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# Original');
    const files: TargetFile[] = [
      { path: 'AGENTS.md', content: '# Changed', action: 'update' }
    ];
    const plan = createMigrationPlan('claude-code', 'opencode', tmpDir, files);
    const result = await applyMigration(plan);
    await rollbackMigration(plan, result.backupDir);
    const content = await fs.readFile(path.join(tmpDir, 'AGENTS.md'), 'utf-8');
    expect(content).toBe('# Original');
  });

  it('rollback removes newly created files', async () => {
    const files: TargetFile[] = [
      { path: 'new-file.md', content: 'new', action: 'create' }
    ];
    const plan = createMigrationPlan('claude-code', 'opencode', tmpDir, files);
    const result = await applyMigration(plan);
    await rollbackMigration(plan, result.backupDir);
    const exists = await fs.access(path.join(tmpDir, 'new-file.md')).then(() => true).catch(() => false);
    expect(exists).toBe(false);
  });
});
