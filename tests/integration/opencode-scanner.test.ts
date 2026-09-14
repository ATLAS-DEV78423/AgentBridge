import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { detectOpenCode } from '../../src/adapters/opencode/detector.js';
import { scanOpenCodeProject } from '../../src/adapters/opencode/scanner.js';

const FIXTURE = path.resolve('tests/fixtures/opencode-basic');

describe('OpenCode scanner', () => {
  it('detects OpenCode project', async () => {
    const result = await detectOpenCode({ root: FIXTURE });
    expect(result.detected).toBe(true);
    expect(result.agent).toBe('opencode');
  });

  it('does not detect non-OpenCode project', async () => {
    const result = await detectOpenCode({ root: '/tmp' });
    expect(result.detected).toBe(false);
  });

  it('scans OpenCode project correctly', async () => {
    const bundle = await scanOpenCodeProject({ root: FIXTURE });
    expect(bundle.sourceAgent).toBe('OpenCode');
    expect(bundle.instructions.length).toBe(1);
    expect(bundle.instructions[0].name).toBe('AGENTS.md');
    expect(bundle.mcpServers.length).toBe(1);
    expect(bundle.mcpServers[0].name).toBe('filesystem');
  });

  it('extracts mcpServers from a commented opencode.jsonc', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'opencode-jsonc-'));
    await fs.writeFile(path.join(dir, 'opencode.jsonc'), `{
      // primary provider
      "provider": "anthropic",
      "mcpServers": {
        "fs": { "type": "stdio", "command": "npx", }, // inline
      },
    }`);
    const bundle = await scanOpenCodeProject({ root: dir });
    expect(bundle.mcpServers.length).toBe(1);
    expect(bundle.mcpServers[0].name).toBe('fs');
    await fs.rm(dir, { recursive: true, force: true });
  });
});
