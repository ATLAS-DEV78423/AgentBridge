import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { executeMigrateAll } from '../../../src/cli/commands/migrate-all.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-migrate-all-'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function seedClaudeProject(): Promise<void> {
  await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# Rules');
  await fs.mkdir(path.join(tmpDir, '.claude'), { recursive: true });
  await fs.writeFile(path.join(tmpDir, '.claude', 'settings.json'), JSON.stringify({ model: 'm' }));
}

describe('executeMigrateAll', () => {
  it('syncs the source config to every other detected agent (and only those)', async () => {
    await seedClaudeProject();
    await fs.mkdir(path.join(tmpDir, '.cursor'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.cursor', 'mcp.json'), '{}');

    const results = await executeMigrateAll('claude-code', tmpDir);

    expect(Object.keys(results).sort()).toEqual(['cursor']);
    expect(results.cursor.txId).toBeTruthy();
    expect(results.cursor.fileCount).toBeGreaterThan(0);
  });


  it('dry run plans every target but writes nothing', async () => {
    await seedClaudeProject();
    await fs.mkdir(path.join(tmpDir, '.cursor'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.cursor', 'mcp.json'), '{}');

    const results = await executeMigrateAll('claude-code', tmpDir, true);

    expect(Object.keys(results).sort()).toEqual(['cursor']);
    for (const r of Object.values(results)) {
      expect(r.txId).toBeNull();
      expect(r.fileCount).toBeGreaterThan(0);
    }
    expect(await fs.readFile(path.join(tmpDir, '.cursor', 'mcp.json'), 'utf-8')).toBe('{}');
  });

  it('returns empty and says so when only the source is present', async () => {
    await seedClaudeProject();

    const results = await executeMigrateAll('claude-code', tmpDir);

    expect(results).toEqual({});
  });
});
