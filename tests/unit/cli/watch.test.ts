import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { executeWatch } from '../../../src/cli/commands/watch.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-watch-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('watch command', () => {
  it('exits with error for unknown source agent', async () => {
    await expect(
      executeWatch('unknown-agent', 'opencode', tmpDir)
    ).rejects.toThrow();
  });

  it('exits with error for unknown target agent', async () => {
    // Create a minimal Claude config so source detection works
    await fs.mkdir(path.join(tmpDir, '.claude'), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, '.claude/settings.json'),
      JSON.stringify({ model: 'test' })
    );

    await expect(
      executeWatch('claude-code', 'unknown-target', tmpDir)
    ).rejects.toThrow();
  });

  it('exits with error when no source config files found', async () => {
    await expect(
      executeWatch('claude-code', 'opencode', tmpDir)
    ).rejects.toThrow();
  });
});
