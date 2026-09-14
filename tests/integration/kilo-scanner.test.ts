import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { detectKilo } from '../../src/adapters/kilo/detector.js';
import { scanKiloProject } from '../../src/adapters/kilo/scanner.js';

const FIXTURE = path.resolve('tests/fixtures/kilo-basic');

describe('Kilo scanner', () => {
  it('detects Kilo project', async () => {
    const result = await detectKilo({ root: FIXTURE });
    expect(result.detected).toBe(true);
    expect(result.agent).toBe('kilo');
  });

  it('does not detect non-Kilo project', async () => {
    const result = await detectKilo({ root: '/tmp' });
    expect(result.detected).toBe(false);
  });

  it('scans Kilo project correctly', async () => {
    const bundle = await scanKiloProject({ root: FIXTURE });
    expect(bundle.sourceAgent).toBe('Kilo Code');
    expect(bundle.instructions.length).toBe(1);
    expect(bundle.opaque.length).toBe(1);
  });

  it('detects and scans .kilo/kilo.jsonc (documented kilo config location)', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kilo-jsonc-'));
    await fs.mkdir(path.join(dir, '.kilo'), { recursive: true });
    await fs.writeFile(path.join(dir, '.kilo', 'kilo.jsonc'), JSON.stringify({ model: 'm' }));
    expect((await detectKilo({ root: dir })).detected).toBe(true);
    const bundle = await scanKiloProject({ root: dir });
    expect(bundle.opaque.length).toBe(1);
    expect(bundle.opaque[0].name).toBe('.kilo/kilo.jsonc');
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('extracts mcp servers from a commented .kilo/kilo.jsonc', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kilo-mcp-'));
    await fs.mkdir(path.join(dir, '.kilo'), { recursive: true });
    await fs.writeFile(path.join(dir, '.kilo', 'kilo.jsonc'), `{
      // local tools
      "model": "m",
      "mcp": {
        "fs": { "type": "local", "command": ["npx", "-y", "fs"], }, // remote
        "web": { "type": "remote", "url": "https://mcp.example.com/mcp" },
      },
    }`);
    const bundle = await scanKiloProject({ root: dir });
    expect(bundle.mcpServers.length).toBe(2);
    const byName = Object.fromEntries(bundle.mcpServers.map(s => [s.name, JSON.parse(s.content!)]));
    // normalized to canonical command/args/env + url shape
    expect(byName.fs).toEqual({ command: 'npx', args: ['-y', 'fs'] });
    expect(byName.web).toEqual({ url: 'https://mcp.example.com/mcp' });
    await fs.rm(dir, { recursive: true, force: true });
  });
});
