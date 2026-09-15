import fs from 'node:fs/promises';
import path from 'node:path';
import { adapters } from '../adapters/registry.js';
import { parseJsonc } from './jsonc.js';
import { parseToml } from './toml.js';

export type DoctorProblem = {
  severity: 'error' | 'warning';
  file: string; // project-relative
  line?: number;
  message: string;
};

export type DoctorAgentReport = {
  agent: string;
  problems: DoctorProblem[];
};

/**
 * Doc-confirmed config schema facts per agent — the same facts the adapters
 * and writers encode. `transport` is the agent's documented MCP transport-tag
 * policy: crush requires type on every server, cursor requires it on stdio
 * servers, gemini/codex infer transport from shape and reject explicit tags,
 * others have no confirmed policy (null = don't check).
 */
type ConfigSpec = {
  configPaths: { path: string; format: 'json' | 'jsonc' | 'toml' }[];
  mcpKey: string | null;
  mcpKeyAliases?: Record<string, string>; // key found in file → what the agent expects
  transport: 'required-all' | 'required-stdio' | 'forbidden' | null;
};

const SPECS: Record<string, ConfigSpec> = {
  'claude-code': { configPaths: [{ path: '.claude/settings.json', format: 'json' }], mcpKey: 'mcpServers', transport: null },
  'opencode': { configPaths: [{ path: 'opencode.jsonc', format: 'jsonc' }, { path: 'opencode.json', format: 'json' }], mcpKey: 'mcpServers', transport: null },
  'kilo': { configPaths: [{ path: '.kilo/kilo.jsonc', format: 'jsonc' }, { path: '.kilo/config.json', format: 'json' }], mcpKey: 'mcp', mcpKeyAliases: { mcpServers: 'mcp' }, transport: null },
  'cursor': { configPaths: [{ path: '.cursor/mcp.json', format: 'json' }], mcpKey: 'mcpServers', transport: 'required-stdio' },
  'gemini': { configPaths: [{ path: '.gemini/settings.json', format: 'json' }], mcpKey: 'mcpServers', transport: 'forbidden' },
  'codex': { configPaths: [{ path: '.codex/config.toml', format: 'toml' }], mcpKey: 'mcp_servers', transport: 'forbidden' },
  'copilot': { configPaths: [{ path: '.copilot/mcp-config.json', format: 'json' }], mcpKey: 'mcpServers', transport: null },
  'crush': { configPaths: [{ path: '.crush.json', format: 'json' }], mcpKey: 'mcp', mcpKeyAliases: { mcpServers: 'mcp' }, transport: 'required-all' },
  'grok': { configPaths: [{ path: '.mcp.json', format: 'json' }], mcpKey: 'mcpServers', transport: null },
  'omp': { configPaths: [{ path: '.pi/mcp.json', format: 'json' }], mcpKey: 'mcpServers', transport: null },
  'muse-code': { configPaths: [], mcpKey: null, transport: null },
  'pi': { configPaths: [], mcpKey: null, transport: null },
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/** Best-effort line number from a JSON.parse error message. */
function lineOfParseError(err: unknown): number | undefined {
  const msg = err instanceof Error ? err.message : '';
  const line = msg.match(/line (\d+)/);
  if (line) return Number(line[1]);
  const pos = msg.match(/position (\d+)/);
  if (pos) return msg.slice(0, Number(pos[1])).split('\n').length;
  return undefined;
}

function parseDoc(format: string, raw: string): { doc?: Record<string, unknown>; error?: DoctorProblem } {
  try {
    if (format === 'toml') return { doc: parseToml(raw) };
    if (format === 'jsonc') return { doc: parseJsonc(raw) as Record<string, unknown> };
    return { doc: JSON.parse(raw) as Record<string, unknown> };
  } catch (err) {
    return {
      error: {
        severity: 'error',
        file: '',
        line: format === 'json' ? lineOfParseError(err) : undefined,
        message: `not valid ${format.toUpperCase()} — ${err instanceof Error ? err.message : 'parse error'}`,
      },
    };
  }
}

function checkServer(name: string, server: unknown, transport: ConfigSpec['transport'], agentLabel: string): string[] {
  const problems: string[] = [];
  if (!isPlainObject(server)) {
    return [`server "${name}" must be an object`];
  }
  if (server.url !== undefined && typeof server.url !== 'string') {
    problems.push(`server "${name}": url must be a string`);
  }
  const hasUrl = typeof server.url === 'string';
  if (!hasUrl) {
    if (server.command === undefined) {
      problems.push(`server "${name}" has neither command nor url`);
    } else if (typeof server.command !== 'string' && !Array.isArray(server.command)) {
      problems.push(`server "${name}": command must be a string (or array for local servers)`);
    }
  }
  if (transport === 'required-all' && !['stdio', 'http', 'sse'].includes(server.type as string)) {
    problems.push(`server "${name}" missing required type (stdio | http | sse) — ${agentLabel}'s schema requires it`);
  } else if (transport === 'required-stdio' && !hasUrl && server.type !== 'stdio') {
    problems.push(`server "${name}" missing type: "stdio" — required by ${agentLabel} for command servers`);
  } else if (transport === 'forbidden' && server.type !== undefined) {
    problems.push(`server "${name}" has type "${String(server.type)}" — ${agentLabel} infers transport from shape; this field is not part of its config schema`);
  }
  return problems;
}

/**
 * Validate every detected agent's config against its documented schema.
 * Detection reuses the adapters' own detectors; validation is generic and
 * driven by the per-agent spec table above.
 */
export async function doctor(projectPath: string): Promise<DoctorAgentReport[]> {
  const reports: DoctorAgentReport[] = [];

  for (const [agentId, adapter] of Object.entries(adapters)) {
    const { detected } = await adapter.detect({ root: projectPath });
    if (!detected) continue;

    const spec = SPECS[agentId];
    const problems: DoctorProblem[] = [];

    let found: { raw: string; rel: string; format: string } | null = null;
    for (const { path: rel, format } of spec.configPaths) {
      try {
        found = { raw: await fs.readFile(path.join(projectPath, rel), 'utf-8'), rel, format };
        break;
      } catch { /* try next candidate */ }
    }

    if (found) {
      const problem = (p: Omit<DoctorProblem, 'file'>): DoctorProblem => ({ ...p, file: found!.rel });
      const { doc, error } = parseDoc(found.format, found.raw);

      if (error) {
        if (found.format === 'json') {
          // JSONC is a strict JSON superset — if it parses as JSONC the file
          // carries comments/trailing commas, which strict parsers choke on.
          try {
            parseJsonc(found.raw);
            problems.push(problem({
              severity: 'error',
              line: error.line,
              message: `file is not valid JSON (comments or trailing commas) — strict parsers skip it and its MCP servers would never migrate; rename to .jsonc or remove them`,
            }));
          } catch {
            problems.push(problem(error));
          }
        } else {
          problems.push(problem(error));
        }
      } else if (isPlainObject(doc)) {
        if (spec.mcpKey) {
          const servers = doc[spec.mcpKey];
          if (servers !== undefined && !isPlainObject(servers)) {
            problems.push(problem({ severity: 'error', message: `"${spec.mcpKey}" must be an object of server configs` }));
          } else if (isPlainObject(servers)) {
            for (const [name, server] of Object.entries(servers)) {
              for (const message of checkServer(name, server, spec.transport, agentId)) {
                problems.push(problem({ severity: 'error', message }));
              }
            }
          } else if (spec.mcpKeyAliases && Object.keys(spec.mcpKeyAliases).some(alias => alias in doc)) {
            for (const [alias, expected] of Object.entries(spec.mcpKeyAliases)) {
              if (alias in doc && !(spec.mcpKey in doc)) {
                problems.push(problem({ severity: 'warning', message: `found "${alias}" but ${agentId} expects "${expected}" — this config's servers will not load` }));
              }
            }
          }
        }
      } else {
        problems.push(problem({ severity: 'error', message: 'top-level value must be an object' }));
      }
    }

    reports.push({ agent: agentId, problems });
  }

  return reports.sort((a, b) => a.agent.localeCompare(b.agent));
}
