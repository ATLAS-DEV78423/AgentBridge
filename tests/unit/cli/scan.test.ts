import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { executeScan } from '../../../src/cli/commands/scan.js';

let tmpDir: string;
let logs: string[];

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-scan-'));
  logs = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    logs.push(args.map(String).join(' '));
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('executeScan', () => {
  it('reports every detected agent in a multi-agent project', async () => {
    await fs.mkdir(path.join(tmpDir, '.claude'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.claude', 'settings.json'), '{}');
    await fs.mkdir(path.join(tmpDir, '.cursor'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.cursor', 'mcp.json'), '{}');
    await fs.mkdir(path.join(tmpDir, '.kilo'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.kilo', 'kilo.jsonc'), '{}');

    await executeScan(tmpDir);

    const out = logs.join('\n');
    expect(out).toContain('Claude Code');
    expect(out).toContain('Cursor');
    expect(out).toContain('Kilo Code');
  });

  it('reports resource counts for each detected agent', async () => {
    await fs.mkdir(path.join(tmpDir, '.cursor'), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, '.cursor', 'mcp.json'),
      JSON.stringify({ mcpServers: { fs: { type: 'stdio', command: 'npx' } } })
    );

    await executeScan(tmpDir);

    const out = logs.join('\n');
    expect(out).toContain('MCP servers     1');
  });

  it('says no agents detected for an empty project', async () => {
    await executeScan(tmpDir);
    expect(logs.join('\n')).toContain('No agent configurations detected.');
  });
});
