import { describe, it, expect } from 'vitest';
import { stripJsonc, parseJsonc } from '../../../src/core/jsonc.js';

describe('stripJsonc', () => {
  it('leaves plain JSON untouched', () => {
    const json = '{"a":1,"b":[2,3]}';
    expect(stripJsonc(json)).toBe(json);
  });

  it('strips full-line and end-of-line comments', () => {
    const input = `{
  // provider comment
  "a": 1, // trailing comment
  "b": 2
}`;
    expect(JSON.parse(stripJsonc(input))).toEqual({ a: 1, b: 2 });
  });

  it('strips block comments including multi-line', () => {
    const input = `{
  /* multi
     line */
  "a": /* inline */ 1
}`;
    expect(JSON.parse(stripJsonc(input))).toEqual({ a: 1 });
  });

  it('strips trailing commas in objects and arrays', () => {
    const input = '{"a":[1,2,],"b":{"c":3,}}';
    expect(JSON.parse(stripJsonc(input))).toEqual({ a: [1, 2], b: { c: 3 } });
  });

  it('keeps // inside strings (urls) intact', () => {
    const input = '{"url":"https://mcp.example.com/mcp"}';
    expect(JSON.parse(stripJsonc(input))).toEqual({ url: 'https://mcp.example.com/mcp' });
  });

  it('keeps /* inside strings intact', () => {
    const input = '{"pattern":"a/*b*/c"}';
    expect(JSON.parse(stripJsonc(input))).toEqual({ pattern: 'a/*b*/c' });
  });

  it('handles escaped quotes inside strings', () => {
    const input = '{"s":"say \\"hi // there\\""}';
    expect(JSON.parse(stripJsonc(input))).toEqual({ s: 'say "hi // there"' });
  });

  it('drops trailing comma after a comment before a closing brace', () => {
    const input = `{"a":1, // c
    }`;
    expect(JSON.parse(stripJsonc(input))).toEqual({ a: 1 });
  });
});

describe('parseJsonc', () => {
  it('parses a commented config with trailing commas', () => {
    const config = parseJsonc(`{
      // main model
      "model": "m",
      "mcp": { "fs": { "command": ["npx", "-y", "pkg"], } },
    }`);
    expect(config).toEqual({ model: 'm', mcp: { fs: { command: ['npx', '-y', 'pkg'] } } });
  });

  it('throws on genuinely malformed json', () => {
    expect(() => parseJsonc('{ nope')).toThrow();
  });
});
