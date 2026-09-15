import { describe, it, expect } from 'vitest';
import { parseToml, serializeToml } from '../../../src/core/toml.js';

describe('parseToml (minimal subset)', () => {
  it('parses tables, strings, arrays, booleans, numbers', () => {
    const doc = parseToml(`
# comment
model = "gpt-5"
sandbox = true
retries = 3

[mcp_servers.fs]
command = "npx"
args = ["-y", "pkg"]
`);
    expect(doc).toEqual({
      model: 'gpt-5',
      sandbox: true,
      retries: 3,
      mcp_servers: { fs: { command: 'npx', args: ['-y', 'pkg'] } },
    });
  });

  it('parses inline tables', () => {
    const doc = parseToml(`[mcp_servers.fs]
env = { "KEY" = "value" }`);
    expect(doc).toEqual({ mcp_servers: { fs: { env: { KEY: 'value' } } } });
  });

  it('keeps # inside strings', () => {
    expect(parseToml(`a = "x # y"`)).toEqual({ a: 'x # y' });
  });

  it('throws on unsupported syntax (dates, multiline strings)', () => {
    expect(() => parseToml(`d = 2026-09-14`)).toThrow();
    expect(() => parseToml(`s = """\nblock\n"""`)).toThrow(/unsupported/i);
  });
});

describe('serializeToml', () => {
  it('round-trips a parsed doc semantically (inline tables re-emit as section tables — valid TOML, same data)', () => {
    const src = `model = "gpt-5"\n\n[mcp_servers.fs]\ncommand = "npx"\nargs = ["-y", "pkg"]\nenv = { "KEY" = "value" }\n`;
    expect(parseToml(serializeToml(parseToml(src)))).toEqual(parseToml(src));
    // and section-table form round-trips byte-exactly:
    const section = `model = "gpt-5"\n\n[mcp_servers.fs]\ncommand = "npx"\nargs = ["-y", "pkg"]\n\n[mcp_servers.fs.env]\nKEY = "value"\n`;
    expect(serializeToml(parseToml(section))).toBe(section);
  });

  it('emits nested tables after scalars', () => {
    const out = serializeToml({ mcp_servers: { fs: { command: 'npx' } }, model: 'm' });
    expect(out).toBe(`model = "m"\n\n[mcp_servers.fs]\ncommand = "npx"\n`);
  });
});
