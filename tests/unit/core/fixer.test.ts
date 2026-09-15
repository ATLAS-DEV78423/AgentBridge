import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fixProject } from '../../../src/core/fixer.js';
import '../../../src/adapters/registry.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-fixer-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

const write = (rel: string, content: string) =>
  fs.mkdir(path.dirname(path.join(tmpDir, rel)), { recursive: true })
    .then(() => fs.writeFile(path.join(tmpDir, rel), content));

describe('fixProject (safe auto-fixes only)', () => {
  it('rewrites a commented .json config comment-free, in place, with a backup', async () => {
    await write('AGENTS.md', '# Rules');
    const commented = '{\n  // hand-added\n  "model": "m",\n}';
    await write('.claude/settings.json', commented);

    const { txId, fixes } = await fixProject(tmpDir);
    expect(fixes).toEqual(['.claude/settings.json']);
    expect(txId).toBeTruthy();

    const after = await fs.readFile(path.join(tmpDir, '.claude/settings.json'), 'utf-8');
    expect(JSON.parse(after)).toEqual({ model: 'm' }); // data intact, comments gone
    expect(after).not.toContain('//');

    // rollback wire: manifest is keyed by target path, the backup file by a flattened name
    const backupDir = path.join(tmpDir, '.agentbridge', 'backups', txId!);
    const manifest = JSON.parse(await fs.readFile(path.join(backupDir, 'manifest.json'), 'utf-8'));
    expect(manifest.originals['.claude/settings.json']).toBeDefined();
    const backupName = '.claude/settings.json'.replace(/[/\\]/g, '__');
    const backup = await fs.readFile(path.join(backupDir, backupName), 'utf-8');
    expect(backup).toBe(commented);
  });

  it('leaves non-json parse errors and schema problems for a human', async () => {
    await write('AGENTS.md', '# Rules');
    await write('.claude/settings.json', '{ totally not json');
    await write('.crush.json', JSON.stringify({ mcp: { fs: { command: 'npx' } } })); // missing type: needs human decision

    const { fixes } = await fixProject(tmpDir);
    expect(fixes).toEqual([]);
    expect(await fs.readFile(path.join(tmpDir, '.claude/settings.json'), 'utf-8')).toBe('{ totally not json');
    expect(JSON.parse(await fs.readFile(path.join(tmpDir, '.crush.json'), 'utf-8')).mcp.fs).toEqual({ command: 'npx' });
  });

  it('changes nothing (and returns no tx) on an already-clean project', async () => {
    await write('AGENTS.md', '# Rules');
    await fs.mkdir(path.join(tmpDir, '.claude'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.claude/settings.json'), JSON.stringify({ model: 'm' }));

    const { txId, fixes } = await fixProject(tmpDir);
    expect(fixes).toEqual([]);
    expect(txId).toBeNull();
  });
});
