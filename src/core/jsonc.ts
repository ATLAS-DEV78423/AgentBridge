/**
 * Minimal JSONC (JSON with comments) support — enough for kilo.jsonc /
 * opencode.jsonc configs: strips // and block comments plus trailing
 * commas while leaving string contents untouched.
 */
export function stripJsonc(src: string): string {
  let out = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];

    if (inString) {
      out += c;
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }

    if (c === '"') {
      inString = true;
      out += c;
    } else if (c === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      out += '\n';
    } else if (c === '/' && next === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i++; // skip past closing '/'
    } else {
      out += c;
    }
  }

  // Trailing commas: `,\s*}` or `,\s*]` outside strings (strings were
  // preserved verbatim above, so this regex only sees structural JSON).
  return out.replace(/,(\s*[}\]])/g, '$1');
}

export function parseJsonc(src: string): unknown {
  return JSON.parse(stripJsonc(src));
}
