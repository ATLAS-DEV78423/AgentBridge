import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

describe('cli fix', () => {
  it('rewrites a commented config in place and prints the rollback command', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-fix-'));
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# Rules');
    await fs.mkdir(path.join(tmpDir, '.claude'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.claude', 'settings.json'), '{\n  // note\n  "model": "m",\n}');

    const { stdout } = await run('npx', ['tsx', 'src/cli/main.ts', 'fix', tmpDir], { cwd: path.resolve('.') });

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

    let failed: { code: number; stdout: string } | undefined;
    try {
      await run('npx', ['tsx', 'src/cli/main.ts', 'fix', tmpDir], { cwd: path.resolve('.') });
    } catch (err: unknown) {
      const e = err as { code: number; stdout: string };
      failed = { code: e.code, stdout: e.stdout };
    }

    expect(failed).toBeDefined();
    expect(failed!.code).toBe(1);
    expect(failed!.stdout).toContain('human');
    expect(failed!.stdout).toContain('type');
    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
