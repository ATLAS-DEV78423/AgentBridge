import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { claudeAdapter } from '../../src/adapters/claude-code/index.js';
import { normalizeBundle } from '../../src/core/normalize/normalizer.js';
import { evaluateCompatibility } from '../../src/core/compatibility/engine.js';
import { getRulesForMigration } from '../../src/registry/rules.js';

describe('Normalization Integration', () => {
  let fixtureDir: string;

  beforeEach(async () => {
    fixtureDir = await fs.mkdtemp(path.join(os.tmpdir(), 'norm-test-'));
    await fs.cp(path.join(import.meta.dirname, '../fixtures/claude-basic'), fixtureDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(fixtureDir, { recursive: true, force: true });
  });

  it('scan -> normalize -> compat pipeline', async () => {
    const bundle = await claudeAdapter.scanProject({ root: fixtureDir });
    expect(bundle.instructions.length).toBeGreaterThan(0);

    const resources = normalizeBundle(bundle);
    expect(resources.length).toBeGreaterThan(0);

    const rules = getRulesForMigration('claude-code', 'opencode');
    const results = resources.map(r => evaluateCompatibility(r.type, 'opencode', rules));
    expect(results.length).toBe(resources.length);
    expect(results[0].status).toBeDefined();
  });
});
