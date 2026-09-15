import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { detectCodex, scanCodexProject } from '../../../src/adapters/codex/scanner.js';
import { writeCodexFiles } from '../../../src/adapters/codex/writer.js';
import { ResourceBase } from '../../../src/core/model/types.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-codex-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('codex scanner', () => {
  it('does not detect a project without .codex/config.toml', async () => {
    expect((await detectCodex({ root: tmpDir })).detected).toBe(false);
  });

  it('detects via .codex/config.toml and normalizes TOML mcp_servers to canonical shape', async () => {
    await fs.mkdir(path.join(tmpDir, '.codex'), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, '.codex', 'config.toml'),
      [
        'model = "gpt-5"',
        '',
        '[mcp_servers.fs]',
        'command = "npx"',
        'args = ["-y", "@modelcontextprotocol/server-filesystem", "."]',
        '',
        '[mcp_servers.fs.env]',
        'K = "v"',
        '',
        '[mcp_servers.remote]',
        'url = "https://example.com/mcp"',
        'headers = { "Authorization" = "Bearer $PAT" }',
      ].join('\n'),
    );

    const detection = await detectCodex({ root: tmpDir });
    expect(detection).toEqual({ detected: true, agent: 'codex' });

    const bundle = await scanCodexProject({ root: tmpDir });
    expect(bundle.mcpServers.map(s => s.name).sort()).toEqual(['fs', 'remote']);
    const fsServer = JSON.parse(bundle.mcpServers.find(s => s.name === 'fs')!.content!);
    expect(fsServer).toEqual({ command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '.'], env: { K: 'v' } });
    expect(JSON.parse(bundle.mcpServers.find(s => s.name === 'remote')!.content!)).toEqual({ url: 'https://example.com/mcp', headers: { Authorization: 'Bearer $PAT' } });
  });

  it('stores the opaque config as normalized JSON so model survives claude-code targets', async () => {
    await fs.mkdir(path.join(tmpDir, '.codex'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.codex', 'config.toml'), 'model = "gpt-5"\n');
    const bundle = await scanCodexProject({ root: tmpDir });
    expect(bundle.opaque).toHaveLength(1);
    expect(JSON.parse(bundle.opaque[0].content!)).toEqual({ model: 'gpt-5' });
  });
});

describe('codex writer', () => {
  it('writes mcpServers into TOML section tables and drops explicit stdio type', () => {
    const files = writeCodexFiles([
      { id: 'm', type: 'mcpServers', name: 'fs', content: JSON.stringify({ type: 'stdio', command: 'npx', args: ['-y', 'pkg'], env: { K: 'v' } }) },
    ] as ResourceBase[]);
    const config = files.find(f => f.path === '.codex/config.toml');
    expect(config).toBeTruthy();
    expect(config!.content).toBe('[mcp_servers.fs]\ncommand = "npx"\nargs = ["-y", "pkg"]\n\n[mcp_servers.fs.env]\nK = "v"\n');
  });

  it('writes url-based servers with url and nested objects as section tables', () => {
    const files = writeCodexFiles([
      { id: 'r', type: 'mcpServers', name: 'remote', content: JSON.stringify({ url: 'https://example.com/mcp', headers: { A: 'b' } }) },
    ] as ResourceBase[]);
    const content = files.find(f => f.path === '.codex/config.toml')!.content;
    expect(content).toBe('[mcp_servers.remote]\nurl = "https://example.com/mcp"\n\n[mcp_servers.remote.headers]\nA = "b"\n');
  });

  it('writes instructions to AGENTS.md (native for codex) and model into the TOML doc', () => {
    const files = writeCodexFiles([
      { id: 'i', type: 'instructions', name: 'GEMINI.md', content: '# Rules' },
      { id: 'o', type: 'opaque', name: '.claude/settings.json', content: JSON.stringify({ model: 'test-model' }) },
    ] as ResourceBase[]);
    expect(files.find(f => f.path === 'AGENTS.md')!.content).toBe('# Rules');
    expect(files.find(f => f.path === '.codex/config.toml')!.content).toBe('model = "test-model"\n');
  });

  it('round-trips: scan a config.toml, write it back, re-scan equals original bundle servers', async () => {
    await fs.mkdir(path.join(tmpDir, '.codex'), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, '.codex', 'config.toml'),
      'model = "gpt-5"\n\n[mcp_servers.fs]\ncommand = "npx"\nargs = ["-y", "pkg"]\n',
    );
    const first = await scanCodexProject({ root: tmpDir });
    const files = writeCodexFiles(first.instructions.concat(first.mcpServers, first.opaque) as ResourceBase[]);
    await fs.writeFile(path.join(tmpDir, '.codex', 'config.toml'), files.find(f => f.path === '.codex/config.toml')!.content);
    const second = await scanCodexProject({ root: tmpDir });
    expect(second.mcpServers.map(s => [s.name, JSON.parse(s.content!)])).toEqual(first.mcpServers.map(s => [s.name, JSON.parse(s.content!)]));
  });
});
