import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runCli } from './run-cli';

describe('cli fix', () => {
  it('rewrites a commented config in place and prints the rollback command', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-fix-'));
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# Rules');
    await fs.mkdir(path.join(tmpDir, '.claude'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.claude', 'settings.json'), '{\n  // note\n  "model": "m",\n}');

    const { stdout } = await runCli(['fix', tmpDir]);

    expect(stdout).toContain('.claude/settings.json');
    expect(stdout).toContain('Rollback: agent-migrate rollback');
    const after = JSON.parse(await fs.readFile(path.join(tmpDir, '.claude', 'settings.json'), 'utf-8'));
    expect(after).toEqual({ model: 'm' });
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('exits 1 listing human-decision problems when nothing is auto-fixable', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-fix2-'));
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# Rules');
    await fs.writeFile(path.join(tmpDir, '.crush.json'), JSON.stringify({ mcp: { fs: { command: 'npx' } } }));

    const failed = await runCli(['fix', tmpDir]);

    expect(failed.code).toBe(1);
    expect(failed.stdout).toContain('human');
    expect(failed.stdout).toContain('type');
    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
