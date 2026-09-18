import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const repo = path.resolve('.');

async function runCli(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await run('npx', ['tsx', 'src/cli/main.ts', ...args], { cwd: repo });
    return { code: 0, stdout, stderr };
  } catch (err: unknown) {
    const e = err as { code: number; stdout: string; stderr: string };
    return { code: e.code, stdout: e.stdout, stderr: e.stderr };
  }
}

/** The migration id migrate prints as the last segment of the backup dir path. */
function txIdOf(stdout: string): string {
  const match = stdout.match(/\.agentbridge\/backups\/([0-9a-f-]{36})/);
  if (!match) throw new Error(`no migration id in output:\n${stdout}`);
  return match[1];
}

describe('cli rollback', () => {
  it('undoes a migration: deletes created files, restores overwritten ones byte-for-byte', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-rollback-'));
    await fs.writeFile(path.join(dir, 'AGENTS.md'), '# Rules\n');
    await fs.mkdir(path.join(dir, '.claude'), { recursive: true });
    await fs.writeFile(
      path.join(dir, '.claude', 'settings.json'),
      JSON.stringify({ model: 'm1', mcpServers: { fs: { command: 'echo-server' } } }),
    );
    // A target config the user already owns, with keys the migration must keep.
    await fs.mkdir(path.join(dir, '.gemini'), { recursive: true });
    const original = '{\n  "model": "user-choice",\n  "mcpServers": { "keepme": { "command": "keep" } }\n}';
    await fs.writeFile(path.join(dir, '.gemini', 'settings.json'), original);

    const mig = await runCli(['migrate', 'claude-code', 'gemini', dir]);
    expect(mig.code).toBe(0);
    // migrated: user keys survive the merge, the source's server arrived, instructions created
    const merged = await fs.readFile(path.join(dir, '.gemini', 'settings.json'), 'utf-8');
    expect(merged).toContain('user-choice');
    expect(merged).toContain('keepme');
    expect(merged).toContain('echo-server');
    await expect(fs.access(path.join(dir, 'GEMINI.md'))).resolves.toBeUndefined();

    const rb = await runCli(['rollback', dir, txIdOf(mig.stdout)]);
    expect(rb.code).toBe(0);

    // the overwritten config is byte-for-byte the original again
    expect(await fs.readFile(path.join(dir, '.gemini', 'settings.json'), 'utf-8')).toBe(original);
    // and the file the migration created is gone
    await expect(fs.access(path.join(dir, 'GEMINI.md'))).rejects.toThrow();

    await fs.rm(dir, { recursive: true, force: true });
  });

  it('exits 1 for an unknown migration id instead of pretending it rolled back', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-rollback2-'));

    const { code, stderr } = await runCli(['rollback', dir, 'not-a-real-id']);

    expect(code).toBe(1);
    expect(stderr).toMatch(/not-a-real-id/);
    await fs.rm(dir, { recursive: true, force: true });
  });
});