import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { geminiAdapter } from '../../src/adapters/simple-agents.js';

const FIXTURE = path.resolve('tests/fixtures/gemini-basic');

describe('Gemini scanner', () => {
  it('detects Gemini CLI project', async () => {
    const result = await geminiAdapter.detect({ root: FIXTURE });
    expect(result.detected).toBe(true);
  });

  it('does not detect non-Gemini project', async () => {
    const result = await geminiAdapter.detect({ root: '/tmp' });
    expect(result.detected).toBe(false);
  });

  it('scans Gemini project correctly', async () => {
    const bundle = await geminiAdapter.scanProject({ root: FIXTURE });
    expect(bundle.instructions.length).toBe(1);
    expect(bundle.instructions[0].name).toBe('GEMINI.md');
    expect(bundle.mcpServers.length).toBe(1);
    expect(bundle.mcpServers[0].name).toBe('filesystem');
    expect(bundle.opaque.length).toBe(1);
    expect(bundle.opaque[0].name).toBe('.gemini/settings.json');
  });
});
