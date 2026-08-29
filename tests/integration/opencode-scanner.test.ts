import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { detectOpenCode } from '../../src/adapters/opencode/detector.js';
import { scanOpenCodeProject } from '../../src/adapters/opencode/scanner.js';

const FIXTURE = path.resolve('tests/fixtures/opencode-basic');

describe('OpenCode scanner', () => {
  it('detects OpenCode project', async () => {
    const result = await detectOpenCode({ root: FIXTURE });
    expect(result.detected).toBe(true);
    expect(result.agent).toBe('opencode');
  });

  it('does not detect non-OpenCode project', async () => {
    const result = await detectOpenCode({ root: '/tmp' });
    expect(result.detected).toBe(false);
  });

  it('scans OpenCode project correctly', async () => {
    const bundle = await scanOpenCodeProject({ root: FIXTURE });
    expect(bundle.metadata.sourceAgent?.id).toBe('opencode');
    expect(bundle.instructions.length).toBe(1);
    expect(bundle.instructions[0].name).toBe('AGENTS.md');
    expect(bundle.mcpServers.length).toBe(1);
    expect(bundle.mcpServers[0].name).toBe('filesystem');
  });
});
