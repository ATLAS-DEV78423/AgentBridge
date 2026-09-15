import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

describe('cli doctor', () => {
  it('exits 0 and reports OK on a healthy project', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-docok-'));
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# Rules');
    await fs.writeFile(path.join(tmpDir, '.mcp.json'), JSON.stringify({ mcpServers: { fs: { command: 'npx', args: ['-y', 'fs'] } } }));

    const { stdout } = await run('npx', ['tsx', 'src/cli/main.ts', 'doctor', tmpDir], { cwd: path.resolve('.') });
    expect(stdout).toContain('grok');
    expect(stdout).toContain('config OK');
    expect(stdout).toContain('0 error(s)');
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('exits 1 and names the offending file on a broken config', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-docbad-'));
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# Rules');
    await fs.writeFile(path.join(tmpDir, '.claude', 'settings.json'), '{ "model": "m", }').catch(async () => {
      await fs.mkdir(path.join(tmpDir, '.claude'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, '.claude', 'settings.json'), '{ "model": "m", }');
    });

    let failed: { code: number; stdout: string } | undefined;
    try {
      await run('npx', ['tsx', 'src/cli/main.ts', 'doctor', tmpDir], { cwd: path.resolve('.') });
    } catch (err: unknown) {
      const e = err as { code: number; stdout: string };
      failed = { code: e.code, stdout: e.stdout };
    }

    expect(failed).toBeDefined();
    expect(failed!.code).toBe(1);
    expect(failed!.stdout).toContain('.claude/settings.json');
    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
