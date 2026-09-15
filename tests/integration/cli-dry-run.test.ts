import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

describe('cli migrate --dry-run', () => {
  it('plans the migration without writing target files (flag must not be dropped)', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-dryrun-'));
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# Rules');
    await fs.mkdir(path.join(tmpDir, '.claude'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.claude', 'settings.json'), JSON.stringify({ mcpServers: { fs: { command: 'npx', args: ['-y', 'fs'] } } }));

    const { stdout } = await run('npx', ['tsx', 'src/cli/main.ts', 'migrate', 'claude-code', 'grok', tmpDir, '--dry-run'], { cwd: path.resolve('.') });

    expect(stdout).toContain('Dry run');
    // dry-run must not create the target config
    await expect(fs.access(path.join(tmpDir, '.mcp.json'))).rejects.toThrow();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
