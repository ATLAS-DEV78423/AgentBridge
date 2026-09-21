import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { copilotAdapter, writeCopilotFiles, crushAdapter, writeCrushFiles, grokAdapter, writeGrokFiles, ompAdapter, writeOmpFiles, museCodeAdapter, writeMuseCodeFiles, piAdapter, writePiFiles, clineAdapter, writeClineFiles, instructionsTarget } from '../../../src/adapters/simple-agents.js';
import { AgentAdapter } from '../../../src/core/scanner/scanner.js';
import { TargetFile } from '../../../src/core/writers.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-factory-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// Real-world shapes per agent docs. crush/omp hide their servers under a
// non-default key; muse-code has no project config at all (MUSE_CODE.md
// is both the marker and the only writable output).
const CASES: {
  id: string;
  adapter: AgentAdapter;
  write: typeof writeCopilotFiles;
  marker: string;              // file whose existence means "detected"
  mcpKey: string | null;       // top-level config key, null = no project MCP
  instructionFile: string | null;
}[] = [
  { id: 'copilot', adapter: copilotAdapter, write: writeCopilotFiles, marker: '.copilot/mcp-config.json', mcpKey: 'mcpServers', instructionFile: null },
  { id: 'crush', adapter: crushAdapter, write: writeCrushFiles, marker: '.crush.json', mcpKey: 'mcp', instructionFile: null },
  { id: 'grok', adapter: grokAdapter, write: writeGrokFiles, marker: '.mcp.json', mcpKey: 'mcpServers', instructionFile: 'AGENTS.md' },
  { id: 'omp', adapter: ompAdapter, write: writeOmpFiles, marker: '.pi/mcp.json', mcpKey: 'mcpServers', instructionFile: null },
  { id: 'muse-code', adapter: museCodeAdapter, write: writeMuseCodeFiles, marker: 'MUSE_CODE.md', mcpKey: null, instructionFile: 'MUSE_CODE.md' },
  { id: 'pi', adapter: piAdapter, write: writePiFiles, marker: '.pi', mcpKey: null, instructionFile: 'AGENTS.md' },
  // Cline's marker is a rules location, not a config file: `.clinerules` or
  // `.cline/rules` — the array's first entry is what this case exercises.
  { id: 'cline', adapter: clineAdapter, write: writeClineFiles, marker: '.clinerules', mcpKey: null, instructionFile: 'AGENTS.md' },
];

const stdioServer = { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '.'], env: { K: 'v' } };

describe('crush writer schema compliance', () => {
  // crush docs: `type` is REQUIRED on every server (stdio | http | sse).
  it('adds required type to stdio servers, not just remote ones', () => {
    const files = writeCrushFiles([
      { type: 'mcpServers', name: 'fs', path: 'x', root: 'r', content: JSON.stringify({ command: 'npx', args: ['-y', 'fs'] }) },
      { type: 'mcpServers', name: 'web', path: 'x', root: 'r', content: JSON.stringify({ url: 'https://example.com/mcp' }) },
    ] as Parameters<typeof writeCrushFiles>[0]);
    const config = JSON.parse(files.find(f => f.path === '.crush.json')!.content);
    expect(config.mcp.fs).toMatchObject({ type: 'stdio', command: 'npx' });
    expect(config.mcp.web).toMatchObject({ type: 'http', url: 'https://example.com/mcp' });
  });
});

describe.each(CASES)('$id adapter (factory)', ({ adapter, write, marker, mcpKey, instructionFile }) => {
  it('does not detect an empty project', async () => {
    expect((await adapter.detect({ root: tmpDir })).detected).toBe(false);
  });

  it('detects when its marker file exists', async () => {
    await fs.mkdir(path.dirname(path.join(tmpDir, marker)), { recursive: true });
    await fs.writeFile(path.join(tmpDir, marker), mcpKey ? '{}' : '# instructions');
    expect(await adapter.detect({ root: tmpDir })).toEqual({ detected: true, agent: adapter.id });
  });

  if (mcpKey) {
    it('scans MCP servers into canonical shape (type stripped, command/args/env kept)', async () => {
      await fs.mkdir(path.dirname(path.join(tmpDir, marker)), { recursive: true });
      await fs.writeFile(path.join(tmpDir, marker), JSON.stringify({ [mcpKey]: { fs: stdioServer } }));
      const bundle = await adapter.scanProject({ root: tmpDir });
      expect(bundle.mcpServers).toHaveLength(1);
      expect(bundle.mcpServers[0].name).toBe('fs');
      expect(JSON.parse(bundle.mcpServers[0].content!)).toEqual({ command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '.'], env: { K: 'v' } });
    });

    it('writes servers back under its own key', async () => {
      const files: TargetFile[] = write([{ id: 'm', type: 'mcpServers', name: 'fs', content: JSON.stringify({ command: 'npx', args: ['-y', 'pkg'] }) }]);
      const config = files.find(f => f.path === marker);
      expect(config).toBeTruthy();
      const parsed = JSON.parse(config!.content);
      expect(parsed[mcpKey]).toEqual({ fs: expect.objectContaining({ command: 'npx' }) });
    });
  } else {
    it('scans no MCP servers (no project config exists)', async () => {
      await fs.writeFile(path.join(tmpDir, marker), '# instructions');
      const bundle = await adapter.scanProject({ root: tmpDir });
      expect(bundle.mcpServers).toHaveLength(0);
    });

    it('writes no config file (nothing to manage)', async () => {
      const files: TargetFile[] = write([{ id: 'm', type: 'mcpServers', name: 'fs', content: JSON.stringify({ command: 'npx' }) }]);
      expect(files.filter(f => f.path !== (instructionFile ?? ''))).toHaveLength(0);
    });
  }

  if (instructionFile) {
    it(`scans and writes instructions as ${instructionFile}`, async () => {
      await fs.writeFile(path.join(tmpDir, instructionFile), '# Agent rules');
      const bundle = await adapter.scanProject({ root: tmpDir });
      expect(bundle.instructions).toHaveLength(1);
      expect(bundle.instructions[0].name).toBe(instructionFile);

      const files = write([{ id: 'i', type: 'instructions', name: 'AGENTS.md', content: '# Rules' }]);
      expect(files.some(f => f.path === instructionFile && f.content === '# Rules')).toBe(true);
    });
  } else {
    it('scans no instructions (no confirmed instruction file)', async () => {
      await fs.mkdir(path.dirname(path.join(tmpDir, marker)), { recursive: true });
      await fs.writeFile(path.join(tmpDir, marker), '{}');
      const bundle = await adapter.scanProject({ root: tmpDir });
      expect(bundle.instructions).toHaveLength(0);
    });
  }
});

describe('cline detection', () => {
  // docs.cline.bot/customization/cline-rules: workspace rules live in
  // `.clinerules/` or `.cline/rules/`; there is no project-scoped MCP file
  // (MCP settings are user-level), so the rules location is the marker.
  it('detects either documented workspace rules location', async () => {
    for (const rel of ['.clinerules/coding.md', path.join('.cline', 'rules', 'coding.md')]) {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-cline-'));
      await fs.mkdir(path.dirname(path.join(root, rel)), { recursive: true });
      await fs.writeFile(path.join(root, rel), '# Rules');
      try {
        expect(await clineAdapter.detect({ root }), rel).toEqual({ detected: true, agent: 'cline' });
      } finally {
        await fs.rm(root, { recursive: true, force: true });
      }
    }
  });
});

describe('factory per-agent differences', () => {
  it('crush writer tags every server type per docs (required: stdio/http/sse; http default)', () => {
    const files = writeCrushFiles([
      { id: 'r', type: 'mcpServers', name: 'remote', content: JSON.stringify({ url: 'https://example.com/mcp' }) },
      { id: 's', type: 'mcpServers', name: 'local', content: JSON.stringify({ command: 'npx' }) },
    ]);
    const config = JSON.parse(files.find(f => f.path === '.crush.json')!.content);
    expect(config.mcp.remote).toEqual(expect.objectContaining({ type: 'http', url: 'https://example.com/mcp' }));
    expect(config.mcp.local).toEqual(expect.objectContaining({ type: 'stdio', command: 'npx' }));
  });

  it('copilot writer keeps url-based servers untouched (standard mcpServers shape)', () => {
    const files = writeCopilotFiles([{ id: 'r', type: 'mcpServers', name: 'remote', content: JSON.stringify({ url: 'https://example.com/mcp' }) }]);
    const config = JSON.parse(files.find(f => f.path === '.copilot/mcp-config.json')!.content);
    expect(config.mcpServers.remote).toEqual({ url: 'https://example.com/mcp' });
  });

  it('muse-code writer maps foreign instruction names to MUSE_CODE.md', () => {
    for (const source of ['AGENTS.md', 'GEMINI.md']) {
      const files = writeMuseCodeFiles([{ id: 'i', type: 'instructions', name: source, content: '# R' }]);
      expect(files.map(f => f.path)).toEqual(['MUSE_CODE.md']);
    }
  });

  it('every adapter writes foreign instruction names under its own convention', () => {
    // MUSE_CODE.md as a *source* must not leak into other targets (same
    // bug class as GEMINI.md before the normalization helper).
    const targets: [typeof writeCopilotFiles, string][] = [
      [writeCopilotFiles, '.github/copilot-instructions.md'],
      [writeCrushFiles, 'AGENTS.md'],
      [writeGrokFiles, 'AGENTS.md'],
      [writeOmpFiles, 'AGENTS.md'],
      [writePiFiles, 'AGENTS.md'],
    ];
    for (const [write, expectedPath] of targets) {
      const files = write([{ id: 'i', type: 'instructions', name: 'MUSE_CODE.md', content: '# R' }]);
      expect(files.map(f => f.path)).toEqual([expectedPath]);
    }
  });

  it('copilot-instructions.md as a source normalizes to AGENTS.md in the AGENTS.md family', () => {
    // Copilot's rules must land where claude/opencode/kilo/cursor/codex
    // actually read them, not at copilot's agent-specific path.
    expect(instructionsTarget('.github/copilot-instructions.md')).toBe('AGENTS.md');
    const files = writeGrokFiles([{ id: 'i', type: 'instructions', name: '.github/copilot-instructions.md', content: '# R' }]);
    expect(files.map(f => f.path)).toEqual(['AGENTS.md']);
  });
});
