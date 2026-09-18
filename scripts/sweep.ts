/**
 * Full-migration sweep: every supported source agent migrated to every
 * other supported agent, through the real CLI, then doctor-validated.
 *
 * For each of the 12×11 pairs, a fresh temp dir is seeded with ONLY the
 * source's files (marker config with two MCP servers — one command-based
 * with env, one url-based — plus the agent's instruction file), migrated,
 * and the result is checked:
 *   1. the target agent is detected in the result dir
 *   2. `doctor` reports zero errors on the result dir
 *   3. the instruction content arrived at the target's documented path
 *   4. both MCP servers arrived (names + url + env preserved)
 *   5. the source's own files were not modified
 *
 * Run: npx tsx scripts/sweep.ts   (exit 1 on any failure)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';

const run = promisify(execFile);
// `npx` is a .cmd shim on Windows and Node refuses to spawn .cmd without a
// shell (CVE-2024-27980 hardening); run tsx's real entry via node, which is
// what `npx tsx` resolves to anyway.
const CLI = [process.execPath, createRequire(import.meta.url).resolve('tsx/cli'), 'src/cli/main.ts'];

const AGENTS = ['claude-code', 'opencode', 'kilo', 'cursor', 'gemini', 'codex', 'copilot', 'crush', 'grok', 'omp', 'muse-code', 'pi'] as const;
type Agent = (typeof AGENTS)[number];

/** The instruction file each agent reads (mirrors the scanners). */
const INSTRUCTION_FILE: Record<Agent, string> = {
  'claude-code': 'AGENTS.md',
  'opencode': 'AGENTS.md',
  'kilo': 'AGENTS.md',
  'cursor': 'AGENTS.md',
  'gemini': 'GEMINI.md',
  'codex': 'AGENTS.md',
  'copilot': '.github/copilot-instructions.md',
  'crush': 'AGENTS.md',
  'grok': 'AGENTS.md',
  'omp': 'AGENTS.md',
  'muse-code': 'MUSE_CODE.md',
  'pi': 'AGENTS.md',
};

const RULES = '# Shared project rules\n- Keep changes minimal.\n';
const CMD = { command: 'echo-server', args: ['--port', '8080'], env: { API_KEY: 'k' } };
const URL = { url: 'https://example.invalid/mcp' };

/** Seed a dir so exactly `source` is detected, with instructions + 2 servers. */
async function seed(dir: string, source: Agent): Promise<void> {
  const json = (v: unknown) => JSON.stringify(v, null, 2);
  const servers = { 'fs': CMD, 'web': URL };
  const write = (rel: string, content: string) =>
    fs.mkdir(path.dirname(path.join(dir, rel)), { recursive: true })
      .then(() => fs.writeFile(path.join(dir, rel), content));

  switch (source) {
    case 'claude-code':
      await write('AGENTS.md', RULES);
      await write('.claude/settings.json', json({ model: 'm1', mcpServers: servers }));
      break;
    case 'opencode': // real-world commented jsonc
      await write('AGENTS.md', RULES);
      await write('opencode.jsonc', '{\n  // opencode config\n  "model": "m1",\n  "mcpServers": ' + json(servers) + '\n}');
      break;
    case 'kilo': // kilo dialect: command array + environment
      await write('AGENTS.md', RULES);
      await write('.kilo/kilo.jsonc', json({
        model: 'm1',
        mcp: { 'fs': { type: 'local', command: ['echo-server', '--port', '8080'], environment: { API_KEY: 'k' } }, 'web': { type: 'remote', url: URL.url } },
      }));
      break;
    case 'cursor': // cursor schema requires type: "stdio" on command servers
      await write('AGENTS.md', RULES);
      await write('.cursor/mcp.json', json({ mcpServers: { 'fs': { ...CMD, type: 'stdio' }, 'web': URL } }));
      break;
    case 'gemini': // gemini schema forbids transport tags
      await write('GEMINI.md', RULES);
      await write('.gemini/settings.json', json({ mcpServers: servers }));
      break;
    case 'codex': // codex dialect: TOML
      await write('AGENTS.md', RULES);
      await write('.codex/config.toml', 'model = "m1"\n\n[mcp_servers.fs]\ncommand = "echo-server"\nargs = ["--port", "8080"]\n\n[mcp_servers.fs.env]\nAPI_KEY = "k"\n\n[mcp_servers.web]\nurl = "https://example.invalid/mcp"\n');
      break;
    case 'copilot':
      await write('.github/copilot-instructions.md', RULES);
      await write('.copilot/mcp-config.json', json({ mcpServers: servers }));
      break;
    case 'crush': // crush schema requires a type on every server
      await write('AGENTS.md', RULES);
      await write('.crush.json', json({ mcp: { 'fs': { ...CMD, type: 'stdio' }, 'web': { ...URL, type: 'http' } } }));
      break;
    case 'grok':
      await write('AGENTS.md', RULES);
      await write('.mcp.json', json({ mcpServers: servers }));
      break;
    case 'omp':
      await write('AGENTS.md', RULES);
      await write('.pi/mcp.json', json({ mcpServers: servers }));
      break;
    case 'muse-code': // marker IS the instruction file
      await write('MUSE_CODE.md', RULES);
      break;
    case 'pi': // bare .pi dir is pi's marker (omp owns .pi/mcp.json)
      await write('AGENTS.md', RULES);
      await fs.mkdir(path.join(dir, '.pi'));
      break;
  }
}

/** The files the source scan reads — must be byte-identical after migrating away. */
async function sourceFiles(dir: string, source: Agent): Promise<string[]> {
  const configs: Partial<Record<Agent, string>> = {
    'claude-code': '.claude/settings.json',
    'opencode': 'opencode.jsonc',
    'kilo': '.kilo/kilo.jsonc',
    'cursor': '.cursor/mcp.json',
    'gemini': '.gemini/settings.json',
    'codex': '.codex/config.toml',
    'copilot': '.copilot/mcp-config.json',
    'crush': '.crush.json',
    'grok': '.mcp.json',
    'omp': '.pi/mcp.json',
    // muse-code & pi: no separate config file (marker IS the doc / bare dir)
  };
  const files = [INSTRUCTION_FILE[source]];
  const config = configs[source];
  if (config) files.push(config);
  if (source === 'pi') files.push('.pi'); // dir marker; contents unchecked
  return files;
}

async function cli(args: string[]): Promise<{ code: number; out: string; err: string }> {
  try {
    const { stdout, stderr } = await run(CLI[0], [...CLI.slice(1), ...args], { cwd: path.resolve('.') });
    return { code: 0, out: stdout, err: stderr };
  } catch (e: unknown) {
    const err = e as { code: number; stdout: string; stderr: string };
    return { code: err.code ?? 1, out: err.stdout ?? '', err: err.stderr ?? '' };
  }
}

async function main(): Promise<number> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-sweep-'));
  const failures: string[] = [];
  let passed = 0;

  for (const source of AGENTS) {
    for (const target of AGENTS) {
      if (source === target) continue;
      const dir = path.join(root, `${source}__${target}`);
      await fs.mkdir(dir);
      await seed(dir, source);
      const before = await Promise.all(
        (await sourceFiles(dir, source)).map(async rel =>
          [rel, await fs.readFile(path.join(dir, rel), 'utf-8').catch(() => null)] as const),
      );

      const mig = await cli(['migrate', source, target, dir]);
      const problems: string[] = [];
      if (mig.code !== 0) problems.push(`migrate exit ${mig.code}: ${mig.err.split('\n')[0]}`);

      if (problems.length === 0) {
        // muse-code and pi have no project MCP config: migrations FROM them
        // are instructions-only, so no target config marker is created and
        // marker-based detection legitimately stays silent afterwards.
        const HAS_MCP: Partial<Record<Agent, boolean>> = {
          'muse-code': false, 'pi': false,
        };
        const sourceHasMcp = HAS_MCP[source] !== false;

        // 1. target detected — pi's marker is a bare .pi dir no writer
        //    creates, and instructions-only migrations (muse-code, pi as
        //    source) create no config marker at all.
        const scan = await cli(['scan', dir]);
        if (target !== 'pi' && sourceHasMcp && (scan.code !== 0 || !scan.out.includes(`(id: ${target})`))) {
          problems.push(`target ${target} not detected after migrate`);
        }

        // 2. doctor: zero errors
        const doc = await cli(['doctor', dir]);
        if (doc.code !== 0) problems.push(`doctor failed: ${(doc.out + doc.err).split('\n').find(l => l.includes('✗')) ?? 'exit ' + doc.code}`);

        // 3. instructions content at the target's documented path
        const instrPath = path.join(dir, INSTRUCTION_FILE[target]);
        const instr = await fs.readFile(instrPath, 'utf-8').catch(() => null);
        if (instr !== RULES) problems.push(`instructions missing/changed at ${INSTRUCTION_FILE[target]}`);

        // 4. both servers arrived in the TARGET's config (names + url + env
        //    survive the dialect) — only when the source actually had servers
        //    and the target can hold them.
        if (sourceHasMcp && HAS_MCP[target] !== false) {
          const targetConfigs: Record<Agent, string[]> = {
            'claude-code': ['.claude/settings.json'],
            'opencode': ['opencode.jsonc', 'opencode.json'],
            'kilo': ['.kilo/kilo.jsonc'],
            'cursor': ['.cursor/mcp.json'],
            'gemini': ['.gemini/settings.json'],
            'codex': ['.codex/config.toml'],
            'copilot': ['.copilot/mcp-config.json'],
            'crush': ['.crush.json'],
            'grok': ['.mcp.json'],
            'omp': ['.pi/mcp.json'],
            'muse-code': [],
            'pi': [],
          };
          const texts = (await Promise.all(
            targetConfigs[target].map(rel => fs.readFile(path.join(dir, rel), 'utf-8').catch(() => '')),
          )).join('\n');
          for (const marker of ['echo-server', '8080', 'API_KEY', URL.url]) {
            if (!texts.includes(marker)) problems.push(`server data lost: "${marker}" not in ${target}'s config`);
          }
        }

        // 5. source files untouched
        for (const [rel, content] of before) {
          const after = rel.endsWith('/.pi') || rel === '.pi'
            ? null
            : await fs.readFile(path.join(dir, rel), 'utf-8').catch(() => null);
          if (after !== null && after !== content) problems.push(`source file ${rel} was modified`);
        }
      }

      if (problems.length > 0) {
        failures.push(`${source} → ${target}: ${problems.join('; ')}`);
        console.log(`  ✗ ${source} → ${target}: ${problems.join('; ')}`);
      } else {
        passed++;
        console.log(`  ✓ ${source} → ${target}`);
      }
    }
  }

  console.log(`\nSweep: ${passed}/${AGENTS.length * (AGENTS.length - 1)} pairs passed, ${failures.length} failed`);
  console.log(`(results in ${root})`);
  return failures.length > 0 ? 1 : 0;
}

main().then(code => process.exit(code)).catch(err => { console.error(err); process.exit(1); });
