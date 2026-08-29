import { describe, it, expect } from 'vitest';
import { writeOpenCodeFiles } from '../../../src/adapters/opencode/writer.js';
import { CanonicalResource } from '../../../src/core/normalize/normalizer.js';

describe('OpenCode Target Writer', () => {
  it('generates AGENTS.md from instructions', () => {
    const resources: CanonicalResource[] = [{
      id: 'inst-1', type: 'instructions', name: 'AGENTS.md',
      content: '# Test Instructions\nBe helpful.',
      provenance: { sourceAgent: 'claude-code', sourcePath: 'AGENTS.md', scope: 'project', originalHash: 'abc' }
    }];
    const files = writeOpenCodeFiles(resources, '/target');
    expect(files.length).toBe(1);
    expect(files[0].path).toBe('AGENTS.md');
    expect(files[0].content).toContain('Test Instructions');
    expect(files[0].action).toBe('create');
  });

  it('generates opencode.json from opaque settings', () => {
    const resources: CanonicalResource[] = [{
      id: 'op-1', type: 'opaque', name: '.claude/settings.json',
      content: '{"model":"claude-sonnet","permissions":{"allow":["read"]}}',
      provenance: { sourceAgent: 'claude-code', sourcePath: '.claude/settings.json', scope: 'project', originalHash: 'def' }
    }];
    const files = writeOpenCodeFiles(resources, '/target');
    expect(files.some(f => f.path === 'opencode.json')).toBe(true);
  });

  it('skips unsupported resources', () => {
    const resources: CanonicalResource[] = [{
      id: 'hook-1', type: 'hooks', name: 'pre-commit',
      content: '#!/bin/bash\necho hook',
      provenance: { sourceAgent: 'claude-code', sourcePath: '.claude/hooks/pre-commit', scope: 'project', originalHash: 'ghi' }
    }];
    const files = writeOpenCodeFiles(resources, '/target');
    expect(files.some(f => f.action === 'skip')).toBe(true);
  });
});
