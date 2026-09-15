import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { planMigration } from '../../../src/core/pipeline.js';
import '../../../src/adapters/registry.js';
import { ResourceBase } from '../../../src/core/model/types.js';

const AGENTS = [
  'claude-code', 'opencode', 'kilo', 'cursor', 'gemini',
  'codex', 'copilot', 'crush', 'grok', 'omp', 'muse-code', 'pi',
] as const;

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

const inst = (name: string): ResourceBase => ({ id: 'i', type: 'instructions', name, content: '# R' } as ResourceBase);
const mcp = (): ResourceBase => ({ id: 'm', type: 'mcpServers', name: 'fs', content: JSON.stringify({ command: 'npx', args: ['-y', 'm'] }) } as ResourceBase);

function sourceInstructionName(source: string): string {
  return source === 'gemini' ? 'GEMINI.md' : source === 'muse-code' ? 'MUSE_CODE.md' : 'AGENTS.md';
}

/** The real production path: planMigration probes the target's actual writer. */
function migrates(source: string, target: string): { instructions: boolean; mcp: boolean; model: boolean } {
  const supports = (r: ResourceBase): boolean =>
    planMigration(source, target, [r])[0].status !== 'UNSUPPORTED';
  return {
    instructions: supports(inst(sourceInstructionName(source))),
    mcp: supports(mcp()),
    // Model settings flow only if the source has them AND the target's
    // writer maps them (probe is emission-based: a target like claude
    // emits a config for any parseable opaque, model or not).
    model: HAS_MODEL_SOURCES.has(source) && supports(opaqueFor(source)),
  };
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
