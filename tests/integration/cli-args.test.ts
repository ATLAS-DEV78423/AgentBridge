import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runCli } from './run-cli';

describe('careless-argument handling (playtest findings)', () => {
  it('migrate --dry-run before the path is a flag, not a directory', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-args-'));
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# Rules');
    await fs.mkdir(path.join(tmpDir, '.claude'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.claude', 'settings.json'), JSON.stringify({ mcpServers: { fs: { command: 'npx' } } }));

    const { code, stdout, stderr } = await runCli(['migrate', 'claude-code', 'grok', '--dry-run']);
    expect(code).toBe(0);
    expect(stderr).not.toMatch(/not found/i);
    // the flag must not have shifted the path positional: the default '.' is scanned,
    // which is this repo — its AGENTS.md is a real claude-code resource.
    expect(stdout).toMatch(/AGENTS\.md/);
    await expect(fs.access(path.join(tmpDir, '.mcp.json'))).rejects.toThrow();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('a nonexistent project path is an error, not a silent empty migration', async () => {
    const { code, stderr } = await runCli(['migrate', 'claude-code', 'grok', '/nope/nope']);
    expect(code).toBe(1);
    expect(stderr).toMatch(/Project path not found/i);
  });

  it('self-migration is rejected with a clear message', async () => {
    const { code, stderr } = await runCli(['migrate', 'claude-code', 'claude-code']);
    expect(code).toBe(2);
    expect(stderr).toMatch(/same agent/i);
  });

  it('an unknown target names the agent and the supported list', async () => {
    const { code, stderr } = await runCli(['migrate', 'claude-code', 'windsurf']);
    expect(code).toBe(1);
    expect(stderr).toMatch(/windsurf/);
    expect(stderr).toMatch(/Supported agents:/);
    expect(stderr).toMatch(/kilo/); // the list is the real, registry-derived one
  });

  it('migrate-all rejects an unknown source with the agent list on stderr', async () => {
    const { code, stderr } = await runCli(['migrate-all', 'windsurf']);
    expect(code).toBe(1);
    expect(stderr).toMatch(/windsurf/);
    expect(stderr).toMatch(/kilo/); // registry-derived list, on stderr so a pipe can't drop it
  });

  it('help works as a bare subcommand, not just a flag', async () => {
    const { code, stdout } = await runCli(['help']);
    expect(code).toBe(0);
    expect(stdout).toMatch(/Commands:/);
    expect(stdout).not.toMatch(/Unknown command/);
  });
});

describe('honest feedback (silent-empty findings)', () => {
  const seedProject = async (config: string): Promise<string> => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-honest-'));
    await fs.mkdir(path.join(dir, '.claude'), { recursive: true });
    await fs.writeFile(path.join(dir, '.claude', 'settings.json'), config);
    return dir;
  };

  it('migrate warns instead of silently dropping a corrupt source config', async () => {
    const dir = await seedProject('{ broken json here');
    const { code, stdout } = await runCli(['migrate', 'claude-code', 'grok', dir]);
    expect(code).toBe(0); // the migration still completes for what it could read
    expect(stdout).toMatch(/agent-migrate doctor/);
    expect(stdout).toMatch(/settings\.json/);
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('migrate on a healthy project stays free of config warnings', async () => {
    const dir = await seedProject(JSON.stringify({ mcpServers: { fs: { command: 'npx' } } }));
    const { stdout } = await runCli(['migrate', 'claude-code', 'grok', dir]);
    expect(stdout).not.toMatch(/⚠/);
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('plan validates its target against the real agent list', async () => {
    const { code, stderr } = await runCli(['plan', 'claude-code', 'windsurf']);
    expect(code).toBe(1);
    expect(stderr).toMatch(/windsurf/);
    expect(stderr).toMatch(/kilo/); // stale list had only claude-code, opencode, kilo… and was missing the rest
  });

  it('diff rejects an unknown target instead of reporting nothing to do', async () => {
    const { code, stderr } = await runCli(['diff', 'claude-code', 'windsurf']);
    expect(code).toBe(1);
    expect(stderr).toMatch(/windsurf/);
  });

  it('scan shows the agent id, not just the display name', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-scanid-'));
    await fs.mkdir(path.join(dir, '.claude'), { recursive: true });
    await fs.writeFile(path.join(dir, '.claude', 'settings.json'), JSON.stringify({ mcpServers: { fs: { command: 'npx' } } }));
    const { stdout } = await runCli(['scan', dir]);
    expect(stdout).toMatch(/Claude Code/);
    expect(stdout).toMatch(/claude-code/); // the id every other command requires
    await fs.rm(dir, { recursive: true, force: true });
  });
});
