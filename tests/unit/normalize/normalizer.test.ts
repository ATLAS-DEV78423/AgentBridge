import { describe, it, expect } from 'vitest';
import { normalizeBundle } from '../../../src/core/normalize/normalizer.js';
import { AgentBundle } from '../../../src/core/model/types.js';

describe('Normalizer', () => {
  it('normalizes a simple bundle', () => {
    const bundle: AgentBundle = {
      schemaVersion: '1.0.0',
      metadata: { name: 'test', sourceAgent: { id: 'claude-code', name: 'Claude Code' } },
      instructions: [{
        id: 'inst-1', type: 'instruction', name: 'AGENTS.md', content: '# Test',
        provenance: { sourceAgent: 'claude-code', sourcePath: 'AGENTS.md', scope: 'project', originalHash: 'abc123' }
      }],
      skills: [], commands: [], agents: [], mcpServers: [], permissions: [], hooks: [], opaque: []
    };
    const resources = normalizeBundle(bundle);
    expect(resources.length).toBe(1);
    expect(resources[0].capability).toBe('instruction');
  });

  it('marks opaque resources', () => {
    const bundle: AgentBundle = {
      schemaVersion: '1.0.0', metadata: { name: 'test' },
      instructions: [], skills: [], commands: [], agents: [], mcpServers: [], permissions: [], hooks: [],
      opaque: [{
        id: 'op-1', type: 'opaque', name: 'settings.json', content: '{}',
        provenance: { sourceAgent: 'claude-code', sourcePath: 'settings.json', scope: 'project', originalHash: 'def' }
      }]
    };
    const resources = normalizeBundle(bundle);
    expect(resources[0].capability).toBe('opaque');
  });

  it('preserves provenance', () => {
    const bundle: AgentBundle = {
      schemaVersion: '1.0.0', metadata: { name: 'test' },
      instructions: [{
        id: 'inst-1', type: 'instruction', name: 'AGENTS.md', content: '',
        provenance: { sourceAgent: 'claude-code', sourcePath: 'AGENTS.md', scope: 'project', originalHash: 'abc' }
      }],
      skills: [], commands: [], agents: [], mcpServers: [], permissions: [], hooks: [], opaque: []
    };
    const resources = normalizeBundle(bundle);
    expect(resources[0].provenance.sourceAgent).toBe('claude-code');
  });
});
