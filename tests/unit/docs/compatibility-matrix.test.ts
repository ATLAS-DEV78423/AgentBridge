import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { planMigration } from '../../../src/core/pipeline.js';
import '../../../src/adapters/registry.js';
import { ResourceBase } from '../../../src/core/model/types.js';

const AGENTS = [
  'claude-code', 'opencode', 'kilo', 'cursor', 'gemini',
  'codex', 'copilot', 'crush', 'grok', 'omp', 'muse-code', 'pi', 'cline', 'windsurf',
] as const;
// A representative opaque config per source agent — what "model settings" means there.
// Agents whose project config carries no model produce no model migration anywhere.
const HAS_MODEL_SOURCES = new Set(['claude-code', 'opencode', 'kilo', 'codex']);

// Each source's config path, as a table rather than a ternary chain.
const CONFIG_PATH: Record<string, string> = {
  'claude-code': '.claude/settings.json',
  'opencode': 'opencode.jsonc',
  'kilo': '.kilo/kilo.jsonc',
  'codex': '.codex/config.toml',
  'gemini': '.gemini/settings.json',
  'cursor': '.cursor/mcp.json',
  'crush': '.crush.json',
  'omp': '.pi/mcp.json',
  'copilot': '.copilot/mcp-config.json',
  'grok': '.mcp.json',
  'windsurf': '.codeium/windsurf/mcp_config.json',
  'muse-code': 'MUSE_CODE.md',
};

const opaqueFor = (source: string): ResourceBase => ({
  type: 'opaque',
  name: CONFIG_PATH[source],
  content: JSON.stringify(HAS_MODEL_SOURCES.has(source) ? { model: 'test-model' } : { mcpServers: {} }),
});
const inst = (name: string): ResourceBase => ({ type: 'instructions', name, content: '# R' } as ResourceBase);
const mcp = (): ResourceBase => ({ type: 'mcpServers', name: 'fs', content: JSON.stringify({ command: 'npx', args: ['-y', 'm'] }) } as ResourceBase);

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
