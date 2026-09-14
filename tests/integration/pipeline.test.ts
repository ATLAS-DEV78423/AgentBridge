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
});
