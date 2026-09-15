import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { writeClaudeFiles } from '../../../src/adapters/claude-code/writer.js';
import { writeOpenCodeFiles } from '../../../src/adapters/opencode/writer.js';
import { writeKiloFiles } from '../../../src/adapters/kilo/writer.js';
import { writeCursorFiles } from '../../../src/adapters/cursor/writer.js';
import { writeGeminiFiles } from '../../../src/adapters/gemini/writer.js';
import { writeCodexFiles } from '../../../src/adapters/codex/writer.js';
import { writeCopilotFiles, writeCrushFiles, writeGrokFiles, writeOmpFiles, writeMuseCodeFiles, writePiFiles } from '../../../src/adapters/simple-agents.js';
import { parseToml } from '../../../src/core/toml.js';
import { ResourceBase } from '../../../src/core/model/types.js';

const AGENTS = [
  'claude-code', 'opencode', 'kilo', 'cursor', 'gemini',
  'codex', 'copilot', 'crush', 'grok', 'omp', 'muse-code', 'pi',
] as const;

const WRITERS = {
  'claude-code': writeClaudeFiles,
  'opencode': writeOpenCodeFiles,
  'kilo': writeKiloFiles,
  'cursor': writeCursorFiles,
  'gemini': writeGeminiFiles,
  'codex': writeCodexFiles,
  'copilot': writeCopilotFiles,
  'crush': writeCrushFiles,
  'grok': writeGrokFiles,
  'omp': writeOmpFiles,
  'muse-code': writeMuseCodeFiles,
  'pi': writePiFiles,
};

// Where each target wants instructions.
const INSTRUCTION_PATH: Record<string, string> = {
  'gemini': 'GEMINI.md',
  'muse-code': 'MUSE_CODE.md',
  'copilot': '.github/copilot-instructions.md',
};
const instructionPath = (target: string): string => INSTRUCTION_PATH[target] ?? 'AGENTS.md';

// A representative opaque config per source agent — what "model settings" means there.
// Agents whose project config carries no model produce no model migration anywhere.
const HAS_MODEL_SOURCES = new Set(['claude-code', 'opencode', 'kilo', 'codex']);
const opaqueFor = (source: string): ResourceBase => ({
  id: 'o',
  type: 'opaque',
  name: source === 'claude-code' ? '.claude/settings.json'
    : source === 'opencode' ? 'opencode.jsonc'
    : source === 'kilo' ? '.kilo/kilo.jsonc'
    : source === 'codex' ? '.codex/config.toml'
    : source === 'gemini' ? '.gemini/settings.json'
    : source === 'cursor' ? '.cursor/mcp.json'
    : source === 'crush' ? '.crush.json'
    : source === 'omp' ? '.pi/mcp.json'
    : source === 'copilot' ? '.copilot/mcp-config.json'
    : source === 'grok' ? '.mcp.json'
    : 'MUSE_CODE.md',
  content: JSON.stringify(HAS_MODEL_SOURCES.has(source) ? { model: 'test-model' } : { mcpServers: {} }),
});

const inst = (name: string): ResourceBase => ({ id: 'i', type: 'instructions', name, content: '# R' });
const mcp = (): ResourceBase => ({ id: 'm', type: 'mcpServers', name: 'fs', content: JSON.stringify({ command: 'npx', args: ['-y', 'm'] }) });

function sourceInstructionName(source: string): string {
  return source === 'gemini' ? 'GEMINI.md' : source === 'muse-code' ? 'MUSE_CODE.md' : 'AGENTS.md';
}

function extractModel(target: string, content: string): unknown {
  try {
    return target === 'codex' ? parseToml(content).model : JSON.parse(content).model;
  } catch {
    return undefined;
  }
}

function migrates(source: string, target: string): { instructions: boolean; mcp: boolean; model: boolean } {
  const write = WRITERS[target as keyof typeof WRITERS];
  const instructions = write([inst(sourceInstructionName(source))]).some(f => f.path === instructionPath(target));
  const mcpOk = write([mcp()]).some(f => f.content.includes('fs'));
  const model = write([opaqueFor(source)]).some(f => extractModel(target, f.content) === 'test-model');
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
