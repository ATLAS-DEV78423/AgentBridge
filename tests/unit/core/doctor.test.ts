import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { doctor } from '../../../src/core/doctor.js';
import '../../../src/adapters/registry.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-doctor-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

const write = (rel: string, content: string) =>
  fs.mkdir(path.dirname(path.join(tmpDir, rel)), { recursive: true })
    .then(() => fs.writeFile(path.join(tmpDir, rel), content));

describe('doctor', () => {
  it('reports nothing to fix for healthy configs across several agents', async () => {
    await write('AGENTS.md', '# Rules');
    await write('.claude/settings.json', JSON.stringify({ mcpServers: { fs: { command: 'npx', args: ['-y', 'fs'] } }, model: 'm' }));
    await write('.codex/config.toml', '[mcp_servers.fs]\ncommand = "npx"\n');
    await write('.crush.json', JSON.stringify({ mcp: { fs: { type: 'stdio', command: 'npx' } } }));

    const report = await doctor(tmpDir);
    const problems = report.flatMap(r => r.problems);
    expect(problems).toEqual([]);
    expect(report.map(r => r.agent).sort()).toEqual(['claude-code', 'codex', 'crush']);
  });

  it('flags a JSON config that fails to parse (comments, trailing comma) with file and line', async () => {
    await write('.claude/settings.json', '{\n  // hand-added comment\n  "model": "m",\n}');
    const report = await doctor(tmpDir);
    expect(report).toHaveLength(1);
    expect(report[0].agent).toBe('claude-code');
    const p = report[0].problems[0];
    expect(p.severity).toBe('error');
    expect(p.file).toBe('.claude/settings.json');
    expect(p.line).toBe(2);
    expect(p.message).toMatch(/parse/i);
  });

  it('flags an MCP key that holds a non-object', async () => {
    await write('.mcp.json', JSON.stringify({ mcpServers: ['not', 'an', 'object'] }));
    const report = await doctor(tmpDir);
    const p = report.find(r => r.agent === 'grok')!.problems[0];
    expect(p.severity).toBe('error');
    expect(p.message).toMatch(/mcpServers/i);
  });

  it('flags a stdio server without command and a remote server without url', async () => {
    await write('.cursor/mcp.json', JSON.stringify({
      mcpServers: {
        broken: { type: 'stdio', args: ['x'] },
        alsoBroken: { url: 42 },
      },
    }));
    const report = await doctor(tmpDir);
    const msgs = report.find(r => r.agent === 'cursor')!.problems.map(p => p.message).join(' ');
    expect(msgs).toMatch(/broken/);
    expect(msgs).toMatch(/command/);
    expect(msgs).toMatch(/url/);
  });

  it('applies each agent’s documented transport-tag policy', async () => {
    // crush docs: `type` required on every server
    await write('.crush.json', JSON.stringify({ mcp: { fs: { command: 'npx' } } }));
    // gemini docs: transport inferred from shape — an explicit stdio type is not valid settings shape
    await write('.gemini/settings.json', JSON.stringify({ mcpServers: { fs: { type: 'stdio', command: 'npx' } } }));
    // cursor docs: type: "stdio" required on command servers
    await write('.cursor/mcp.json', JSON.stringify({ mcpServers: { fs: { command: 'npx' } } }));

    const report = await doctor(tmpDir);
    const problemsFor = (agent: string) => report.find(r => r.agent === agent)!.problems.map(p => `${p.severity}: ${p.message}`).join(' | ');
    expect(problemsFor('crush')).toMatch(/type/);
    expect(problemsFor('gemini')).toMatch(/type/);
    expect(problemsFor('cursor')).toMatch(/type/);
  });

  it('tolerates comments in jsonc configs without erroring (missing-instructions warning may apply)', async () => {
    await write('opencode.jsonc', '{\n  // fine here\n  "model": "m",\n}');
    const report = await doctor(tmpDir);
    const errors = report.find(r => r.agent === 'opencode')!.problems.filter(p => p.severity === 'error');
    expect(errors).toEqual([]);
  });

  it('reports an empty project as no agents, not an error', async () => {
    const report = await doctor(tmpDir);
    expect(report).toEqual([]);
  });

  it('warns when a detected agent has no instruction file at all', async () => {
    await write('.gemini/settings.json', JSON.stringify({ mcpServers: {} }));
    const report = await doctor(tmpDir);
    const p = report.find(r => r.agent === 'gemini')!.problems[0];
    expect(p.severity).toBe('warning');
    expect(p.message).toMatch(/GEMINI\.md/);
    expect(p.message).toMatch(/no instruction file/i);
  });

  it('warns on divergent instruction files across agents', async () => {
    await write('.gemini/settings.json', JSON.stringify({ mcpServers: {} }));
    await write('GEMINI.md', '# Gemini rules');
    await write('AGENTS.md', '# Different rules entirely');

    const report = await doctor(tmpDir);
    const project = report.find(r => r.agent === 'project');
    expect(project).toBeDefined();
    expect(project!.problems[0].severity).toBe('warning');
    expect(project!.problems[0].message).toMatch(/AGENTS\.md.*GEMINI\.md|GEMINI\.md.*AGENTS\.md/);
    expect(project!.problems[0].message).toMatch(/diverge/i);
  });

  it('does not warn when multiple instruction files have identical content', async () => {
    await write('.gemini/settings.json', JSON.stringify({ mcpServers: {} }));
    await write('GEMINI.md', '# Same rules');
    await write('AGENTS.md', '# Same rules');
    const report = await doctor(tmpDir);
    expect(report.find(r => r.agent === 'project')).toBeUndefined();
  });

  it('excludes copilot-specific supplemental instructions from the divergence check', async () => {
    await write('.copilot/mcp-config.json', '{}');
    await write('.github/copilot-instructions.md', '# copilot-specific tips');
    await write('AGENTS.md', '# general rules');
    const report = await doctor(tmpDir);
    expect(report.find(r => r.agent === 'project')).toBeUndefined();
    // copilot found its own instruction file → no missing-file warning either
    expect(report.find(r => r.agent === 'copilot')!.problems).toEqual([]);
  });

  it('accepts either of claude’s instruction files', async () => {
    await fs.mkdir(path.join(tmpDir, '.claude'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.claude', 'settings.json'), '{}');
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# claude rules');
    const report = await doctor(tmpDir);
    expect(report.find(r => r.agent === 'claude-code')!.problems).toEqual([]);
  });
});
