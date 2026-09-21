import { describe, it, expect } from 'vitest';
import { writerSupports } from '../../../src/core/writers.js';
import '../../../src/adapters/registry.js';
import { ResourceBase } from '../../../src/core/model/types.js';

const AGENTS = [
  'claude-code', 'opencode', 'kilo', 'cursor', 'gemini', 'codex',
  'copilot', 'crush', 'grok', 'omp', 'muse-code', 'pi', 'cline',
];

const res = (type: string, name: string, content = 'x'): ResourceBase =>
  ({ id: 't', type, name, content } as ResourceBase);

describe('writerSupports (plan derives status from the real writer)', () => {
  it('every writer supports instructions, normalizing agent-specific filenames', () => {
    for (const target of AGENTS) {
      expect(writerSupports(target, res('instructions', 'AGENTS.md')), target).toBe(true);
    }
    expect(writerSupports('claude-code', res('instructions', 'GEMINI.md'))).toBe(true);
    expect(writerSupports('claude-code', res('instructions', 'MUSE_CODE.md'))).toBe(true);
  });

  it('supports MCP servers exactly where a project MCP config exists', () => {
    const mcp = res('mcpServers', 'fs', '{"command":"npx"}');
    for (const target of ['claude-code', 'opencode', 'kilo', 'cursor', 'gemini', 'codex', 'copilot', 'crush', 'grok', 'omp']) {
      expect(writerSupports(target, mcp), target).toBe(true);
    }
    // muse-code, pi and cline document no project-scoped MCP config.
    for (const target of ['muse-code', 'pi', 'cline']) {
      expect(writerSupports(target, mcp), target).toBe(false);
    }
  });

  it('maps model settings only into targets that have a real place for them', () => {
    const probe = res('opaque', 'opaque.json', '{"model":"m"}');
    for (const target of ['claude-code', 'opencode', 'kilo', 'codex']) {
      expect(writerSupports(target, probe), target).toBe(true);
    }
    for (const target of ['cursor', 'gemini', 'copilot', 'crush', 'grok', 'omp', 'muse-code', 'pi', 'cline']) {
      expect(writerSupports(target, probe), target).toBe(false);
    }
  });

  it('returns false for unknown targets instead of throwing', () => {
    expect(writerSupports('nope', res('instructions', 'AGENTS.md'))).toBe(false);
  });
});
