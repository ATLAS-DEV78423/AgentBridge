# Complete & Verify AgentBridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the in-flight dedup cleanup sitting uncommitted in the working tree, and close the one real coverage gap — `executeRollback`, the data-safety "undo" path the README advertises, has zero tests.

**Architecture:** No production logic changes. Task 1 commits a refactor that is already written and verified (a lookup table replaces an if-chain; duplicate agent-id validation is removed from the CLI's shared arg helper). Task 2 adds one integration test file that drives the real CLI through `migrate` → `rollback` the way a user would, matching the existing `tests/integration/cli-*.test.ts` pattern.

**Tech Stack:** TypeScript (ESM, strict), Node ≥ 22 built-ins only, Vitest. Zero runtime dependencies — no new deps.

**Spec:** State of the repo at plan time (verified by running it, not assumed):
1. `npm test` → 203 tests / 33 files pass; `npm run typecheck`, `npm run build`, `scripts/smoke.sh`, `npx tsx src/cli/main.ts doctor .`, and `npm run sweep` (132/132 pairs) all pass. Nothing is functionally missing — no TODO/FIXME/"not yet implemented" anywhere in `src/`.
2. The working tree carries an uncommitted, finished cleanup: `scripts/sweep.ts` (if-chain → lookup table), `src/cli/main.ts` (drop `checkPair`'s duplicate `requireAgent` calls — `plan`/`diff` validate their own ids and `migratePipeline` throws on unknown ids), plus the two test adjustments that follow.
3. `executeRollback` (`src/cli/commands/rollback.ts`) is wired into `src/cli/main.ts` and advertised in the README, and is covered by **no** test. Existing tests only assert that the *rollback command is printed* (`tests/integration/cli-fix.test.ts:20`, `tests/unit/transaction/transaction.test.ts`) — never that running it restores state.
4. AGENTS.md ponytail rules apply: shortest diff, deletion over addition, no unrequested abstractions, and non-trivial data-path logic leaves ONE runnable check behind.

## Global Constraints

- Node ≥ 22, ESM (`"type": "module"`), relative imports use `.js` suffixes.
- Zero runtime dependencies; devDeps stay `vitest`, `tsx`, `typescript`, `@types/node`. No new test framework — Vitest is already configured (`vitest.config.ts`, `include: ['tests/**/*.test.ts']`).
- `npm run typecheck` (tsc --noEmit) must pass after every task. Note `tsconfig.json` has `"exclude": [..., "tests"]`, so test files are checked by Vitest's transform, not tsc.
- `npm test` (vitest run) must pass after every task.
- Integration tests drive the real CLI via `run('npx', ['tsx', 'src/cli/main.ts', ...], { cwd: path.resolve('.') })` — the established pattern in `tests/integration/cli-fix.test.ts` and `cli-args.test.ts`.
- Backups live at `<project>/.agentbridge/backups/<tx-id>/manifest.json` with `originals: Record<relPath, string | null>`; `null` means "created during the migration → delete on rollback". Do not change `transaction.ts`.
- `migrate` prints `Rollback: agent-migrate rollback <path> <tx-id>`; the tx id is also the last path segment of the printed `.agentbridge/backups/<id>` directory.
- The `gemini` target writer emits exactly two files for a claude-code source: `GEMINI.md` (created, so deleted on rollback) and `.gemini/settings.json` (merged into the user's existing file, so restored byte-for-byte on rollback). Claude's opaque `.claude/settings.json` is intentionally unmapped by the gemini writer.

---

### Task 1: Land the in-flight dedup cleanup

**Files:**
- Modify (already edited in the working tree): `scripts/sweep.ts:111-131`
- Modify (already edited in the working tree): `src/cli/main.ts:12,47-50`
- Test (already edited in the working tree): `tests/integration/cli-args.test.ts:51-56`, `tests/unit/adapters/factory-agents.test.ts:154-160`

**Interfaces:**
- Consumes: `requireAgent(id, role)` from `src/cli/commands/plan.ts` (still exported; still used by `src/cli/commands/diff.ts`).
- Produces: no new interfaces. `checkPair(source, target)` in `src/cli/main.ts` keeps its signature and now performs only the self-migration check.

- [ ] **Step 1: Confirm the working tree matches the intended refactor**

Run: `git --no-pager diff --stat`
Expected: exactly 4 files changed — `scripts/sweep.ts`, `src/cli/main.ts`, `tests/integration/cli-args.test.ts`, `tests/unit/adapters/factory-agents.test.ts`.

- [ ] **Step 2: Confirm no other caller relied on `checkPair` validating agent ids**

Run: `grep -n "requireAgent" src/cli/main.ts src/cli/commands/*.ts`
Expected: no match in `main.ts`; matches in `plan.ts` (definition + its own use) and `diff.ts` (import + two calls). The `migrate`/`apply`/`migrate-all` paths are covered by `migratePipeline`, which throws `Unknown source agent: … . Supported: …` / `Unknown target agent: … . Supported: …`.

- [ ] **Step 3: Run the full suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS — 33 files / 203 tests, no tsc errors.

- [ ] **Step 4: Commit**

```bash
git add scripts/sweep.ts src/cli/main.ts tests/integration/cli-args.test.ts tests/unit/adapters/factory-agents.test.ts
git commit -m "refactor: table-driven sweep source files, drop duplicate agent-id validation"
```

### Task 2: Regression-test the rollback round-trip

**Files:**
- Create: `tests/integration/cli-rollback.test.ts`

**Interfaces:**
- Consumes: CLI `migrate <source> <target> [path]` and `rollback <path> <migration-id>`; the backup layout written by `applyTransaction`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the test**

Create `tests/integration/cli-rollback.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const repo = path.resolve('.');

async function runCli(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await run('npx', ['tsx', 'src/cli/main.ts', ...args], { cwd: repo });
    return { code: 0, stdout, stderr };
  } catch (err: unknown) {
    const e = err as { code: number; stdout: string; stderr: string };
    return { code: e.code, stdout: e.stdout, stderr: e.stderr };
  }
}

/** The migration id migrate prints as the last segment of the backup dir path. */
function txIdOf(stdout: string): string {
  const match = stdout.match(/\.agentbridge\/backups\/([0-9a-f-]{36})/);
  if (!match) throw new Error(`no migration id in output:\n${stdout}`);
  return match[1];
}

describe('cli rollback', () => {
  it('undoes a migration: deletes created files, restores overwritten ones byte-for-byte', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-rollback-'));
    await fs.writeFile(path.join(dir, 'AGENTS.md'), '# Rules\n');
    await fs.mkdir(path.join(dir, '.claude'), { recursive: true });
    await fs.writeFile(
      path.join(dir, '.claude', 'settings.json'),
      JSON.stringify({ model: 'm1', mcpServers: { fs: { command: 'echo-server' } } }),
    );
    // A target config the user already owns, with keys the migration must keep.
    await fs.mkdir(path.join(dir, '.gemini'), { recursive: true });
    const original = '{\n  "model": "user-choice",\n  "mcpServers": { "keepme": { "command": "keep" } }\n}';
    await fs.writeFile(path.join(dir, '.gemini', 'settings.json'), original);

    const mig = await runCli(['migrate', 'claude-code', 'gemini', dir]);
    expect(mig.code).toBe(0);
    // migrated: user keys survive the merge, the source's server arrived, instructions created
    const merged = await fs.readFile(path.join(dir, '.gemini', 'settings.json'), 'utf-8');
    expect(merged).toContain('user-choice');
    expect(merged).toContain('keepme');
    expect(merged).toContain('echo-server');
    await expect(fs.access(path.join(dir, 'GEMINI.md'))).resolves.toBeUndefined();

    const rb = await runCli(['rollback', dir, txIdOf(mig.stdout)]);
    expect(rb.code).toBe(0);

    // the overwritten config is byte-for-byte the original again
    expect(await fs.readFile(path.join(dir, '.gemini', 'settings.json'), 'utf-8')).toBe(original);
    // and the file the migration created is gone
    await expect(fs.access(path.join(dir, 'GEMINI.md'))).rejects.toThrow();

    await fs.rm(dir, { recursive: true, force: true });
  });

  it('exits 1 for an unknown migration id instead of pretending it rolled back', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentbridge-rollback2-'));

    const { code, stderr } = await runCli(['rollback', dir, 'not-a-real-id']);

    expect(code).toBe(1);
    expect(stderr).toMatch(/not-a-real-id/);
    await fs.rm(dir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run tests/integration/cli-rollback.test.ts`
Expected: PASS — 2 tests. Both paths already work through the real CLI (verified by an E2E playtest); this task locks that behavior in so a future transaction change cannot silently break undo.

- [ ] **Step 3: Confirm the test actually guards something**

Temporarily comment out the restore loop in `src/cli/commands/rollback.ts` (the `for (const [relPath, originalContent] of Object.entries(originals))` block), then run:

Run: `npx vitest run tests/integration/cli-rollback.test.ts`
Expected: FAIL on the byte-for-byte assertion — proving the test detects a broken undo rather than passing vacuously. Restore the file exactly, then re-run to PASS:

```bash
git checkout src/cli/commands/rollback.ts
npx vitest run tests/integration/cli-rollback.test.ts
```

- [ ] **Step 4: Run the full suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS — 34 files / 205 tests, no tsc errors.

- [ ] **Step 5: Commit**

```bash
git add tests/integration/cli-rollback.test.ts
git commit -m "test: guard the rollback round-trip (created files deleted, overwritten restored)"
```

---

### Task 3: Record the coverage and re-verify the release gate

**Files:**
- Modify: `CHANGELOG.md` (the `## [1.7.0] - 2026-09-16` → `### Tests & docs` bullet)

**Interfaces:**
- Consumes: everything from Tasks 1–2.
- Produces: nothing.

- [ ] **Step 1: Update the CHANGELOG**

In `CHANGELOG.md`, under `## [1.7.0] - 2026-09-16` → `### Tests & docs`, replace:

```markdown
- 203 tests (was 195); opencode fixture, writer/scanner/detection/pipeline tests pinned to the documented dialect; new opencode detection regression tests
```

with:

```markdown
- 205 tests (was 195); opencode fixture, writer/scanner/detection/pipeline tests pinned to the documented dialect; new opencode detection regression tests. The migrate→rollback round-trip is now covered through the real CLI (created files deleted, overwritten configs restored byte-for-byte) — the undo path previously had no test at all
```

- [ ] **Step 2: Run the whole gate exactly as CI does**

Run: `npm test && npm run typecheck && npx tsx src/cli/main.ts doctor . && npm run build && bash scripts/smoke.sh`
Expected: all pass; `doctor` exits 0. This mirrors `.github/workflows/ci.yml`.

- [ ] **Step 3: Run the 132-pair sweep**

Run: `npm run sweep`
Expected: `Sweep: 132/132 pairs passed, 0 failed`.

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: changelog for the rollback round-trip coverage"
```

---

## Self-Review Notes

1. **Spec coverage:** Spec item 2 (uncommitted cleanup) → Task 1. Spec item 3 (`executeRollback` untested) → Task 2, including a deliberate Step 3 that proves the test fails when undo is broken instead of assuming it guards anything. Spec item 1 (everything else already green) → Task 3 re-runs every existing gate rather than adding speculative work. Spec item 4 (ponytail) → this plan adds one test file and zero production code; the refactor it lands is already written and *deletes* lines.
2. **No placeholders:** every step has a literal command and its expected result; the one new file is given in full.
3. **Type consistency:** `runCli` returns `{ code, stdout, stderr }` in both `cli-rollback.test.ts` and the existing `cli-args.test.ts`; `txIdOf` returns `string`. No production symbol is renamed anywhere in this plan, so cross-task signature drift is impossible.
4. **Deliberately not done (YAGNI):** no new CI job beyond the existing sweep job, no `rollback --dry-run`, no new CLI flags, no coverage thresholds. The repo already runs tests, typecheck, doctor, build, smoke, and the 132-pair sweep in CI; more gates are boilerplate nobody asked for.

---