import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { migratePipeline } from '../../src/core/pipeline.js';
import { adapters } from '../../src/adapters/registry.js'; // registers writers

const FIXTURES = path.resolve('tests/fixtures');

let tmpDir: string;
beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-pipeline-'));
});
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function copyFixture(name: string): Promise<string> {
  const dir = path.join(tmpDir, name);
  await fs.cp(path.join(FIXTURES, name), dir, { recursive: true });
  return dir;
}

describe('migratePipeline directions', () => {
  it('migrates claude-code → opencode', async () => {
    const dir = await copyFixture('claude-basic');
    const { txId, fileCount } = await migratePipeline('claude-code', 'opencode', dir);
    expect(txId).toBeTruthy();
    expect(fileCount).toBeGreaterThan(0);
    const oc = JSON.parse(await fs.readFile(path.join(dir, 'opencode.json'), 'utf-8'));
    expect(oc.model).toBe('claude-sonnet-4-20250514');
  });

  it('migrates claude-code → kilo (previously unimplemented)', async () => {
    const dir = await copyFixture('claude-basic');
    const { txId } = await migratePipeline('claude-code', 'kilo', dir);
    expect(txId).toBeTruthy();
    const kilo = JSON.parse(await fs.readFile(path.join(dir, '.kilo', 'kilo.jsonc'), 'utf-8'));
    expect(kilo.model).toBe('claude-sonnet-4-20250514');
  });

  it('migrates opencode → claude-code (reverse)', async () => {
    const dir = await copyFixture('opencode-basic');
    const { txId } = await migratePipeline('opencode', 'claude-code', dir);
    expect(txId).toBeTruthy();
    const settings = JSON.parse(await fs.readFile(path.join(dir, '.claude', 'settings.json'), 'utf-8'));
    expect(settings.model).toBe('claude-sonnet-4-20250514');
    // OpenCode's explicit stdio type is dropped for Claude
    expect(settings.mcpServers.filesystem).toEqual({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
    });
  });

  it('migrates kilo → claude-code (reverse)', async () => {
    const dir = await copyFixture('kilo-basic');
    const { txId } = await migratePipeline('kilo', 'claude-code', dir);
    expect(txId).toBeTruthy();
    const settings = JSON.parse(await fs.readFile(path.join(dir, '.claude', 'settings.json'), 'utf-8'));
    expect(settings.model).toBe('claude-sonnet-4-20250514');
    expect(settings.systemPrompt).toBeUndefined();
  });

  it('opencode → kilo works, translating mcpServers to kilo local format', async () => {
    const dir = await copyFixture('opencode-basic');
    const { txId } = await migratePipeline('opencode', 'kilo', dir);
    expect(txId).toBeTruthy();
    const kilo = JSON.parse(await fs.readFile(path.join(dir, '.kilo', 'kilo.jsonc'), 'utf-8'));
    expect(kilo.model).toBe('claude-sonnet-4-20250514');
    expect(kilo.mcp.filesystem).toEqual({
      type: 'local',
      command: ['npx', '-y', '@modelcontextprotocol/server-filesystem', '.'],
    });
  });

  it('kilo → opencode works', async () => {
    const dir = await copyFixture('kilo-basic');
    const { txId } = await migratePipeline('kilo', 'opencode', dir);
    expect(txId).toBeTruthy();
    const oc = JSON.parse(await fs.readFile(path.join(dir, 'opencode.json'), 'utf-8'));
    expect(oc.model).toBe('claude-sonnet-4-20250514');
  });

  it('migrates cursor → claude-code (reverse, mcp translation)', async () => {
    const dir = await copyFixture('cursor-basic');
    const { txId } = await migratePipeline('cursor', 'claude-code', dir);
    expect(txId).toBeTruthy();
    const settings = JSON.parse(await fs.readFile(path.join(dir, '.claude', 'settings.json'), 'utf-8'));
    expect(settings.mcpServers.filesystem).toEqual({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
    });
  });

  it('migrates claude-code → cursor (instructions only; no mcp file without servers)', async () => {
    const dir = await copyFixture('claude-basic');
    const { txId } = await migratePipeline('claude-code', 'cursor', dir);
    expect(txId).toBeTruthy();
    await fs.access(path.join(dir, 'AGENTS.md'));
    await expect(fs.access(path.join(dir, '.cursor', 'mcp.json'))).rejects.toThrow();
  });

  it('migrates opencode → cursor (mcp translation with stdio type added)', async () => {
    const dir = await copyFixture('opencode-basic');
    const { txId } = await migratePipeline('opencode', 'cursor', dir);
    expect(txId).toBeTruthy();
    const cursor = JSON.parse(await fs.readFile(path.join(dir, '.cursor', 'mcp.json'), 'utf-8'));
    expect(cursor.mcpServers.filesystem).toEqual({
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
    });
  });

  it('migrates opencode → gemini (mcp into .gemini/settings.json, no type field)', async () => {
    const dir = await copyFixture('opencode-basic');
    const { txId } = await migratePipeline('opencode', 'gemini', dir);
    expect(txId).toBeTruthy();
    const gemini = JSON.parse(await fs.readFile(path.join(dir, '.gemini', 'settings.json'), 'utf-8'));
    expect(gemini.mcpServers.filesystem).toEqual({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
    });
    expect(gemini.mcpServers.filesystem.type).toBeUndefined();
  });

  it('migrates gemini → claude-code (reverse, GEMINI.md → AGENTS.md translation)', async () => {
    const dir = await copyFixture('gemini-basic');
    const { txId } = await migratePipeline('gemini', 'claude-code', dir);
    expect(txId).toBeTruthy();
    await fs.access(path.join(dir, 'AGENTS.md'));
    const settings = JSON.parse(await fs.readFile(path.join(dir, '.claude', 'settings.json'), 'utf-8'));
    expect(settings.mcpServers.filesystem).toEqual({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
    });
  });

  it('migrates gemini → opencode (reverse)', async () => {
    const dir = await copyFixture('gemini-basic');
    const { txId } = await migratePipeline('gemini', 'opencode', dir);
    expect(txId).toBeTruthy();
    const oc = JSON.parse(await fs.readFile(path.join(dir, 'opencode.json'), 'utf-8'));
    expect(oc.mcpServers.filesystem).toEqual({
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
    });
  });

  it('migrates a commented kilo.jsonc with mcp servers to claude-code', async () => {
    const dir = await copyFixture('kilo-basic');
    await fs.writeFile(path.join(dir, '.kilo', 'kilo.jsonc'), `{
      // main config
      "model": "claude-sonnet-4-20250514",
      "mcp": {
        "fs": { "type": "local", "command": ["npx", "-y", "fs"], "environment": { "K": "v" } },
      },
    }`);
    const { txId } = await migratePipeline('kilo', 'claude-code', dir);
    expect(txId).toBeTruthy();
    const settings = JSON.parse(await fs.readFile(path.join(dir, '.claude', 'settings.json'), 'utf-8'));
    expect(settings.model).toBe('claude-sonnet-4-20250514');
    expect(settings.mcpServers.fs).toEqual({ command: 'npx', args: ['-y', 'fs'], env: { K: 'v' } });
  });

  it('migrates a commented opencode.jsonc to gemini end-to-end', async () => {
    const dir = await copyFixture('opencode-basic');
    await fs.writeFile(path.join(dir, 'opencode.jsonc'), `{
      // provider
      "provider": "anthropic",
      "model": "gemini-2.5-pro",
      "mcpServers": {
        "fs": { "type": "stdio", "command": "npx", "args": ["-y", "fs"], },
      },
    }`);
    const { txId } = await migratePipeline('opencode', 'gemini', dir);
    expect(txId).toBeTruthy();
    const gemini = JSON.parse(await fs.readFile(path.join(dir, '.gemini', 'settings.json'), 'utf-8'));
    expect(gemini.mcpServers.fs).toEqual({ command: 'npx', args: ['-y', 'fs'] });
    expect(gemini.mcpServers.fs.type).toBeUndefined();
  });

  it('merges into an existing target config, preserving user-only keys', async () => {
    const dir = await copyFixture('claude-basic');
    // Give the source an MCP server to migrate
    await fs.writeFile(path.join(dir, '.claude', 'settings.json'), JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      mcpServers: { filesystem: { command: 'npx', args: ['-y', 'fs-mcp'] } },
    }));
    // User's hand-edited opencode config that the migration will overwrite
    await fs.writeFile(path.join(dir, 'opencode.json'), JSON.stringify({
      theme: 'user-dark',
      model: 'user-custom-model',
      mcpServers: { userSrv: { type: 'stdio', command: 'user-cmd' } },
    }));

    const { txId } = await migratePipeline('claude-code', 'opencode', dir);
    expect(txId).toBeTruthy();

    const oc = JSON.parse(await fs.readFile(path.join(dir, 'opencode.json'), 'utf-8'));
    // user-only keys preserved
    expect(oc.theme).toBe('user-dark');
    expect(oc.mcpServers.userSrv).toEqual({ type: 'stdio', command: 'user-cmd' });
    // incoming values win on conflict
    expect(oc.model).toBe('claude-sonnet-4-20250514');
    expect(oc.mcpServers.filesystem).toEqual({
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'fs-mcp'],
    });
  });

  it('leaves markdown instructions as full replacement (no merge)', async () => {
    const dir = await copyFixture('claude-basic');
    // A stale GEMINI.md from a previous migration or hand-editing
    await fs.writeFile(path.join(dir, 'GEMINI.md'), '# Old user instructions');

    await migratePipeline('claude-code', 'gemini', dir);

    // GEMINI.md gets the migrated instructions wholesale
    const md = await fs.readFile(path.join(dir, 'GEMINI.md'), 'utf-8');
    expect(md).not.toContain('Old user instructions');
    expect(md.length).toBeGreaterThan(0);
  });
});
