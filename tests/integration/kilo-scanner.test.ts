import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { kiloAdapter } from '../../src/adapters/kilo/index.js';

describe('Kilo Scanner', () => {
  let fixtureDir: string;

  beforeEach(async () => {
    fixtureDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kilo-test-'));
    await fs.cp(
      path.join(import.meta.dirname, '../fixtures/kilo-basic'),
      fixtureDir,
      { recursive: true }
    );
  });

  afterEach(async () => {
    await fs.rm(fixtureDir, { recursive: true, force: true });
  });

  describe('detect', () => {
    it('detects Kilo project', async () => {
      const result = await kiloAdapter.detect({ root: fixtureDir });
      expect(result.detected).toBe(true);
      expect(result.agent).toBe('kilo');
      expect(result.confidence).toBe('high');
    });

    it('does not detect agent in empty directory', async () => {
      const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'empty-test-'));
      const result = await kiloAdapter.detect({ root: emptyDir });
      expect(result.detected).toBe(false);
      await fs.rm(emptyDir, { recursive: true, force: true });
    });
  });

  describe('scanProject', () => {
    it('finds instructions', async () => {
      const state = await kiloAdapter.scanProject({ root: fixtureDir });
      expect(state.instructions.length).toBeGreaterThan(0);
    });

    it('parses .kilo/config.json', async () => {
      const state = await kiloAdapter.scanProject({ root: fixtureDir });
      expect(state.opaque.length).toBeGreaterThan(0);
    });

    it('preserves file hashes', async () => {
      const state = await kiloAdapter.scanProject({ root: fixtureDir });
      for (const resource of state.instructions) {
        expect(resource.provenance.originalHash).toMatch(/^[a-f0-9]{64}$/);
      }
    });
  });
});
