import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { claudeAdapter } from '../../src/adapters/claude-code/index.js';

describe('Claude Scanner', () => {
  let fixtureDir: string;

  beforeEach(async () => {
    fixtureDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-test-'));
    await fs.cp(
      path.join(import.meta.dirname, '../fixtures/claude-basic'),
      fixtureDir,
      { recursive: true }
    );
  });

  afterEach(async () => {
    await fs.rm(fixtureDir, { recursive: true, force: true });
  });

  describe('detect', () => {
    it('detects Claude Code project', async () => {
      const result = await claudeAdapter.detect({ root: fixtureDir });
      expect(result.detected).toBe(true);
      expect(result.agent).toBe('claude-code');
    });

    it('does not detect agent in empty directory', async () => {
      const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'empty-test-'));
      const result = await claudeAdapter.detect({ root: emptyDir });
      expect(result.detected).toBe(false);
      await fs.rm(emptyDir, { recursive: true, force: true });
    });
  });

  describe('scanProject', () => {
    it('finds instructions', async () => {
      const state = await claudeAdapter.scanProject({ root: fixtureDir });
      expect(state.instructions.length).toBeGreaterThan(0);
    });

    it('deterministic output for same fixture', async () => {
      const state1 = await claudeAdapter.scanProject({ root: fixtureDir });
      const state2 = await claudeAdapter.scanProject({ root: fixtureDir });
      expect(state1.instructions.length).toBe(state2.instructions.length);
    });
  });
});
