import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { cursorAdapter } from '../../src/adapters/simple-agents.js';

const FIXTURE = path.resolve('tests/fixtures/cursor-basic');

describe('Cursor scanner', () => {
  it('detects Cursor project', async () => {
    const result = await cursorAdapter.detect({ root: FIXTURE });
    expect(result.detected).toBe(true);
  });

  it('does not detect non-Cursor project', async () => {
    const result = await cursorAdapter.detect({ root: '/tmp' });
    expect(result.detected).toBe(false);
  });

  it('scans Cursor project correctly', async () => {
    const bundle = await cursorAdapter.scanProject({ root: FIXTURE });
    expect(bundle.instructions.length).toBe(1);
    expect(bundle.mcpServers.length).toBe(1);
    expect(bundle.mcpServers[0].name).toBe('filesystem');
    // the scanner normalizes to the canonical shape, so the transport tag
    // every other agent infers from shape is dropped here
    expect(JSON.parse(bundle.mcpServers[0].content!)).toEqual({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
    });
    expect(bundle.opaque.length).toBe(1);
    expect(bundle.opaque[0].name).toBe('.cursor/mcp.json');
  });
});
