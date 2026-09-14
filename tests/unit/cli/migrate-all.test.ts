import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { executeMigrateAll } from '../../../src/cli/commands/migrate-all.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-migrate-all-'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function seedMultiAgentProject(): Promise<void> {
  await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# Rules');
  await fs.mkdir(path.join(tmpDir, '.claude'), { recursive: true });
  await fs.writeFile(path.join(tmpDir, '.claude', 'settings.json'), JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    mcpServers: { fs: { command: 'npx', args: ['-y', 'fs-mcp'] } },
  }));
  await fs.mkdir(path.join(tmpDir, '.cursor'), { recursive: true });
  await fs.writeFile(path.join(tmpDir, '.cursor', 'mcp.json'), '{}');
  await fs.mkdir(path.join(tmpDir, '.kilo'), { recursive: true });
  await fs.writeFile(path.join(tmpDir, '.kilo', 'kilo.jsonc'), '{}');
  await fs.mkdir(path.join(tmpDir, '.gemini'), { recursive: true });
  await fs.writeFile(path.join(tmpDir, '.gemini', 'settings.json'), '{}');
}

describe('executeMigrateAll', () => {
  it('syncs the source config to every other detected agent (and only those)', async () => {
    await seedMultiAgentProject();

    const results = await executeMigrateAll('claude-code', tmpDir);

    // opencode is not detected → not a target
    expect(Object.keys(results).sort()).toEqual(['cursor', 'gemini', 'kilo']);
    for (const r of Object.values(results)) {
      expect(r.txId).toBeTruthy();
      expect(r.fileCount).toBeGreaterThan(0);
    }

    // cursor gets the stdio type added
    const cursor = JSON.parse(await fs.readFile(path.join(tmpDir, '.cursor', 'mcp.json'), 'utf-8'));
    expect(cursor.mcpServers.fs).toEqual({ type: 'stdio', command: 'npx', args: ['-y', 'fs-mcp'] });

    // gemini gets GEMINI.md + type-less servers
    await fs.access(path.join(tmpDir, 'GEMINI.md'));
    const gemini = JSON.parse(await fs.readFile(path.join(tmpDir, '.gemini', 'settings.json'), 'utf-8'));
    expect(gemini.mcpServers.fs).toEqual({ command: 'npx', args: ['-y', 'fs-mcp'] });

    // kilo gets model + local-format servers
    const kilo = JSON.parse(await fs.readFile(path.join(tmpDir, '.kilo', 'kilo.jsonc'), 'utf-8'));
    expect(kilo.model).toBe('claude-sonnet-4-20250514');
    expect(kilo.mcp.fs).toEqual({ type: 'local', command: ['npx', '-y', 'fs-mcp'] });
  });

  it('dry run plans every target but writes nothing', async () => {
    await seedMultiAgentProject();

    const results = await executeMigrateAll('claude-code', tmpDir, true);

    expect(Object.keys(results).sort()).toEqual(['cursor', 'gemini', 'kilo']);
    for (const r of Object.values(results)) {
      expect(r.txId).toBeNull();
      expect(r.fileCount).toBeGreaterThan(0);
    }
    // pre-existing placeholder untouched
    expect(await fs.readFile(path.join(tmpDir, '.cursor', 'mcp.json'), 'utf-8')).toBe('{}');
    await expect(fs.access(path.join(tmpDir, 'GEMINI.md'))).rejects.toThrow();
  });

  it('returns empty and says so when only the source is present', async () => {
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# Rules');
    await fs.mkdir(path.join(tmpDir, '.claude'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.claude', 'settings.json'), '{}');

    const results = await executeMigrateAll('claude-code', tmpDir);

    expect(results).toEqual({});
  });
});
