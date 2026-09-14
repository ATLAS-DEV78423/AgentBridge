import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { writeClaudeFiles } from '../../../src/adapters/claude-code/writer.js';
import { writeOpenCodeFiles } from '../../../src/adapters/opencode/writer.js';
import { writeKiloFiles } from '../../../src/adapters/kilo/writer.js';
import { writeCursorFiles } from '../../../src/adapters/cursor/writer.js';
import { writeGeminiFiles } from '../../../src/adapters/gemini/writer.js';
import { ResourceBase } from '../../../src/core/model/types.js';

const AGENTS = ['claude-code', 'opencode', 'kilo', 'cursor', 'gemini'] as const;

const WRITERS = {
  'claude-code': writeClaudeFiles,
  'opencode': writeOpenCodeFiles,
  'kilo': writeKiloFiles,
  'cursor': writeCursorFiles,
  'gemini': writeGeminiFiles,
};

// A representative opaque config per source agent — what "model settings" means there.
const OPAQUE: Record<string, ResourceBase> = {
  'claude-code': { id: 'o', type: 'opaque', name: '.claude/settings.json', content: JSON.stringify({ model: 'test-model', permissions: {} }) },
  'opencode': { id: 'o', type: 'opaque', name: 'opencode.jsonc', content: JSON.stringify({ provider: 'x', model: 'test-model' }) },
  'kilo': { id: 'o', type: 'opaque', name: '.kilo/kilo.jsonc', content: JSON.stringify({ model: 'test-model', maxTokens: 1 }) },
  'cursor': { id: 'o', type: 'opaque', name: '.cursor/mcp.json', content: JSON.stringify({ mcpServers: {} }) },
  'gemini': { id: 'o', type: 'opaque', name: '.gemini/settings.json', content: JSON.stringify({ mcpServers: {} }) },
};

const inst = (name: string): ResourceBase => ({ id: 'i', type: 'instructions', name, content: '# R' });
const mcp = (): ResourceBase => ({ id: 'm', type: 'mcpServers', name: 'fs', content: JSON.stringify({ command: 'npx', args: ['-y', 'm'] }) });

function migrates(source: string, target: string): { instructions: boolean; mcp: boolean; model: boolean } {
  const write = WRITERS[target as keyof typeof WRITERS];
  const wants = target === 'gemini' ? 'GEMINI.md' : 'AGENTS.md';
  const instructions = write([inst(source === 'gemini' ? 'GEMINI.md' : 'AGENTS.md')]).some(f => f.path === wants);
  const mcpOk = write([mcp()]).some(f => f.content.includes('"fs"'));
  const model = write([OPAQUE[source]]).some(f => {
    try { return JSON.parse(f.content).model === 'test-model'; } catch { return false; }
  });
  return { instructions, mcp: mcpOk, model };
}

function row(source: string, target: string): string {
  const c = migrates(source, target);
  const mark = (b: boolean) => (b ? '✓' : '✗');
  return `| ${source} → ${target} | ${mark(c.instructions)} | ${mark(c.mcp)} | ${mark(c.model)} |`;
}

describe('README compatibility matrix', () => {
  it('matches actual writer behavior for every agent pair', async () => {
    const readme = await fs.readFile(path.resolve('README.md'), 'utf-8');
    expect(readme).toContain('## What migrates (per pair)');
    for (const source of AGENTS) {
      for (const target of AGENTS) {
        if (source === target) continue;
        expect(readme).toContain(row(source, target));
      }
    }
  });
});
