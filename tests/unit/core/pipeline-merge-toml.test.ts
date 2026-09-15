import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { migratePipeline } from '../../../src/core/pipeline.js';
import '../../../src/adapters/registry.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-merge-toml-'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('pipeline merge for non-JSON targets', () => {
  it('merges into an existing codex config.toml, preserving user keys', async () => {
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# Rules');
    await fs.mkdir(path.join(tmpDir, '.claude'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.claude', 'settings.json'), JSON.stringify({ model: 'm2', permissions: {} }));
    await fs.mkdir(path.join(tmpDir, '.codex'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.codex', 'config.toml'), 'sandbox = true\n\n[mcp_servers.user_server]\ncommand = "user-cmd"\n');

    const { txId } = await migratePipeline('claude-code', 'codex', tmpDir);
    expect(txId).toBeTruthy();

    const merged = await fs.readFile(path.join(tmpDir, '.codex', 'config.toml'), 'utf-8');
    expect(merged).toContain('sandbox = true');
    expect(merged).toContain('model = "m2"');
    expect(merged).toContain('[mcp_servers.user_server]');
  });

  it('merges into an existing commented .json target (crush), preserving user keys', async () => {
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# Rules');
    await fs.mkdir(path.join(tmpDir, '.claude'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.claude', 'settings.json'), JSON.stringify({ mcpServers: { fs: { command: 'npx', args: ['-y', 'fs'] } } }));
    await fs.writeFile(path.join(tmpDir, '.crush.json'), '{\n  // hand-edited\n  "theme": "dark",\n  "mcp": { "mine": { "command": "u", "type": "stdio" } },\n}');

    const { txId } = await migratePipeline('claude-code', 'crush', tmpDir);
    expect(txId).toBeTruthy();

    const merged = JSON.parse(await fs.readFile(path.join(tmpDir, '.crush.json'), 'utf-8'));
    expect(merged.theme).toBe('dark');            // user key survived comment-tolerant merge
    expect(merged.mcp.mine).toBeDefined();        // user server survived
    expect(merged.mcp.fs).toBeDefined();          // migrated server landed
  });

  it('merges into an existing kilo.jsonc with comments, preserving them-stripped content and user keys', async () => {
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# Rules');
    await fs.mkdir(path.join(tmpDir, '.claude'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.claude', 'settings.json'), JSON.stringify({ model: 'm2' }));
    await fs.mkdir(path.join(tmpDir, '.kilo'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.kilo', 'kilo.jsonc'), '{\n  // user note\n  "theme": "dark",\n}');

    const { txId } = await migratePipeline('claude-code', 'kilo', tmpDir);
    expect(txId).toBeTruthy();

    const merged = JSON.parse(await fs.readFile(path.join(tmpDir, '.kilo', 'kilo.jsonc'), 'utf-8'));
    expect(merged.theme).toBe('dark');
    expect(merged.model).toBe('m2');
  });
});
