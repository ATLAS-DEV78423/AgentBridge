import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { detectOpenCode } from '../../../src/adapters/opencode/detector.js';
import { scanOpenCodeProject } from '../../../src/adapters/opencode/scanner.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-opencode-detect-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

/**
 * The opencode writer emits `opencode.json` (valid per OpenCode's
 * opencode.json[c] docs — doctor already accepts both). Detection and
 * scanning must recognize the tool's own output.
 */
describe('opencode detection of opencode.json (writer output)', () => {
  it('detects a project whose config is opencode.json', async () => {
    await fs.writeFile(path.join(tmpDir, 'opencode.json'), JSON.stringify({ mcpServers: {} }));
    expect((await detectOpenCode({ root: tmpDir })).detected).toBe(true);
  });

  it('still detects opencode.jsonc', async () => {
    await fs.writeFile(path.join(tmpDir, 'opencode.jsonc'), JSON.stringify({ mcpServers: {} }));
    expect((await detectOpenCode({ root: tmpDir })).detected).toBe(true);
  });

  it('extracts MCP servers from opencode.json', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'opencode.json'),
      JSON.stringify({ mcpServers: { fs: { type: 'stdio', command: 'npx', args: ['-y', 'server'] } } }),
    );
    const bundle = await scanOpenCodeProject({ root: tmpDir });
    expect(bundle.mcpServers.map(r => r.name)).toEqual(['fs']);
    expect(bundle.opaque).toHaveLength(1);
  });

  it('does not detect an empty project', async () => {
    expect((await detectOpenCode({ root: tmpDir })).detected).toBe(false);
  });
});
