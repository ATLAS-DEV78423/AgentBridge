# Windsurf Adapter & Core Robustness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand AgentBridge to support Windsurf as the 14th agent with complete bidirectional migration coverage ($14 \times 13 = 182$ pairs in the migration sweep), improve auto-fix support for legacy MCP config key aliases in `fix`, and update developer setup documentation in `CONTRIBUTING.md`.

**Architecture:** Extend the existing zero-dependency adapter registry using `makeJsonAgent` and `makeJsonWriter` in `src/adapters/simple-agents.ts` for Windsurf's `.codeium/windsurf/mcp_config.json` (or `.windsurf/mcp.json`) and `AGENTS.md` / `.windsurfrules`. Register Windsurf in `src/adapters/registry.ts`, define its validation spec in `src/core/doctor.ts`, expand `src/core/fixer.ts` to safely migrate legacy aliases (`mcpServers` → `mcp`), update README / help documentation, and expand the test suite and 182-pair migration sweep.

**Tech Stack:** TypeScript (strict mode, ESM with `.js` extensions), Node.js ≥ 22 built-in modules (`node:fs/promises`, `node:path`, `node:crypto`), Vitest 4, zero runtime dependencies.

**Spec:** Following ponytail guidelines (YAGNI, stdlib-first, minimal diff, zero dependencies, structural invariants, verified tests).

## Global Constraints

- Zero runtime dependencies (`dependencies` in `package.json` must remain empty).
- All relative TypeScript imports must specify the `.js` extension (`from './something.js'`).
- `dist/` is generated output and never edited or tracked in git.
- Every non-trivial change must be accompanied by runnable tests.
- Every task must pass `npm run typecheck` (`tsc --noEmit`) and `npm test` (`vitest run`).

---

### Task 1: Update `CONTRIBUTING.md` Adapter Registration Guide

**Files:**
- Modify: `CONTRIBUTING.md:35-45`

**Interfaces:**
- Consumes: Existing adapter registration architecture (`src/adapters/registry.ts`).
- Produces: Accurate documentation reflecting `AGENT_REGISTRATIONS` in `src/adapters/registry.ts`.

- [ ] **Step 1: Inspect `CONTRIBUTING.md`**

Verify lines 35–45 where outdated registration instructions reside.

- [ ] **Step 2: Update `CONTRIBUTING.md`**

Update `Adding a New Agent Adapter` to specify:
1. For simple JSON/instruction agents: define spec in `src/adapters/simple-agents.ts` via `makeJsonAgent` and `makeJsonWriter`.
2. For bespoke dialect agents: create `src/adapters/<agent-name>/` (detector, scanner, writer).
3. Register the adapter and writer tuple in `AGENT_REGISTRATIONS` in `src/adapters/registry.ts`.
4. Add config validation specs to `SPECS` and instruction mappings to `INSTRUCTION_FILES` in `src/core/doctor.ts`.
5. Add unit and integration test fixtures under `tests/`.

- [ ] **Step 3: Verify format and commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: update contributing guide for centralized adapter registry"
```

---

### Task 2: Doctor and Fixer Support for MCP Key Aliases (`mcpServers` → `mcp`)

**Files:**
- Modify: `src/core/doctor.ts`
- Modify: `src/core/fixer.ts`
- Test: `tests/unit/core/fixer.test.ts`

**Interfaces:**
- Consumes: `DoctorProblem`, `DoctorAgentReport` from `src/core/doctor.ts`.
- Produces: `fixProject` support for `rewrite-alias-key` rewriting obsolete keys in place within an atomic backup transaction.

- [ ] **Step 1: Write the failing unit test in `tests/unit/core/fixer.test.ts`**

Add a test case in `tests/unit/core/fixer.test.ts` asserting that an OpenCode project with `{"mcpServers": { "fs": { "command": "npx" } }}` in `opencode.json` is auto-fixed to `{"mcp": { "fs": { ... } }}` with `txId` generated and backup created.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/core/fixer.test.ts`
Expected: FAIL (no fix planned for alias key).

- [ ] **Step 3: Implement `rewrite-alias-key` in `src/core/fixer.ts`**

In `fixProject`:
1. Check if a problem mentions `found "mcpServers" but <agent> expects "mcp"`.
2. Parse JSON/JSONC config with `parseJsonc`.
3. If `mcpServers` exists and `mcp` does not, rename `doc.mcp = doc.mcpServers; delete doc.mcpServers;`.
4. Push a `create` operation and record `PlannedChange` with kind `'rewrite-alias-key'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/core/fixer.test.ts`
Expected: PASS.

- [ ] **Step 5: Run full test suite and commit**

```bash
git add src/core/fixer.ts tests/unit/core/fixer.test.ts
git commit -m "feat: auto-fix legacy mcpServers aliases in doctor fix command"
```


---

### Task 3: Implement Windsurf Adapter & Writer

**Files:**
- Modify: `src/adapters/simple-agents.ts`
- Modify: `src/adapters/registry.ts`
- Modify: `src/core/doctor.ts`
- Modify: `src/cli/commands/help.ts`
- Test: `tests/unit/adapters/factory-agents.test.ts`
- Test: `tests/unit/adapters/registry-invariant.test.ts`
- Test: `tests/integration/cli-args.test.ts`

**Interfaces:**
- Consumes: `makeJsonAgent`, `makeJsonWriter` from `src/adapters/simple-agents.ts`.
- Produces: `windsurfAdapter`, `writeWindsurfFiles` registered in `AGENT_REGISTRATIONS` under ID `'windsurf'`.
- Config Spec:
  - Markers: `['.codeium/windsurf/mcp_config.json', '.windsurf/mcp.json']`.
  - Config Path: `.codeium/windsurf/mcp_config.json` (format: `json`).
  - MCP Key: `mcpServers`.
  - Instructions: reads `AGENTS.md` and `.windsurfrules`.
  - Writer: marker `.codeium/windsurf/mcp_config.json`, mcpKey `'mcpServers'`, instructionFile `'AGENTS.md'`.

- [ ] **Step 1: Write failing tests in `tests/unit/adapters/factory-agents.test.ts` and update `tests/integration/cli-args.test.ts`**

Add unit tests for `windsurfAdapter` and `writeWindsurfFiles`. Update `tests/integration/cli-args.test.ts` to expect `'windsurf'` as a valid agent instead of an unknown agent test fixture (replace the test's placeholder unknown agent with an actual unknown string like `'fake-agent'`).

- [ ] **Step 2: Run tests to verify failures**

Run: `npx vitest run tests/unit/adapters/factory-agents.test.ts tests/integration/cli-args.test.ts`
Expected: FAIL.

- [ ] **Step 3: Define `windsurfAdapter` and `writeWindsurfFiles` in `src/adapters/simple-agents.ts`**

Export `windsurfAdapter` and `writeWindsurfFiles`:
```ts
export const windsurfAdapter = makeJsonAgent({
  id: 'windsurf',
  marker: ['.codeium/windsurf/mcp_config.json', '.windsurf/mcp.json'],
  mcpKey: 'mcpServers',
  instructionFile: 'AGENTS.md',
});
export const writeWindsurfFiles = makeJsonWriter({
  marker: '.codeium/windsurf/mcp_config.json',
  mcpKey: 'mcpServers',
  instructionFile: 'AGENTS.md',
});
```

- [ ] **Step 4: Register Windsurf in `src/adapters/registry.ts`**

Import `windsurfAdapter` and `writeWindsurfFiles`, and append `['windsurf', windsurfAdapter, writeWindsurfFiles]` to `AGENT_REGISTRATIONS`.

- [ ] **Step 5: Register Windsurf in `src/core/doctor.ts` and `src/cli/commands/help.ts`**

1. In `src/core/doctor.ts`:
   - Add `'windsurf'` to `SPECS`:
     ```ts
     'windsurf': {
       configPaths: [{ path: '.codeium/windsurf/mcp_config.json', format: 'json' }, { path: '.windsurf/mcp.json', format: 'json' }],
       mcpKey: 'mcpServers',
       transport: null,
     },
     ```
   - Add `'windsurf'` to `INSTRUCTION_FILES`: `['AGENTS.md', '.windsurfrules']`.
2. In `src/cli/commands/help.ts`:
   - Add `windsurf` to the supported agent listing.

- [ ] **Step 6: Update registry invariant and unit tests**

Add `'windsurf'` to `EXPECTED` in `tests/unit/adapters/registry-invariant.test.ts`.
Run: `npx vitest run tests/unit/adapters/registry-invariant.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit Windsurf adapter**

```bash
git add src/adapters/simple-agents.ts src/adapters/registry.ts src/core/doctor.ts src/cli/commands/help.ts tests/
git commit -m "feat: add Windsurf as the 14th agent"
```

---

### Task 4: Expand Migration Sweep and Verification Tests

**Files:**
- Modify: `scripts/sweep.ts`
- Modify: `README.md`
- Test: `tests/unit/docs/compatibility-matrix.test.ts`

**Interfaces:**
- Consumes: 14 agents (`claude-code`, `opencode`, `kilo`, `cursor`, `gemini`, `codex`, `copilot`, `crush`, `grok`, `omp`, `muse-code`, `pi`, `cline`, `windsurf`).
- Produces: $14 \times 13 = 182$ bidirectional tested pairs and synchronized documentation matrix.

- [ ] **Step 1: Add Windsurf to `scripts/sweep.ts`**

1. Add `'windsurf'` to `AGENTS` array.
2. In `INSTRUCTION_FILE`: `'windsurf': 'AGENTS.md'`.
3. In `seed()`:
   ```ts
   case 'windsurf':
     await write('AGENTS.md', RULES);
     await write('.codeium/windsurf/mcp_config.json', json({ mcpServers: servers }));
     break;
   ```
4. In `targetConfigs`:
   ```ts
   'windsurf': ['.codeium/windsurf/mcp_config.json'],
   ```

- [ ] **Step 2: Update `tests/unit/docs/compatibility-matrix.test.ts` & `README.md`**

1. Add `'windsurf'` to `AGENTS` in `tests/unit/docs/compatibility-matrix.test.ts`.
2. Run matrix test to generate/verify required README table rows.
3. Update `README.md`:
   - Change supported agent count from 13 to 14.
   - Add Windsurf to table and notes.
   - Insert all 182 pair matrix rows into `README.md`.

- [ ] **Step 3: Run full verification suite**

Run:
```bash
npm test
npm run typecheck
npm run build
bash scripts/smoke.sh
```

- [ ] **Step 4: Commit sweep and matrix updates**

```bash
git add scripts/sweep.ts README.md tests/unit/docs/compatibility-matrix.test.ts
git commit -m "test: expand full-migration sweep to 14 agents (182 pairs) and update matrix"
```
