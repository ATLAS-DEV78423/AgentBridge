import { describe, it, expect } from 'vitest';
import { normalizeBundle, groupByType } from '../../../src/core/normalize/normalizer.js';
import { AgentBundle } from '../../../src/core/model/types.js';

const MOCK_BUNDLE: AgentBundle = {
  schemaVersion: '1.0.0',
  metadata: { name: 'test', sourceAgent: { id: 'claude-code', name: 'Claude Code' } },
  instructions: [{ id: 'instruction-AGENTS.md', type: 'instruction', name: 'AGENTS.md', content: 'test', provenance: { sourceAgent: 'claude-code', sourcePath: 'AGENTS.md', scope: 'project', originalHash: 'abc' } }],
  skills: [],
  commands: [],
  agents: [],
  mcpServers: [{ id: 'mcpServer-fs', type: 'mcpServer', name: 'filesystem', content: '{}', provenance: { sourceAgent: 'claude-code', sourcePath: 'config', scope: 'project', originalHash: 'def' } }],
  permissions: [],
  hooks: [],
  opaque: [{ id: 'opaque-config', type: 'settings', name: 'settings.json', content: '{}', provenance: { sourceAgent: 'claude-code', sourcePath: '.claude/settings.json', scope: 'project', originalHash: 'ghi' } }]
};

describe('normalizer', () => {
  it('flattens bundle into resources', () => {
    const resources = normalizeBundle(MOCK_BUNDLE);
    expect(resources.length).toBe(3);
  });

  it('preserves resource data', () => {
    const resources = normalizeBundle(MOCK_BUNDLE);
    const instr = resources.find(r => r.name === 'AGENTS.md');
    expect(instr).toBeDefined();
    expect(instr!.content).toBe('test');
  });

  it('groups by type', () => {
    const resources = normalizeBundle(MOCK_BUNDLE);
    const groups = groupByType(resources);
    expect(groups.has('instructions')).toBe(true);
    expect(groups.has('mcpServers')).toBe(true);
    expect(groups.get('instructions')!.length).toBe(1);
  });
});
