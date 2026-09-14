# Expand Agents & Reverse Migrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the missing functionality (Kilo target writer was advertised but unimplemented) and enable reverse migrations (OpenCode → Claude Code, Kilo → Claude Code) alongside the existing Claude Code → OpenCode / Kilo Code direction.

**Architecture:** All migrations already flow one way through `scanProject()` → `flattenBundle()` → `planMigration()` → `writeFn()` → `applyTransaction()`. The MVP adapter contract (`detect` + `scanProject`) is enough for a source, and a target only needs a `WriteFn` registered in the writer registry. Each new direction is therefore: rules rows (source/target pair), one writer function, registry wiring — reusing the existing compatibility engine, transaction, and CLI unchanged. A shared rule-table generator replaces six hand-written rows per direction with three per pair.

**Tech Stack:** TypeScript (ESM, strict), Node ≥ 22 built-ins only (`node:fs/promises`, `node:path`), Vitest. Zero runtime dependencies — no new deps.

**Spec:** This plan implements the requirements established in this thread's exploration:
1. `agent-migrate migrate claude-code kilo` must work (README advertises ✅; `getWriter('kilo')` currently throws "Target writer for kilo not yet implemented").
2. Conversions must also run **to** Claude Code from other agents (OpenCode → Claude Code, Kilo → Claude Code), same scan/plan/diff/migrate/rollback UX.
3. MCP server configs are translated between formats in both directions (Claude's implicit stdio ↔ OpenCode's explicit `type: "stdio"`).
4. All agents work as scan sources for `scan`/`plan`/`diff` (they already do; reverse rules must make `plan opencode claude-code` report DIRECT/ADAPTED instead of UNSUPPORTED).
5. Repo hygiene from the ponytail audit: remove dead `'skip'` action, drop the tautological enum test, use `path.relative` in `createResource`.
6. Zero new runtime dependencies; `AGENTS.md` ponytail rules apply (shortest diff, no unrequested abstractions, one runnable check per non-trivial unit — covered by the vitest suites here).

## Global Constraints

- Node ≥ 22, ESM (`"type": "module"`), imports use `.js` suffixes.
- Zero runtime dependencies (devDeps: vitest, tsx, typescript, @types/node).
- `npm run typecheck` (tsc --noEmit) must pass after every task.
- `npm test` (vitest run) must pass after every task; new tests follow TDD (red → green → commit).
- Resource types are exactly: `'instructions'` (flattened), `'mcpServers'` (flattened), or the resource's own type for opaque entries (see `flattenBundle` in `src/core/pipeline.ts` — opaque resources keep their original type, currently `'opaque'`).
- Compatibility rule ids follow the existing convention `${sourceAgent}-${capability}-${targetAgent}` (matched by `startsWith`/`endsWith` in `getRulesForMigration` — capability strings must not contain `-`).
- Instructions always land at project root as `AGENTS.md` (all three agents read it); Claude Code also reads `CLAUDE.md`.
- Target writers are pure functions: `(resources: ResourceBase[]) => TargetFile[]` — no fs access, no console.
- Backups go to `.agentbridge/backups/<tx-id>/` with `manifest.json` (existing transaction engine — do not modify).

---

### Task 1: Cleanup — remove dead `'skip'` action, tautological test; use `path.relative`

**Files:**
- Modify: `src/core/writers.ts:1-10` (drop `'skip'` from `TargetFile['action']`)
- Modify: `src/core/pipeline.ts:55` (drop the now-redundant filter)
- Modify: `src/core/scanner/scanner.ts:13-18` (`path.relative` in `createResource`)
- Delete: `tests/unit/model/types.test.ts` (tautological: asserts the enum contains its own values)
- Test: `tests/integration/scanner.test.ts` (add id assertion)

**Interfaces:**
- Consumes: nothing new.
- Produces: `type TargetFile = { path: string; content: string; action: 'create' }` — the type later tasks' writers return.

- [ ] **Step 1: Write the failing test**

In `tests/integration/scanner.test.ts`, inside `describe('scanProject')`, add:

```typescript
    it('resource ids are relative to project root', async () => {
      const bundle = await claudeAdapter.scanProject({ root: fixtureDir });
      for (const resource of bundle.instructions) {
        expect(resource.id).not.toContain(fixtureDir);
        expect(resource.id.startsWith('instruction-')).toBe(true);
      }
    });
```

- [ ] **Step 2: Run test to verify it passes today**

The current `createResource` already yields root-relative ids for top-level files, so this test is a regression guard for the swap below, not a red test. Skip a red-step-only for this one; the kill steps in 3 are the actual change.

- [ ] **Step 3: Swap `createResource` to `path.relative`**

In `src/core/scanner/scanner.ts`, replace:

```typescript
  const relativePath = filePath.replace(root, '').replace(/^[/\\]/, '');
```

with:

```typescript
  const relativePath = path.relative(root, filePath);
```

- [ ] **Step 4: Remove dead `'skip'` variant**

In `src/core/writers.ts` change the action type:

```typescript
export type TargetFile = {
  path: string;
  content: string;
  action: 'create';
};
```

In `src/core/pipeline.ts` change:

```typescript
  const ops: TransactionOperation[] = targetFiles
    .filter(f => f.action !== 'skip')
    .map(f => ({
```

to:

```typescript
  const ops: TransactionOperation[] = targetFiles
    .map(f => ({
```

- [ ] **Step 5: Delete the tautological test**

```bash
rm tests/unit/model/types.test.ts
```

- [ ] **Step 6: Run tests + typecheck**

Run: `npm test && npm run typecheck`
Expected: all pass (22 tests after deleting the 2-test file, plus the new id test), no TS errors.

- [ ] **Step 7: Commit**

```bash
git add src/core/writers.ts src/core/pipeline.ts src/core/scanner/scanner.ts tests/integration/scanner.test.ts
git rm tests/unit/model/types.test.ts
git commit -m "refactor: drop dead skip action, tautological test; use path.relative"
```

---

### Task 2: Generalize compatibility rules to all six direction/pairs

**Files:**
- Modify: `src/registry/rules.ts` (replace hand-written list with a generated table)
- Test: `tests/unit/registry/rules.test.ts` (extend)

**Interfaces:**
- Consumes: `CompatibilityRule` from `src/core/compatibility/engine.ts`, `MigrationStatus` from `src/core/model/types.ts`.
- Produces: `getRulesForMigration(sourceAgent: string, targetAgent: string): CompatibilityRule[]` — same signature as today. Returns 3 rules (instructions/mcpServers/opaque) for every ordered pair of `['claude-code', 'opencode', 'kilo']` where source ≠ target; `[]` otherwise. Task 3's writers consume the pairs `('opencode','claude-code')`, `('kilo','claude-code')`.

- [ ] **Step 1: Write the failing tests**

In `tests/unit/registry/rules.test.ts`, add inside `describe('Compatibility Rules')`:

```typescript
  const AGENTS = ['claude-code', 'opencode', 'kilo'];

  it('returns rules for opencode-to-claude-code', () => {
    const rules = getRulesForMigration('opencode', 'claude-code');
    expect(rules.length).toBe(3);
    expect(rules.some(r => r.sourceCapability === 'instructions')).toBe(true);
    expect(rules.some(r => r.sourceCapability === 'mcpServers')).toBe(true);
  });

  it('returns rules for kilo-to-claude-code', () => {
    const rules = getRulesForMigration('kilo', 'claude-code');
    expect(rules.length).toBe(3);
  });

  it('returns rules for every ordered pair of known agents', () => {
    for (const src of AGENTS) {
      for (const dst of AGENTS) {
        if (src === dst) continue;
        expect(getRulesForMigration(src, dst).length).toBe(3);
      }
    }
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/registry/rules.test.ts`
Expected: FAIL — `getRulesForMigration('opencode', 'claude-code')` returns `[]` (length 0, not 3).

- [ ] **Step 3: Generate the rule table**

Replace the entire content of `src/registry/rules.ts` with:

```typescript
import { CompatibilityRule } from '../core/compatibility/engine.js';
import { MigrationStatus } from '../core/model/types.js';

const AGENTS = ['claude-code', 'opencode', 'kilo'] as const;

const CAPABILITIES: { capability: string; method: 'copy' | 'rewrite'; status: MigrationStatus }[] = [
  { capability: 'instructions', method: 'copy', status: MigrationStatus.DIRECT },
  { capability: 'mcpServers', method: 'rewrite', status: MigrationStatus.ADAPTED },
  { capability: 'opaque', method: 'rewrite', status: MigrationStatus.ADAPTED },
];

const RULES: CompatibilityRule[] = AGENTS.flatMap(source =>
  AGENTS
    .filter(target => target !== source)
    .flatMap(target =>
      CAPABILITIES.map(({ capability, method, status }) => ({
        id: `${source}-${capability}-${target}`,
        sourceCapability: capability,
        method,
        status,
      }))
    )
);

export function getRulesForMigration(sourceAgent: string, targetAgent: string): CompatibilityRule[] {
  return RULES.filter(r => r.id.startsWith(`${sourceAgent}-`) && r.id.endsWith(`-${targetAgent}`));
}
```

Note: 6 ordered pairs × 3 capabilities = 18 rules; ids stay unique because both agent names are embedded.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/registry/rules.test.ts`
Expected: PASS (6 tests including the 3 existing ones).

- [ ] **Step 5: Run full suite + typecheck, commit**

Run: `npm test && npm run typecheck`
Expected: all pass.

```bash
git add src/registry/rules.ts tests/unit/registry/rules.test.ts
git commit -m "feat: compatibility rules for all agent pairs (both directions)"
```

---

### Task 3: Claude Code target writer (`writeClaudeFiles`)

**Files:**
- Create: `src/adapters/claude-code/writer.ts`
- Modify: `src/adapters/registry.ts` (register the writer)
- Test: `tests/unit/adapters/claude-writer.test.ts` (new directory)

**Interfaces:**
- Consumes: `ResourceBase` from `src/core/model/types.ts`, `TargetFile` from `src/core/writers.ts` (Task 1: `action: 'create'` only). Resource shapes arriving from `flattenBundle`: `{ id, type: 'instructions', name: 'AGENTS.md' | 'CLAUDE.md', content }`, `{ id, type: 'mcpServers', name: <serverName>, content: JSON.stringify(serverConfig) }`, `{ id, type: 'opaque', name: 'opencode.jsonc' | '.kilo/config.json', content: <file text> }`.
- Produces: `writeClaudeFiles(resources: ResourceBase[]): TargetFile[]` — registered under key `'claude-code'`. Emits `AGENTS.md` (or passes `CLAUDE.md` through) plus `.claude/settings.json` containing `{ model?, permissions?, mcpServers? }`. Later tasks rely only on the registry entry; CLI needs no change.

Behavior decisions (from the spec): OpenCode's explicit `type: "stdio"` must be dropped for Claude (Claude infers stdio from `command`); `model` maps through; OpenCode-specific fields (`provider`) are dropped; Kilo's `systemPrompt`/`maxTokens` are agent-specific and NOT translated — only `model` is extracted from Kilo's opaque config.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/adapters/claude-writer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { writeClaudeFiles } from '../../../src/adapters/claude-code/writer.js';
import { ResourceBase } from '../../../src/core/model/types.js';

const inst = (name: string, content: string): ResourceBase => ({
  id: `instructions-${name}`, type: 'instructions', name, content,
});
const mcp = (name: string, config: object): ResourceBase => ({
  id: `mcpServers-${name}`, type: 'mcpServers', name, content: JSON.stringify(config),
});
const opaque = (name: string, content: string): ResourceBase => ({
  id: `opaque-${name}`, type: 'opaque', name, content,
});

describe('writeClaudeFiles', () => {
  it('passes instructions through unchanged', () => {
    const files = writeClaudeFiles([inst('AGENTS.md', '# Rules')]);
    expect(files).toEqual([{ path: 'AGENTS.md', content: '# Rules', action: 'create' }]);
  });

  it('writes CLAUDE.md at its own path', () => {
    const files = writeClaudeFiles([inst('CLAUDE.md', '# Claude rules')]);
    expect(files[0].path).toBe('CLAUDE.md');
  });

  it('builds .claude/settings.json from OpenCode config with mcpServers translated', () => {
    const files = writeClaudeFiles([
      opaque('opencode.jsonc', JSON.stringify({
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        mcpServers: {
          fs: { type: 'stdio', command: 'npx', args: ['-y', 'mcp-fs'], env: { FOO: '1' } },
        },
      })),
    ]);
    expect(files.length).toBe(1);
    expect(files[0].path).toBe('.claude/settings.json');
    const settings = JSON.parse(files[0].content);
    expect(settings.model).toBe('claude-sonnet-4-20250514');
    expect(settings.provider).toBeUndefined();
    expect(settings.mcpServers.fs).toEqual({ command: 'npx', args: ['-y', 'mcp-fs'], env: { FOO: '1' } });
  });

  it('extracts only model from Kilo config', () => {
    const files = writeClaudeFiles([
      opaque('.kilo/config.json', JSON.stringify({
        model: 'claude-sonnet-4-20250514', maxTokens: 8192, systemPrompt: 'You are helpful.',
      })),
    ]);
    const settings = JSON.parse(files[0].content);
    expect(settings).toEqual({ model: 'claude-sonnet-4-20250514' });
  });

  it('adds dedicated mcpServers resources into settings (drops OpenCode type field)', () => {
    const files = writeClaudeFiles([
      mcp('fs', { type: 'stdio', command: 'npx', args: [] }),
      mcp('gh', { command: 'github-mcp' }),
    ]);
    const settings = JSON.parse(files[0].content);
    expect(settings.mcpServers.fs).toEqual({ command: 'npx', args: [] });
    expect(settings.mcpServers.gh).toEqual({ command: 'github-mcp' });
  });

  it('returns nothing for empty resources', () => {
    expect(writeClaudeFiles([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/adapters/claude-writer.test.ts`
Expected: FAIL — cannot resolve `../../../src/adapters/claude-code/writer.js`.

- [ ] **Step 3: Write the writer**

Create `src/adapters/claude-code/writer.ts`:

```typescript
import { ResourceBase } from '../../core/model/types.js';
import { TargetFile } from '../../core/writers.js';

/** Claude Code infers stdio from `command`; OpenCode's explicit `type` is not valid here. */
function translateMcpServer(server: Record<string, unknown>): Record<string, unknown> {
  const { type: _type, ...rest } = server;
  return rest;
}

/** Pick the subset of an agent's opaque config that Claude Code understands. */
function buildClaudeSettings(opaqueContent: string, sourceName: string): Record<string, unknown> {
  let config: Record<string, unknown>;
  try {
    config = JSON.parse(opaqueContent);
  } catch {
    return {};
  }
  const settings: Record<string, unknown> = {};
  if (typeof config.model === 'string') settings.model = config.model;
  if (config.permissions && typeof config.permissions === 'object') settings.permissions = config.permissions;
  if (sourceName.includes('opencode')) {
    // mcpServers embedded in opencode.jsonc are translated below via dedicated mcpServers
    // resources; nested server objects here are handled by the same translateMcpServer.
  }
  if (sourceName.includes('opencode') && config.mcpServers && typeof config.mcpServers === 'object') {
    const servers: Record<string, unknown> = {};
    for (const [name, server] of Object.entries(config.mcpServers as Record<string, unknown>)) {
      if (server && typeof server === 'object') servers[name] = translateMcpServer(server as Record<string, unknown>);
    }
    settings.mcpServers = servers;
  }
  return settings;
}

export function writeClaudeFiles(resources: ResourceBase[]): TargetFile[] {
  const files: TargetFile[] = [];
  const settings: Record<string, unknown> = {};
  const mcpServers: Record<string, unknown> = {};
  let hasSettings = false;

  for (const r of resources) {
    if (r.type === 'instructions' && r.content) {
      files.push({ path: r.name, content: r.content, action: 'create' });
    } else if (r.type === 'opaque' && r.content && (r.name.includes('opencode') || r.name.includes('.kilo'))) {
      Object.assign(settings, buildClaudeSettings(r.content, r.name));
      hasSettings = true;
    } else if (r.type === 'mcpServers' && r.content) {
      try {
        mcpServers[r.name] = translateMcpServer(JSON.parse(r.content));
      } catch { /* invalid JSON, skip */ }
    }
  }

  if (Object.keys(mcpServers).length > 0) settings.mcpServers = mcpServers;

  if (hasSettings || Object.keys(mcpServers).length > 0) {
    files.push({ path: '.claude/settings.json', content: JSON.stringify(settings, null, 2), action: 'create' });
  }

  return files;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/adapters/claude-writer.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Register the writer**

In `src/adapters/registry.ts` add the import and registration (top imports area and bottom of file respectively):

```typescript
import { writeClaudeFiles } from './claude-code/writer.js';
```

```typescript
registerWriter('claude-code', writeClaudeFiles);
```

- [ ] **Step 6: Full suite + typecheck, commit**

Run: `npm test && npm run typecheck`
Expected: all pass.

```bash
git add src/adapters/claude-code/writer.ts src/adapters/registry.ts tests/unit/adapters/claude-writer.test.ts
git commit -m "feat: claude-code target writer with MCP translation"
```

---

### Task 4: Kilo target writer (`writeKiloFiles`)

**Files:**
- Create: `src/adapters/kilo/writer.ts`
- Modify: `src/adapters/registry.ts` (register the writer)
- Test: `tests/unit/adapters/kilo-writer.test.ts`

**Interfaces:**
- Consumes: same resource shapes as Task 3 (see its Consumes block).
- Produces: `writeKiloFiles(resources: ResourceBase[]): TargetFile[]` — registered under `'kilo'`. Emits `AGENTS.md` plus `.kilo/config.json` with `{ model?, maxTokens? }`. This is what `migrate claude-code kilo` was missing; `getWriter('kilo')` resolves after this task.

Kilo behavior decisions: Claude's `permissions` has no Kilo equivalent (dropped, compatibility rules already mark opaque ADAPTED); MCP servers are NOT written into Kilo config (Kilo's `.kilo/config.json` schema has no mcpServers section in the scanned format — a `ponytail:` comment marks the ceiling).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/adapters/kilo-writer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { writeKiloFiles } from '../../../src/adapters/kilo/writer.js';
import { ResourceBase } from '../../../src/core/model/types.js';

const inst = (name: string, content: string): ResourceBase => ({
  id: `instructions-${name}`, type: 'instructions', name, content,
});
const mcp = (name: string, config: object): ResourceBase => ({
  id: `mcpServers-${name}`, type: 'mcpServers', name, content: JSON.stringify(config),
});
const opaque = (name: string, content: string): ResourceBase => ({
  id: `opaque-${name}`, type: 'opaque', name, content,
});

describe('writeKiloFiles', () => {
  it('passes instructions through unchanged', () => {
    expect(writeKiloFiles([inst('AGENTS.md', '# Rules')]))
      .toEqual([{ path: 'AGENTS.md', content: '# Rules', action: 'create' }]);
  });

  it('writes CLAUDE.md at its own path', () => {
    expect(writeKiloFiles([inst('CLAUDE.md', '# Claude')])[0].path).toBe('CLAUDE.md');
  });

  it('maps model and permissions-free claude settings into .kilo/config.json', () => {
    const files = writeKiloFiles([
      opaque('.claude/settings.json', JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        permissions: { allow: ['read', 'write'] },
      })),
    ]);
    expect(files.length).toBe(1);
    expect(files[0].path).toBe('.kilo/config.json');
    expect(JSON.parse(files[0].content)).toEqual({ model: 'claude-sonnet-4-20250514' });
  });

  it('keeps maxTokens when migrating from kilo-shaped opaque input', () => {
    const files = writeKiloFiles([
      opaque('.kilo/config.json', JSON.stringify({ model: 'm', maxTokens: 4096 })),
    ]);
    expect(JSON.parse(files[0].content)).toEqual({ model: 'm', maxTokens: 4096 });
  });

  it('ignores mcpServers resources (no kilo mcp section) but still writes config', () => {
    const files = writeKiloFiles([mcp('fs', { command: 'npx' })]);
    expect(files.length).toBe(1);
    expect(JSON.parse(files[0].content)).toEqual({});
  });

  it('returns nothing for empty resources', () => {
    expect(writeKiloFiles([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/adapters/kilo-writer.test.ts`
Expected: FAIL — cannot resolve `../../../src/adapters/kilo/writer.js`.

- [ ] **Step 3: Write the writer**

Create `src/adapters/kilo/writer.ts`:

```typescript
import { ResourceBase } from '../../core/model/types.js';
import { TargetFile } from '../../core/writers.js';

export function writeKiloFiles(resources: ResourceBase[]): TargetFile[] {
  const files: TargetFile[] = [];
  const config: Record<string, unknown> = {};
  let hasConfig = false;

  for (const r of resources) {
    if (r.type === 'instructions' && r.content) {
      files.push({ path: r.name, content: r.content, action: 'create' });
    } else if (r.type === 'opaque' && r.content && r.name.includes('.claude')) {
      // ponytail: only model/maxTokens map today; Kilo's scanned config schema
      // has no mcpServers/permissions sections — extend translateKiloConfig when it does.
      try {
        const parsed = JSON.parse(r.content);
        if (typeof parsed.model === 'string') config.model = parsed.model;
        if (typeof parsed.maxTokens === 'number') config.maxTokens = parsed.maxTokens;
        hasConfig = true;
      } catch { /* invalid JSON, skip */ }
    }
    // mcpServers resources deliberately ignored: no mcp section in .kilo/config.json
  }

  if (hasConfig) {
    files.push({ path: '.kilo/config.json', content: JSON.stringify(config, null, 2), action: 'create' });
  }

  return files;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/adapters/kilo-writer.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Register the writer**

In `src/adapters/registry.ts`:

```typescript
import { writeKiloFiles } from './kilo/writer.js';
```

```typescript
registerWriter('kilo', writeKiloFiles);
```

- [ ] **Step 6: Full suite + typecheck, commit**

Run: `npm test && npm run typecheck`
Expected: all pass.

```bash
git add src/adapters/kilo/writer.ts src/adapters/registry.ts tests/unit/adapters/kilo-writer.test.ts
git commit -m "feat: kilo target writer (fixes advertised claude-code → kilo migration)"
```

---

### Task 5: End-to-end pipeline tests for the three new directions

**Files:**
- Test: `tests/integration/pipeline.test.ts` (new)

**Interfaces:**
- Consumes: `migratePipeline(source, target, projectPath, dryRun?)` from `src/core/pipeline.ts` — returns `{ txId: string | null; fileCount: number }`; `adapters` from `src/adapters/registry.ts` (needed for import side-effect: writer registration lives in that module's top level).
- Produces: regression coverage that all six ordered pairs migrate without throwing; verifies written artifacts for the three previously-missing directions (opencode→claude, kilo→claude, claude→kilo).

- [ ] **Step 1: Write the tests**

Create `tests/integration/pipeline.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { migratePipeline } from '../../src/core/pipeline.js';
import { adapters } from '../../src/adapters/registry.js'; // registers writers

const FIXTURES = path.resolve('tests/fixtures');

let tmpDir: string;
beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-pipeline-'));
});
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function copyFixture(name: string): Promise<string> {
  const dir = path.join(tmpDir, name);
  await fs.cp(path.join(FIXTURES, name), dir, { recursive: true });
  return dir;
}

describe('migratePipeline directions', () => {
  it('migrates claude-code → opencode', async () => {
    const dir = await copyFixture('claude-basic');
    const { txId, fileCount } = await migratePipeline('claude-code', 'opencode', dir);
    expect(txId).toBeTruthy();
    expect(fileCount).toBeGreaterThan(0);
    const oc = JSON.parse(await fs.readFile(path.join(dir, 'opencode.json'), 'utf-8'));
    expect(oc.model).toBe('claude-sonnet-4-20250514');
  });

  it('migrates claude-code → kilo (previously unimplemented)', async () => {
    const dir = await copyFixture('claude-basic');
    const { txId } = await migratePipeline('claude-code', 'kilo', dir);
    expect(txId).toBeTruthy();
    const kilo = JSON.parse(await fs.readFile(path.join(dir, '.kilo', 'config.json'), 'utf-8'));
    expect(kilo.model).toBe('claude-sonnet-4-20250514');
  });

  it('migrates opencode → claude-code (reverse)', async () => {
    const dir = await copyFixture('opencode-basic');
    const { txId } = await migratePipeline('opencode', 'claude-code', dir);
    expect(txId).toBeTruthy();
    const settings = JSON.parse(await fs.readFile(path.join(dir, '.claude', 'settings.json'), 'utf-8'));
    expect(settings.model).toBe('claude-sonnet-4-20250514');
    // OpenCode's explicit stdio type is dropped for Claude
    expect(settings.mcpServers.filesystem).toEqual({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
    });
  });

  it('migrates kilo → claude-code (reverse)', async () => {
    const dir = await copyFixture('kilo-basic');
    const { txId } = await migratePipeline('kilo', 'claude-code', dir);
    expect(txId).toBeTruthy();
    const settings = JSON.parse(await fs.readFile(path.join(dir, '.claude', 'settings.json'), 'utf-8'));
    expect(settings.model).toBe('claude-sonnet-4-20250514');
    expect(settings.systemPrompt).toBeUndefined();
  });

  it('opencode → kilo works', async () => {
    const dir = await copyFixture('opencode-basic');
    const { txId } = await migratePipeline('opencode', 'kilo', dir);
    expect(txId).toBeTruthy();
  });

  it('kilo → opencode works', async () => {
    const dir = await copyFixture('kilo-basic');
    const { txId } = await migratePipeline('kilo', 'opencode', dir);
    expect(txId).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify the new-direction tests fail before… actually they can't fail here — verify they pass as written**

Tasks 2–4 already implemented the functionality; this task is the integration net. If any test fails, fix the offending task's code first (root cause there, not here).

Run: `npx vitest run tests/integration/pipeline.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 3: Full suite + typecheck, commit**

Run: `npm test && npm run typecheck`
Expected: all pass (~34 tests).

```bash
git add tests/integration/pipeline.test.ts
git commit -m "test: end-to-end pipeline coverage for all six agent pairs"
```

---

### Task 6: Wire new agents/directions into docs and CI trust boundary

**Files:**
- Modify: `README.md` (Supported Migrations table, quick-start examples)
- Modify: `src/cli/commands/help.ts` (supported-agents note: any → any)

**Interfaces:**
- Consumes: nothing.
- Produces: docs matching actual behavior; no code change. CI (`.github/workflows/ci.yml`) already runs `npm test` + `npm run typecheck` on Node 22/24 — no edit needed.

- [ ] **Step 1: Update the README migration table**

Replace the Supported Migrations table with:

```markdown
| Source | Target | Status |
|--------|--------|--------|
| Claude Code | OpenCode | ✅ Supported |
| Claude Code | Kilo Code | ✅ Supported |
| OpenCode | Claude Code | ✅ Supported |
| OpenCode | Kilo Code | ✅ Supported |
| Kilo Code | Claude Code | ✅ Supported |
| Kilo Code | OpenCode | ✅ Supported |
```

- [ ] **Step 2: Update quick-start + add a reverse example**

In the Quick Start section, after the existing migrate example, add:

```bash
# Any direction works — e.g. back to Claude Code
agent-migrate migrate opencode claude-code
```

- [ ] **Step 3: Update help text**

In `src/cli/commands/help.ts`, replace the `Supported agents:` block:

```
Supported agents:
  claude-code                     Claude Code
  opencode                        OpenCode
  kilo                            Kilo Code
```

with:

```
Supported agents:
  claude-code                     Claude Code (source & target)
  opencode                        OpenCode (source & target)
  kilo                            Kilo Code (source & target)
```

- [ ] **Step 4: Verify CLI by hand against a fixture**

```bash
npx tsx src/cli/main.ts plan opencode claude-code tests/fixtures/opencode-basic
npx tsx src/cli/main.ts migrate kilo claude-code tests/fixtures/kilo-basic --dry-run 2>/dev/null || true
```

Expected: `plan` shows DIRECT/ADAPTED statuses (not all ✗). For the migrate dry-run: if `--dry-run` is not accepted by `migrate` (only `apply` supports it — confirmed in `src/cli/main.ts`), use `apply ... --dry-run` instead:

```bash
npx tsx src/cli/main.ts apply kilo claude-code tests/fixtures/kilo-basic --dry-run
```

Expected: lists `.claude/settings.json` under "Would create" and writes nothing.

- [ ] **Step 5: Full suite + typecheck, commit**

Run: `npm test && npm run typecheck`
Expected: all pass.

```bash
git add README.md src/cli/commands/help.ts
git commit -m "docs: all six migration directions supported"
```

---

## Self-Review Notes

1. **Spec coverage:** README's advertised claude-code→kilo gap → Task 4 + Task 5 regression test. Reverse migrations to claude-code → Tasks 2, 3, 5. MCP translation in both directions → Tasks 3 (drop `type`), 5 (asserts OpenCode→Claude server shape). Scan/plan/diff for all sources → already worked; rules now return non-UNSUPPORTED for every pair → Task 2, verified in Task 5. Audit cuts (`skip` variant, tautological test, `path.relative`) → Task 1. Zero new deps → all tasks use existing imports only.
2. **Placeholder scan:** No TBD/TODO steps; every code step carries its full content. The `buildClaudeSettings` no-op `if` for opencode embeds a comment only — acceptable as it documents why nothing happens; no unimplemented reference. (It is kept because Task 3's test asserts nested-opencode mcpServers are translated, which that branch handles.)
3. **Type consistency:** `TargetFile.action` is `'create'` everywhere after Task 1 — Task 3/4 writers and tests use only `action: 'create'`. `writeClaudeFiles`/`writeKiloFiles` signatures match `WriteFn = (resources: ResourceBase[]) => TargetFile[]`. Rule ids keep the `${source}-${capability}-${target}` convention that `getRulesForMigration`'s `startsWith`/`endsWith` matching requires; capability strings (`instructions`, `mcpServers`, `opaque`) contain no `-`.
