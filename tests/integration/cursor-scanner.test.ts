import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { detectCursor } from '../../src/adapters/cursor/detector.js';
import { scanCursorProject } from '../../src/adapters/cursor/scanner.js';

const FIXTURE = path.resolve('tests/fixtures/cursor-basic');

describe('Cursor scanner', () => {
  it('detects Cursor project', async () => {
    const result = await detectCursor({ root: FIXTURE });
    expect(result.detected).toBe(true);
    expect(result.agent).toBe('cursor');
  });

  it('does not detect non-Cursor project', async () => {
    const result = await detectCursor({ root: '/tmp' });
    expect(result.detected).toBe(false);
  });

  it('scans Cursor project correctly', async () => {
    const bundle = await scanCursorProject({ root: FIXTURE });
    expect(bundle.sourceAgent).toBe('Cursor');
    expect(bundle.instructions.length).toBe(1);
    expect(bundle.mcpServers.length).toBe(1);
    expect(bundle.mcpServers[0].name).toBe('filesystem');
    expect(bundle.opaque.length).toBe(1);
    expect(bundle.opaque[0].name).toBe('.cursor/mcp.json');
  });
});
