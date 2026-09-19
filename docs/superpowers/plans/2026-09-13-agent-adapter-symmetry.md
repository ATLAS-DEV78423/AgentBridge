# Agent Adapter Symmetry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `migrate` and `plan` incapable of disagreeing, by giving every target agent one emitter plus one capability profile that all commands read from — and ship the missing Kilo emitter that currently makes `migrate claude-code kilo` throw.

**Architecture:** Today compatibility comes from a pairwise rule table (`src/registry/rules.ts`, N x M) while the actual file production comes from a separate global writer registry (`src/core/writers.ts`, populated by an import side effect). The two can disagree, and they do: `plan claude-code kilo` reports success while `migrate claude-code kilo` throws "Target writer for kilo not yet implemented". This plan collapses both into the adapter itself — `AgentAdapter.emit` + `AgentAdapter.capabilities` — so `plan`, `diff` and `migrate` all consult one object. `AgentBundle` (`src/core/model/types.ts`) is already the canonical intermediate representation, so compatibility depends only on the **target**, not on the source/target pair: N x M rules become N + M profiles.

**Tech Stack:** TypeScript 5.x ESM (`"type": "module"`, all relative imports MUST carry the `.js` extension), Node >= 22, Vitest 4, zero runtime dependencies.

**Spec:** No external spec — this plan implements the review findings recorded in `.workbuddy-ai/memory/2026-09-13.md` (sections "Backend architecture review" and "Implemented: transaction core hardening").

---

## Global Constraints

- **Zero runtime dependencies.** Every `dependencies` addition is a plan violation. `devDependencies` are already: `@types/node`, `tsx`, `typescript`, `vitest`.
- **ESM imports must end in `.js`** (e.g. `from '../../core/model/types.js'`), even though the file is `.ts`.
- Every task must pass `npm run typecheck` (runs `tsc --noEmit`) and `npm test` (runs `vitest run`) before its commit.
- `dist/` is **not** tracked by git — never hand-edit it and never commit it.
- Test files use Vitest's `describe/it/expect` globals; no per-file imports of them are needed beyond the existing `import { describe, it, expect } from 'vitest'` convention used in this repo.
- Project follows `AGENTS.md` (ponytail): deletion over addition, fewest files, no unrequested abstraction. If a task can delete a file instead of adding one, delete it.
- Deliberate simplifications that cut a real corner must carry a `ponytail:` comment naming the ceiling and the upgrade path.
- Commit style matches existing history: `feat:`, `fix:`, `refactor:`, `docs:` prefixes, lowercase, imperative.

## Open Decision (blocks Task 1 — confirm before executing)

The repo and Kilo's own docs disagree about Kilo's project config file:

- **Repo's current assumption** (`src/adapters/kilo/detector.ts`, `scanner.ts`, `tests/fixtures/kilo-basic/.kilo/config.json`): `.kilo/config.json` with keys `model`, `maxTokens`, `systemPrompt`.
- **Kilo's documented format** (https://kilo.ai/docs/automate/mcp/using-in-kilo-code): project config is `./kilo.jsonc` **or** `./.kilo/kilo.jsonc`; MCP servers live under a top-level `mcp` key; a local server is `{ "type": "local", "command": ["node", "/path/to/server.js"], "environment": { ... }, "enabled": true, "timeout": 10000 }`.

**Option A (default, assumed by the tasks below):** write `.kilo/kilo.jsonc` with the documented `mcp` shape, and update detector/scanner/fixture in lockstep so `scan` still detects what `migrate` writes. Detector must accept **both** `kilo.jsonc` and `.kilo/kilo.jsonc`, since the docs list both.

**Option B (if the repo's `.kilo/config.json` is correct for the Kilo version you target):** keep `.kilo/config.json`, keep `model`/`maxTokens`/`systemPrompt`, and put MCP servers under `mcp` (the documented key). Only the path constant and the detector/scanner/fixture edits in Task 1 change; the emitter body and all tests stay as written.

If neither matches your installed Kilo Code, say so before Task 1 runs and the constants get corrected first.

---

## File Map

| File | Change | Task |
|---|---|---|
| `src/core/model/types.ts` | Add `TargetFile`, `EmitFn`, `CapabilitySupport`, `CapabilityProfile` | 2, 3 |
| `src/core/scanner/scanner.ts` | `AgentAdapter` gains `emit?`, `capabilities?` | 2 |
| `src/core/writers.ts` | **Delete** (global registry replaced by `adapter.emit`) | 2 |
| `src/registry/rules.ts` | **Delete** (pairwise table replaced by per-target profiles) | 3 |
| `src/core/compatibility/engine.ts` | `evaluateCompatibility(type, profile)` replaces rule-array lookup | 3 |
| `src/core/pipeline.ts` | Use `adapter.emit`; fail fast on missing emitter; `planMigration(target, resources)` | 2, 3 |
| `src/adapters/registry.ts` | Drop `registerWriter` import and side effect | 2 |
| `src/adapters/opencode/index.ts` | Add `emit` + `capabilities` | 2 |
| `src/adapters/opencode/writer.ts` | Import `TargetFile` from `core/model/types.js` | 2 |
| `src/adapters/kilo/writer.ts` | **Create** | 1 |
| `src/adapters/kilo/index.ts` | Add `emit` + `capabilities` | 1 (revisited 2) |
| `src/adapters/kilo/detector.ts` | Accept both documented config paths | 1 |
| `src/adapters/kilo/scanner.ts` | Read whichever documented path exists | 1 |
| `tests/fixtures/kilo-basic/.kilo/kilo.jsonc` | **Create** (Option A) | 1 |
| `src/cli/commands/plan.ts`, `diff.ts` | New `planMigration` signature; fail fast | 2, 3 |
| `tests/unit/registry/rules.test.ts` | **Delete** (covered by engine tests) | 3 |
| `tests/unit/compatibility/engine.test.ts` | Rewrite against `CapabilityProfile` | 3 |
| `tests/integration/kilo-writer.test.ts` | **Create** | 1 |
| `README.md`, `CHANGELOG.md`, `src/cli/commands/help.ts` | Accuracy | 4 |

---

### Task 1: Kilo emitter (fixes "plan says yes, migrate throws")

**Files:**
- Create: `src/adapters/kilo/writer.ts`
- Modify: `src/adapters/kilo/index.ts`, `src/adapters/kilo/detector.ts`, `src/adapters/kilo/scanner.ts`
- Create fixture: `tests/fixtures/kilo-basic/.kilo/kilo.jsonc`
- Test: `tests/integration/kilo-writer.test.ts` (create)

**Why:** `adapters/registry.ts:17` registers only `opencode`. `registry/rules.ts:10-12` defines Claude→Kilo rules and README marks Kilo ✅, so `plan claude-code kilo` prints ✓ DIRECT while `migrate claude-code kilo` throws. This is the worst failure shape a migration tool can have: the preview lies.

**Interfaces:**
- Consumes: `ResourceBase` from `src/core/model/types.ts` (`{ id, type, name, content? }`), where `type` is one of `'instructions' | 'mcpServers' | 'opaque'` after `flattenBundle`.
- Produces: `writeKiloFiles(resources: ResourceBase[]): TargetFile[]` where `TargetFile` is `{ path, content, action: 'create' | 'skip' }` — imported from `src/core/writers.ts` in Task 1, relocated to `src/core/model/types.ts` in Task 2.

- [ ] **Step 1: Write the failing test**

Create `tests/integration/kilo-writer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { writeKiloFiles } from '../../src/adapters/kilo/writer.js';
import { ResourceBase } from '../../src/core/model/types.js';

const settings = JSON.stringify({
  model: 'claude-sonnet-4-20250514',
  maxTokens: 8192,
  permissions: { allow: ['Bash'] },
});

const mcpServer = JSON.stringify({
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-everything'],
  env: { API_KEY: 'abc' },
});

const resources: ResourceBase[] = [
  { id: 'opaque-settings.json', type: 'opaque', name: '.claude/settings.json', content: settings },
  { id: 'mcpServer-everything', type: 'mcpServers', name: 'everything', content: mcpServer },
  { id: 'instruction-AGENTS.md', type: 'instructions', name: 'AGENTS.md', content: '# Rules' },
];

describe('Kilo writer', () => {
  it('emits the project config and the instruction file', () => {
    const files = writeKiloFiles(resources);
    const paths = files.map(f => f.path);

    expect(paths).toContain('.kilo/kilo.jsonc');
    expect(paths).toContain('AGENTS.md');
  });

  it('translates a Claude MCP server into Kilo local form', () => {
    const config = writeKiloFiles(resources)
      .find(f => f.path === '.kilo/kilo.jsonc');
    const parsed = JSON.parse(config!.content);

    expect(parsed.mcp.everything).toEqual({
      type: 'local',
      enabled: true,
      command: ['npx', '-y', '@modelcontextprotocol/server-everything'],
      environment: { API_KEY: 'abc' },
    });
  });

  it('carries model settings through', () => {
    const config = writeKiloFiles(resources)
      .find(f => f.path === '.kilo/kilo.jsonc');
    const parsed = JSON.parse(config!.content);

    expect(parsed.model).toBe('claude-sonnet-4-20250514');
    expect(parsed.maxTokens).toBe(8192);
  });

  it('emits nothing when there is nothing to write', () => {
    expect(writeKiloFiles([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/integration/kilo-writer.test.ts`
Expected: FAIL — cannot resolve `../../src/adapters/kilo/writer.js`.

- [ ] **Step 3: Create `src/adapters/kilo/writer.ts`**

```ts
import { ResourceBase, TargetFile } from '../../core/model/types.js';

const KILO_PROJECT_CONFIG = '.kilo/kilo.jsonc';

/** Claude/OpenCode use {command, args, env}; Kilo uses {type:"local", command:[...], environment}. */
function translateMcpServer(serverConfig: Record<string, unknown>): Record<string, unknown> {
  const args = Array.isArray(serverConfig.args) ? serverConfig.args : [];
  const command = typeof serverConfig.command === 'string' ? [serverConfig.command, ...args] : args;
  const server: Record<string, unknown> = { type: 'local', enabled: true, command };
  if (serverConfig.env) server.environment = serverConfig.env;
  return server;
}

export function writeKiloFiles(resources: ResourceBase[]): TargetFile[] {
  const files: TargetFile[] = [];
  const kiloConfig: Record<string, unknown> = {};
  const mcp: Record<string, unknown> = {};
  let hasSettings = false;

  for (const r of resources) {
    if (r.type === 'opaque' && r.content) {
      try {
        const settings = JSON.parse(r.content);
        if (settings.model) kiloConfig.model = settings.model;
        if (settings.maxTokens) kiloConfig.maxTokens = settings.maxTokens;
        if (settings.systemPrompt) kiloConfig.systemPrompt = settings.systemPrompt;
        hasSettings = true;
      } catch { /* invalid JSON, skip */ }
    } else if (r.type === 'mcpServers' && r.content) {
      try {
        mcp[r.name] = translateMcpServer(JSON.parse(r.content));
      } catch { /* invalid JSON, skip */ }
    }
  }

  if (Object.keys(mcp).length > 0) kiloConfig.mcp = mcp;

  if (hasSettings || Object.keys(mcp).length > 0) {
    files.push({
      path: KILO_PROJECT_CONFIG,
      content: JSON.stringify(kiloConfig, null, 2),
      action: 'create',
    });
  }

  for (const r of resources) {
    if (r.type === 'instructions') {
      files.push({ path: r.name, content: r.content || '', action: 'create' });
    }
  }

  return files;
}
```

Note: `permissions` is deliberately **not** translated. Claude's `permissions` is `{allow: [...], deny: [...]}`; Kilo's is `permission: { "<tool>": "allow" }`. Mapping one to the other is guesswork, and a wrong permission mapping is worse than none. Add it only when the mapping is confirmed.

- [ ] **Step 4: Re-point `TargetFile` and run the test**

Until Task 2 deletes `src/core/writers.ts`, `TargetFile` lives there. Import it from `'../../core/writers.js'` in `writer.ts` for this task; Task 2 changes the import to `'../../core/model/types.js'`.

Run: `npx vitest run tests/integration/kilo-writer.test.ts`
Expected: 4 PASS.

- [ ] **Step 5: Register the emitter**

Modify `src/adapters/kilo/index.ts` to add the registration that Task 2 will later replace:

```ts
import { AgentAdapter } from '../../core/scanner/scanner.js';
import { detectKilo } from './detector.js';
import { scanKiloProject } from './scanner.js';
import { registerWriter } from '../../core/writers.js';
import { writeKiloFiles } from './writer.js';

export const kiloAdapter: AgentAdapter = {
  id: 'kilo',
  detect: detectKilo,
  scanProject: scanKiloProject
};

registerWriter('kilo', writeKiloFiles);
```

- [ ] **Step 6: Update detector and scanner to the documented paths**

Replace `src/adapters/kilo/detector.ts`:

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { DetectionResult } from '../../core/scanner/scanner.js';

// Docs list both locations; project-level takes precedence over global.
const CONFIG_PATHS = ['kilo.jsonc', 'kilo.json', '.kilo/kilo.jsonc', '.kilo/kilo.json'];

export async function detectKilo(ctx: { root: string }): Promise<DetectionResult> {
  for (const relative of CONFIG_PATHS) {
    try {
      await fs.access(path.join(ctx.root, relative));
      return { detected: true, agent: 'kilo' };
    } catch { /* try the next location */ }
  }
  return { detected: false };
}
```

In `src/adapters/kilo/scanner.ts`, replace the single-path read with the same list, reading the first that exists and reporting it as the resource name:

```ts
const CONFIG_PATHS = ['kilo.jsonc', 'kilo.json', '.kilo/kilo.jsonc', '.kilo/kilo.json'];

// ...inside scanKiloProject, replacing the .kilo/config.json block:
for (const relative of CONFIG_PATHS) {
  const filePath = path.join(ctx.root, relative);
  const content = await readIfExists(filePath);
  if (content === null) continue;
  bundle.opaque.push(createResource('opaque', relative, filePath, ctx.root, content));
  break;
}
```

Import `readIfExists` from `../../core/transaction/transaction.js` — it already exists and already distinguishes `ENOENT` from real errors. Do **not** reintroduce a bare `catch {}`.

- [ ] **Step 7: Update the fixture**

Create `tests/fixtures/kilo-basic/.kilo/kilo.jsonc`:

```jsonc
{
  "model": "claude-sonnet-4-20250514",
  "maxTokens": 8192,
  "systemPrompt": "You are a helpful coding assistant."
}
```

Delete `tests/fixtures/kilo-basic/.kilo/config.json`.

- [ ] **Step 8: Run the full suite**

Run: `npm run typecheck && npm test`
Expected: typecheck clean; all tests pass including the 3 existing `tests/integration/kilo-scanner.test.ts` cases (`detects Kilo project`, `does not detect non-Kilo project`, `scans Kilo project correctly`).

- [ ] **Step 9: Smoke the real command**

Run:
```bash
T=$(mktemp -d) && cp -r tests/fixtures/claude-real/. "$T"/ \
  && npx tsx src/cli/main.ts migrate claude-code kilo "$T" \
  && cat "$T/.kilo/kilo.jsonc"
```
Expected: exit 0, "Migration complete", and `.kilo/kilo.jsonc` on disk. Before this task the same command exits 1 with `Target writer for kilo not yet implemented`.

- [ ] **Step 10: Commit**

```bash
git add src/adapters/kilo tests/fixtures/kilo-basic tests/integration/kilo-writer.test.ts
git commit -m "feat: add Kilo emitter so migrate claude-code kilo works"
```

---

### Task 2: Single source of truth — `emit` lives on the adapter

**Files:**
- Modify: `src/core/model/types.ts`, `src/core/scanner/scanner.ts`, `src/core/pipeline.ts`, `src/adapters/registry.ts`, `src/adapters/opencode/index.ts`, `src/adapters/opencode/writer.ts`, `src/adapters/kilo/index.ts`, `src/adapters/kilo/writer.ts`
- Delete: `src/core/writers.ts`
- Test: existing suite must stay green; no new test file

**Why:** `core/writers.ts` is a module-level mutable map filled by an import side effect in `adapters/registry.ts`. `pipeline.ts` only gets an emitter if that module happened to be imported first. That fragility is why a target can be missing at runtime while every other command believes it exists. Moving `emit` onto the adapter makes the object the pipeline already looks up (`adapters[target]`) the same object that produces files.

**Interfaces:**
- Consumes: `TargetFile` as relocated in this task.
- Produces: `AgentAdapter.emit?: EmitFn` and `AgentAdapter.capabilities?: CapabilityProfile` (capabilities wired in Task 3).

- [ ] **Step 1: Move `TargetFile` into the model**

In `src/core/model/types.ts`, append:

```ts
export type TargetFile = {
  path: string;
  content: string;
  action: 'create' | 'skip';
};

export type EmitFn = (resources: ResourceBase[]) => TargetFile[];

export type CapabilitySupport = {
  status: MigrationStatus;
  method: 'copy' | 'rewrite' | 'omit';
};

export type CapabilityProfile = Record<string, CapabilitySupport>;
```

- [ ] **Step 2: Extend the adapter interface**

In `src/core/scanner/scanner.ts`, import the new types and extend:

```ts
import { AgentBundle, CapabilityProfile, EmitFn } from '../model/types.js';

export interface AgentAdapter {
  id: string;
  detect(ctx: { root: string }): Promise<DetectionResult>;
  scanProject(ctx: { root: string }): Promise<AgentBundle>;
  emit?: EmitFn;
  capabilities?: CapabilityProfile;
}
```

- [ ] **Step 3: Point both writers at the model**

In `src/adapters/opencode/writer.ts` and `src/adapters/kilo/writer.ts`, change the `TargetFile` import from `'../../core/writers.js'` to `'../../core/model/types.js'`. In `opencode/writer.ts` the existing import is `import { TargetFile } from '../../core/writers.js';` — merge it into the existing `ResourceBase` import so the file has one import from the model.

- [ ] **Step 4: Move registration onto the adapters**

`src/adapters/opencode/index.ts`:

```ts
import { AgentAdapter } from '../../core/scanner/scanner.js';
import { detectOpenCode } from './detector.js';
import { scanOpenCodeProject } from './scanner.js';
import { writeOpenCodeFiles } from './writer.js';

export const openCodeAdapter: AgentAdapter = {
  id: 'opencode',
  detect: detectOpenCode,
  scanProject: scanOpenCodeProject,
  emit: writeOpenCodeFiles
};
```

`src/adapters/kilo/index.ts` — drop `registerWriter`, add `emit`:

```ts
import { AgentAdapter } from '../../core/scanner/scanner.js';
import { detectKilo } from './detector.js';
import { scanKiloProject } from './scanner.js';
import { writeKiloFiles } from './writer.js';

export const kiloAdapter: AgentAdapter = {
  id: 'kilo',
  detect: detectKilo,
  scanProject: scanKiloProject,
  emit: writeKiloFiles
};
```

- [ ] **Step 5: Clean the registry**

`src/adapters/registry.ts` becomes only the map — remove `import { registerWriter }`, `import { writeOpenCodeFiles }`, and the "Register target writers" call:

```ts
import { AgentAdapter } from '../core/scanner/scanner.js';
import { claudeAdapter } from './claude-code/index.js';
import { openCodeAdapter } from './opencode/index.js';
import { kiloAdapter } from './kilo/index.js';

export const adapters: Record<string, AgentAdapter> = {
  'claude-code': claudeAdapter,
  'opencode': openCodeAdapter,
  'kilo': kiloAdapter,
};
```

- [ ] **Step 6: Pipeline fails fast and uses `adapter.emit`**

In `src/core/pipeline.ts`:
- Remove `import { getWriter } from './writers.js';`.
- At the top of `migratePipeline`, before scanning, replace the `getWriter` lookup with:

```ts
const targetAdapter = adapters[target];
if (!targetAdapter) throw new Error(`Unknown target agent: ${target}`);
if (!targetAdapter.emit) throw new Error(`No emitter is registered for ${target}, so migrations into it are not supported yet.`);
```

- Replace `const writeFn = getWriter(target);` / the two-line `if (!writeFn)` guard with `const writeFn = targetAdapter.emit;`.

Failing **before** the scan is the point: the user learns the target is unsupported before the tool touches anything.

- [ ] **Step 7: Delete the old registry**

```bash
rm src/core/writers.ts
```

Run `npm run typecheck` — it must report no unresolved imports. If it does, the caller was missed; fix it rather than restoring the file.

- [ ] **Step 8: Run the full suite**

Run: `npm run typecheck && npm test`
Expected: clean, all pass. Then re-run the Task 1 smoke commands for both targets:
```bash
T=$(mktemp -d) && cp -r tests/fixtures/claude-real/. "$T"/ && npx tsx src/cli/main.ts migrate claude-code kilo "$T"
T2=$(mktemp -d) && cp -r tests/fixtures/claude-real/. "$T2"/ && npx tsx src/cli/main.ts migrate claude-code opencode "$T2"
```
Both must exit 0.

- [ ] **Step 9: Commit**

```bash
git add -A src tests
git commit -m "refactor: move emit onto the adapter, drop the global writer registry"
```

---

### Task 3: Capability profiles replace the pairwise rule table

**Files:**
- Modify: `src/core/compatibility/engine.ts`, `src/core/pipeline.ts`, `src/adapters/opencode/index.ts`, `src/adapters/kilo/index.ts`, `src/cli/commands/plan.ts`, `src/cli/commands/diff.ts`, `tests/unit/compatibility/engine.test.ts`
- Delete: `src/registry/rules.ts`, `tests/unit/registry/rules.test.ts`

**Why:** `getRulesForMigration` matches rules by string prefix/suffix on `id` (`rules.ts:16`) — brittle, and it forces one rule set per source/target pair. Since `AgentBundle` is already a canonical IR, what a migration can carry depends only on the target. One profile per target is N + M instead of N x M, and it sits next to the emitter it describes.

**Interfaces:**
- Consumes: `CapabilityProfile`, `CapabilitySupport`, `MigrationStatus` from `src/core/model/types.ts` (added in Task 2).
- Produces: `evaluateCompatibility(sourceCapability: string, profile: CapabilityProfile): CompatibilityResult` and `planMigration(target: string, resources: ResourceBase[]): PlanResult[]`.

- [ ] **Step 1: Write the failing test**

Rewrite `tests/unit/compatibility/engine.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { evaluateCompatibility } from '../../../src/core/compatibility/engine.js';
import { CapabilityProfile, MigrationStatus } from '../../../src/core/model/types.js';

const profile: CapabilityProfile = {
  instructions: { status: MigrationStatus.DIRECT, method: 'copy' },
  mcpServers: { status: MigrationStatus.ADAPTED, method: 'rewrite' },
};

describe('Compatibility Engine', () => {
  it('evaluates direct mapping', () => {
    const result = evaluateCompatibility('instructions', profile);
    expect(result.status).toBe(MigrationStatus.DIRECT);
    expect(result.method).toBe('copy');
  });

  it('evaluates adapted mapping', () => {
    const result = evaluateCompatibility('mcpServers', profile);
    expect(result.status).toBe(MigrationStatus.ADAPTED);
    expect(result.method).toBe('rewrite');
  });

  it('reports a capability the target does not handle as unsupported', () => {
    const result = evaluateCompatibility('opaque', profile);
    expect(result.status).toBe(MigrationStatus.UNSUPPORTED);
    expect(result.method).toBe('omit');
  });

  it('reports unknown capabilities as unsupported', () => {
    const result = evaluateCompatibility('hook', profile);
    expect(result.status).toBe(MigrationStatus.UNSUPPORTED);
    expect(result.method).toBe('omit');
  });

  it('returns per-resource results', () => {
    const resources = [
      { id: '1', type: 'instructions', name: 'AGENTS.md' },
      { id: '2', type: 'hook', name: 'test-hook' }
    ];
    const results = resources.map(r => ({
      ...r,
      compatibility: evaluateCompatibility(r.type, profile)
    }));
    expect(results[0].compatibility.status).toBe(MigrationStatus.DIRECT);
    expect(results[1].compatibility.status).toBe(MigrationStatus.UNSUPPORTED);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/compatibility/engine.test.ts`
Expected: FAIL — `evaluateCompatibility` still expects a rule array.

- [ ] **Step 3: Rewrite the engine**

`src/core/compatibility/engine.ts` in full:

```ts
import { CapabilityProfile, MigrationStatus } from '../model/types.js';

export type CompatibilityResult = {
  sourceCapability: string;
  status: MigrationStatus;
  method: string;
};

export function evaluateCompatibility(
  sourceCapability: string,
  profile: CapabilityProfile
): CompatibilityResult {
  const support = profile[sourceCapability];

  if (!support) {
    return {
      sourceCapability,
      status: MigrationStatus.UNSUPPORTED,
      method: 'omit',
    };
  }

  return {
    sourceCapability,
    status: support.status,
    method: support.method,
  };
}
```

The `CompatibilityRule` type is deleted with the rule table; nothing else uses it once `rules.test.ts` is gone.

- [ ] **Step 4: Attach profiles to the adapters**

`src/adapters/opencode/index.ts` — add:

```ts
import { MigrationStatus } from '../../core/model/types.js';

  capabilities: {
    instructions: { status: MigrationStatus.DIRECT, method: 'copy' },
    mcpServers: { status: MigrationStatus.ADAPTED, method: 'rewrite' },
    opaque: { status: MigrationStatus.ADAPTED, method: 'rewrite' },
  }
```

`src/adapters/kilo/index.ts` — same shape. Kilo's MCP shape differs from Claude's, so `mcpServers` is `ADAPTED`; `opaque` is `ADAPTED` because Claude's `settings.json` is rewritten into `kilo.jsonc`; `instructions` is `DIRECT`.

- [ ] **Step 5: Rewire the pipeline**

In `src/core/pipeline.ts`:
- Remove `import { getRulesForMigration } from '../registry/rules.js';`.
- Change the signature and body:

```ts
export function planMigration(target: string, resources: ResourceBase[]): PlanResult[] {
  const profile = adapters[target].capabilities ?? {};
  return resources.map(resource => ({
    resource,
    compatibility: evaluateCompatibility(resource.type, profile)
  }));
}
```

- Update the in-function call `planMigration(source, target, resources)` to `planMigration(target, resources)`.
- `source` remains a parameter of `planMigration`'s callers only for validation and display; it is no longer used to pick rules.

- [ ] **Step 6: Update the two callers**

`src/cli/commands/plan.ts`: `const plan = planMigration(source, target, resources);` becomes `const plan = planMigration(target, resources);`. Add a fail-fast before scanning so `plan` cannot promise a migration that cannot run:

```ts
if (!adapters[target].emit) {
  console.error(`Migrations into ${target} are not supported yet: no emitter is registered.`);
  process.exit(1);
}
```

`src/cli/commands/diff.ts`: same signature change plus the same guard.

- [ ] **Step 7: Delete the rule table and its test**

```bash
rm src/registry/rules.ts tests/unit/registry/rules.test.ts
rmdir src/registry 2>/dev/null || true
```

- [ ] **Step 8: Run the full suite**

Run: `npm run typecheck && npm test`
Expected: clean, all pass.

- [ ] **Step 9: Verify a target with no emitter reports honestly**

`claude-code` has no emitter (no reverse migration is requested), so:
```bash
npx tsx src/cli/main.ts plan opencode claude-code tests/fixtures/opencode-basic
```
Expected: exits 1 with "Migrations into claude-code are not supported yet" — not a plan full of ✓.

- [ ] **Step 10: Commit**

```bash
git add -A src tests
git commit -m "refactor: replace pairwise rule table with per-target capability profiles"
```

---

### Task 4: Documentation accuracy and end-to-end verification

**Files:**
- Modify: `README.md`, `CHANGELOG.md`, `src/cli/commands/help.ts`

**Why:** README currently lists `Claude Code → Kilo Code ✅` — true only after Task 1. It must also stop implying that every agent pair works now that unsupported targets fail loudly.

- [ ] **Step 1: Update the README migration table**

Replace the "Supported Migrations" table body with:

```markdown
| Source | Target | Status |
|--------|--------|--------|
| Claude Code | OpenCode | ✅ Supported |
| Claude Code | Kilo Code | ✅ Supported |
```

and add one line beneath it:

```markdown
Any target without an emitter (for example migrating *into* Claude Code) is rejected up front by
`plan`, `diff` and `migrate` rather than reported as supported.
```

- [ ] **Step 2: Update the "How It Works" file list**

Change the scan list `AGENTS.md`, `.claude/`, `opencode.jsonc`, `.kilo/` to name the real paths: `AGENTS.md`, `CLAUDE.md`, `.claude/`, `opencode.jsonc`, `kilo.jsonc` / `.kilo/kilo.jsonc`.

- [ ] **Step 3: Add the rollback flags to the command table**

Add to the README command table:

```markdown
| `rollback <path> <migration-id> [--force]` | Restore from backup |
```

- [ ] **Step 4: Extend the CHANGELOG**

Under the existing `## [Unreleased]` section, add an `### Adapters` subsection:

```markdown
### Adapters
- Kilo Code emitter: `migrate claude-code kilo` now works instead of throwing
  "Target writer for kilo not yet implemented".
- Kilo project config is read from and written to the documented `kilo.jsonc` /
  `.kilo/kilo.jsonc` locations, with MCP servers under the `mcp` key.
- `emit` and `capabilities` moved onto the adapter; the global writer registry and the
  pairwise rule table were deleted. `plan`, `diff` and `migrate` now read one source of truth,
  so a preview can no longer promise a migration that will fail.
- Unsupported targets are rejected before any file is read.
```

- [ ] **Step 5: Add the rollback line to help text**

In `src/cli/commands/help.ts`, confirm the `--force` line added with the transaction work is present; if not, add:

```
  rollback ... --force             Roll back even if files changed after the migration
```

- [ ] **Step 6: Full verification**

Run:
```bash
npm run typecheck && npm test
```
Expected: clean, all pass.

Then the end-to-end matrix:
```bash
for T in opencode kilo; do
  D=$(mktemp -d) && cp -r tests/fixtures/claude-real/. "$D"/ \
    && npx tsx src/cli/main.ts plan claude-code "$T" "$D" \
    && npx tsx src/cli/main.ts migrate claude-code "$T" "$D" \
    && npx tsx src/cli/main.ts scan "$D"
done
```
Expected: both targets plan, migrate, and then `scan` detects the target agent in the migrated project — proving the emitter and the detector agree.

- [ ] **Step 7: Commit**

```bash
git add README.md CHANGELOG.md src/cli/commands/help.ts
git commit -m "docs: correct supported migrations and document the new adapter contract"
```

---

## Self-Review

**Spec coverage.** Every finding from the 2026-09-13 architecture review that is in scope has a task: missing Kilo emitter → Task 1; global mutable writer registry + import side effect → Task 2; pairwise rules matched by id string → Task 3; README/HELP claiming unsupported migrations → Task 4. The transaction-core findings were implemented earlier in the session (write-ahead journal, atomic writes, lock, error taxonomy, hashed backup names, rollback verification) and are recorded in `CHANGELOG.md` under `[Unreleased]` — they are not re-tasked here.

**Out of scope (deliberately).** No reverse migrations into Claude Code: adding a `claude-code` emitter is YAGNI until someone asks, and Task 3 makes the absence honest instead of silent. No `permissions` translation for Kilo: the mapping is unverified. No `fsync`: the transaction core survives process crash but not power loss, already marked with a `ponytail:` comment.

**Placeholder scan.** No TBD/TODO, no "add appropriate error handling", every code step has the actual code, and every signature used by a later task (`TargetFile`, `EmitFn`, `CapabilityProfile`, `writeKiloFiles`, `planMigration(target, resources)`, `evaluateCompatibility(type, profile)`) is defined in the task that introduces it.

**Type consistency.** `TargetFile` is imported from `core/writers.js` in Task 1 (where it lives today) and from `core/model/types.js` from Task 2 onward — Task 2 Step 3 performs that change explicitly. `planMigration` drops its `source` parameter in Task 3 and both call sites are updated in the same task. `evaluateCompatibility`'s second parameter changes from `CompatibilityRule[]` to `CapabilityProfile` in Task 3, and the only test that used the old type is rewritten in the same task.
