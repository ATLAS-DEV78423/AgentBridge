/**
 * Minimal TOML subset for .codex/config.toml: section tables ([a.b]),
 * dotted inline tables, basic strings, arrays, booleans, ints/floats.
 * Deliberately not a full TOML implementation — multi-line strings,
 * dates, and array-of-tables throw loudly instead of mis-parsing.
 */
export function parseToml(src: string): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  let current: Record<string, unknown> = root;

  const lines = src.split('\n');
  for (let idx = 0; idx < lines.length; idx++) {
    const line = trimComment(lines[idx]).trim();
    if (!line) continue;

    const header = line.match(/^\[([^\]]+)\]$/);
    if (header) {
      current = root;
      for (const part of header[1].split('.').map(p => p.trim().replace(/^"(.*)"$/, '$1'))) {
        if (typeof current[part] !== 'object' || current[part] === null) current[part] = {};
        current = current[part] as Record<string, unknown>;
      }
      continue;
    }

    const kv = line.match(/^([^=]+?)\s*=\s*(.+)$/);
    if (!kv) throw new Error(`toml: unsupported line (array-of-tables, stray text, multiline strings?): ${line}`);
    const key = kv[1].trim().replace(/^"(.*)"$/, '$1');
    current[key] = parseValue(kv[2].trim());
  }
  return root;
}

function trimComment(line: string): string {
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === '#') return line.slice(0, i);
  }
  return line;
}

function parseValue(raw: string): unknown {
  if (raw.startsWith('"""') || raw.startsWith("''")) {
    throw new Error(`toml: unsupported multi-line string: ${raw.slice(0, 20)}`);
  }
  if (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) {
    return raw.slice(1, -1).replace(/\\["\\]/g, c => (c === '\\"' ? '"' : '\\'));
  }
  if (raw.startsWith('{') && raw.endsWith('}')) {
    const inner = raw.slice(1, -1).trim();
    const obj: Record<string, unknown> = {};
    if (!inner) return obj;
    for (const part of splitTopLevel(inner, ',')) {
      const kv = part.match(/^([^=]+?)\s*=\s*(.+)$/);
      if (!kv) throw new Error(`toml: unsupported inline table syntax: ${part}`);
      obj[kv[1].trim().replace(/^"(.*)"$/, '$1')] = parseValue(kv[2].trim());
    }
    return obj;
  }
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const inner = raw.slice(1, -1).trim();
    if (!inner) return [];
    return splitTopLevel(inner, ',').map(p => parseValue(p.trim()));
  }
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^-?\d+$/.test(raw)) return parseInt(raw, 10);
  if (/^-?\d*\.\d+$/.test(raw)) return parseFloat(raw);
  throw new Error(`toml: unsupported value (dates, multiline strings, etc.): ${raw}`);
}

/** Split on a delimiter, ignoring delimiters inside strings/brackets/braces. */
function splitTopLevel(s: string, delim: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inString = false;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') depth--;
    else if (c === delim && depth === 0) {
      parts.push(s.slice(start, i));
      start = i + 1;
    }
  }
  if (start < s.length) parts.push(s.slice(start));
  return parts;
}

export function serializeToml(doc: Record<string, unknown>): string {
  const out: string[] = [];
  const tableEntries = new Map<string, string[]>();

  const scalarLine = (key: string, value: unknown): string => `${key} = ${serializeValue(value)}`;

  const emitTable = (path: string, value: Record<string, unknown>): void => {
    for (const [key, v] of Object.entries(value)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        emitTable(`${path}.${key}`, v as Record<string, unknown>);
      } else {
        tableEntries.set(path, [...(tableEntries.get(path) ?? []), scalarLine(key, v)]);
      }
    }
  };

  for (const [key, value] of Object.entries(doc)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      emitTable(key, value as Record<string, unknown>);
    } else {
      out.push(scalarLine(key, value));
    }
  }

  let text = out.length ? out.join('\n') + '\n' : '';
  for (const [path, entries] of tableEntries) {
    text += `${text ? '\n' : ''}[${path}]\n${entries.join('\n')}\n`;
  }
  return text;
}

function serializeValue(value: unknown): string {
  if (typeof value === 'string') return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return `[${value.map(serializeValue).join(', ')}]`;
  if (value && typeof value === 'object') {
    const inner = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k} = ${serializeValue(v)}`)
      .join(', ');
    return `{ ${inner} }`;
  }
  throw new Error(`toml: cannot serialize value: ${String(value)}`);
}
