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
    const files = writeOpenCodeFiles(resources);
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
    const files = writeOpenCodeFiles(resources);
    expect(files.some(f => f.path === 'opencode.json')).toBe(true);
  });

  it('translates MCP servers to OpenCode format', () => {
    const resources: CanonicalResource[] = [{
      id: 'mcp-1', type: 'mcpServers', name: 'filesystem',
      content: '{"command":"npx","args":["-y","@modelcontextprotocol/server-filesystem"],"env":{"KEY":"val"}}',
      provenance: { sourceAgent: 'claude-code', sourcePath: '.claude/settings.json', scope: 'project', originalHash: 'mcp1' }
    }];
    const files = writeOpenCodeFiles(resources);
    expect(files.length).toBe(1);
    const config = JSON.parse(files[0].content);
    expect(config.mcpServers.filesystem.type).toBe('stdio');
    expect(config.mcpServers.filesystem.command).toBe('npx');
    expect(config.mcpServers.filesystem.args).toEqual(['-y', '@modelcontextprotocol/server-filesystem']);
    expect(config.mcpServers.filesystem.env).toEqual({ KEY: 'val' });
  });

  it('merges MCP servers with settings into opencode.json', () => {
    const resources: CanonicalResource[] = [
      { id: 'op-1', type: 'opaque', name: '.claude/settings.json',
        content: '{"model":"claude-sonnet"}',
        provenance: { sourceAgent: 'claude-code', sourcePath: '.claude/settings.json', scope: 'project', originalHash: 'a' } },
      { id: 'mcp-1', type: 'mcpServers', name: 'github',
        content: '{"command":"npx","args":["-y","@modelcontextprotocol/server-github"]}',
        provenance: { sourceAgent: 'claude-code', sourcePath: '.claude/settings.json', scope: 'project', originalHash: 'b' } }
    ];
    const files = writeOpenCodeFiles(resources);
    const ocFile = files.find(f => f.path === 'opencode.json');
    expect(ocFile).toBeDefined();
    const config = JSON.parse(ocFile!.content);
    expect(config.model).toBe('claude-sonnet');
    expect(config.mcpServers.github.type).toBe('stdio');
    expect(config.mcpServers.github.command).toBe('npx');
  });

  it('omits unsupported resources from output', () => {
    const resources: CanonicalResource[] = [{
      id: 'hook-1', type: 'hooks', name: 'pre-commit',
      content: '#!/bin/bash\necho hook',
      provenance: { sourceAgent: 'claude-code', sourcePath: '.claude/hooks/pre-commit', scope: 'project', originalHash: 'ghi' }
    }];
    const files = writeOpenCodeFiles(resources);
    expect(files.length).toBe(0);
  });
});
