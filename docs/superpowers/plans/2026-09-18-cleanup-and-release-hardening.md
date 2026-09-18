# AgentBridge Cleanup & Release-Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the dead surface the ponytail audit found, fix a real packaging defect (orphaned `dist/` artifacts shipping to npm), and make the release pipeline as strict as the CI pipeline.

**Architecture:** All changes are deletions or small substitutions — no new modules, no new dependencies, no new abstractions. The one behavior change (rollback of the unknown-source message in `migrate-all`) is a root-cause fix: it reuses the existing `requireAgent`, which writes a single stderr line precisely so it cannot be lost when output is piped.

**Tech Stack:** TypeScript (ESM, strict), Node ≥ 22 built-ins only, Vitest. Zero runtime and zero new dev dependencies.

**Spec:** Verified state at plan time:
1. `npm test` → 205 tests / 34 files pass; typecheck, build, `scripts/smoke.sh`, `doctor .`, and `npm run sweep` (132/132) all pass. Working tree clean at commit `cefeb77`.
2. `npm pack --dry-run` ships **145 files including two orphans with no source**: `dist/core/compatibility/engine.js` and `dist/registry/rules.js`. `tsc` does not prune `dist/`, and `build` never cleans it, so deleted source files keep shipping.
3. npm has `1.0.0, 1.5.0, 1.6.0`; `dist-tags.latest = 1.6.0`. Local `package.json` is `1.7.0` and `refs/tags/v1.7.0` exists on origin pointing at `a1f2256` — so **1.7.0 is tagged but was never published**. That means the 1.7.0 CHANGELOG section is still editable (unshipped).
4. `.github/workflows/release.yml` gates on `npm test` + `npm run build` + `node dist/cli/main.js doctor .`, which is weaker than `.github/workflows/ci.yml` (which also runs `npm run typecheck` and `bash scripts/smoke.sh`). RELEASING.md claims the release runs the smoke script; it does not.
5. `RELEASING.md`'s version-history table stops at v1.4.0 (missing 1.5.0/1.6.0/1.7.0).
6. Ponytail audit findings to apply: unused `spec.id` in `makeJsonWriter` (+6 call sites), 8 dead re-exports, `fix.ts`'s redundant second `doctor()` call, `migrate-all.ts`'s duplicated unknown-agent message, `export` on an internally-only `BANNER`, and `enum MigrationStatus`.

**Explicitly NOT doing (and why):** the audit also flagged per-agent path knowledge mirrored in adapter scanners, `doctor.ts`, and `scripts/sweep.ts`. That duplication is **load-bearing**: `doctor` and `sweep` are independent validators. If they derived their path/schema tables from the same registry the writers read, a wrong entry in the registry would become invisible to both. The independence is the feature; consolidating would weaken the test battery. Documented here so the decision is not re-litigated.

## Global Constraints

- Node ≥ 22, ESM (`"type": "module"`), relative imports use `.js` suffixes.
- Zero runtime deps and zero new devDeps. `npm run build` may not use `rimraf` or any added tool.
- `npm test` and `npm run typecheck` must pass after every task.
- `dist/` is gitignored and built only by `prepublishOnly`/CI — cleaning it is always safe.
- Deleting a re-export or an unused parameter cannot change runtime behavior; this must still be proven by the full suite plus the 132-pair sweep.
- `npm test` must end at 206 tests / 34 files after Task 1 (one new guard: `migrate-all` rejects an unknown source).
- **No `git push`, no `npm publish`, no tag creation** is part of this plan. Those are outward-facing and irreversible; Task 4 prepares them and reports the exact commands.
### Task 1: Apply the ponytail cuts

**Files:**
- Modify: `src/adapters/simple-agents.ts:88,129,132,135,138,141,147` (drop `id` from `makeJsonWriter`'s spec + 6 call sites)
- Modify: `src/adapters/claude-code/index.ts:11-12`, `src/adapters/cursor/index.ts:11-12`, `src/adapters/codex/index.ts:10-11`, `src/adapters/gemini/index.ts:11-12` (drop dead re-exports)
- Modify: `src/core/fixer.ts` (return the `doctor` reports it already computes)
- Modify: `src/cli/commands/fix.ts:9` (consume them instead of re-running doctor)
- Modify: `src/cli/commands/migrate-all.ts:12-16` (reuse `requireAgent`)
- Modify: `src/cli/banner.ts:1` (drop `export`)
- Modify: `src/core/model/types.ts:1-5` (enum → union type), `src/core/pipeline.ts:4,94-95`

**Interfaces:**
- Consumes: `requireAgent(id, role)` from `src/cli/commands/plan.ts`; `doctor()`'s `DoctorAgentReport[]`.
- Produces: `fixProject` now returns `{ txId: string | null; fixes: string[]; changes: PlannedChange[]; reports: DoctorAgentReport[] }` (Task 1 is the only consumer of the new field).

- [x] **Step 1: Write the new guard first (it must fail before the fix)**

A `migrate-all <unknown>` currently prints its "Supported agents" line to **stdout**, which the `process.exit(1)` can cut off when piped. Add to `tests/integration/cli-args.test.ts`, inside the existing `describe('careless-argument handling (playtest findings)')` block:

```typescript
  it('migrate-all rejects an unknown source with the agent list on stderr', async () => {
    const { code, stderr } = await runCli(['migrate-all', 'windsurf']);
    expect(code).toBe(1);
    expect(stderr).toMatch(/windsurf/);
    expect(stderr).toMatch(/kilo/); // registry-derived list, on stderr so a pipe can't drop it
  });
```

- [x] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/integration/cli-args.test.ts`
Expected: FAIL — `stderr` does not match `/kilo/` because the list went to stdout.

- [x] **Step 3: Point `migrate-all` at the existing helper**

Replace `src/cli/commands/migrate-all.ts` lines 12-16 with:

```typescript
  requireAgent(source, 'source');
```

and add to the imports:

```typescript
import { requireAgent } from './plan.js';
```

- [x] **Step 4: Run it to verify it passes**

Run: `npx vitest run tests/integration/cli-args.test.ts`
Expected: PASS — 10 tests.

- [x] **Step 5: Drop the unused `id` from `makeJsonWriter`**

In `src/adapters/simple-agents.ts` remove `id: string;` from `makeJsonWriter`'s inline spec type (line 88), and delete `id: '<agent>', ` from all six `makeJsonWriter({...})` call sites (lines 129, 132, 135, 138, 141, 147). Verify nothing read it:

Run: `grep -n 'spec\.' src/adapters/simple-agents.ts`
Expected: no `spec.id` anywhere.

- [x] **Step 6: Drop the eight dead re-exports**

Delete these lines (nothing imports them from `index.ts`; tests import the detector/scanner modules directly, and `kilo`/`opencode` indices never had them):

```typescript
// src/adapters/claude-code/index.ts
export { detectClaude } from './detector.js';
export { scanClaudeProject } from './scanner.js';
// src/adapters/cursor/index.ts
export { detectCursor } from './detector.js';
export { scanCursorProject } from './scanner.js';
// src/adapters/codex/index.ts
export { detectCodex } from './scanner.js';
export { scanCodexProject } from './scanner.js';
// src/adapters/gemini/index.ts
export { detectGemini } from './detector.js';
export { scanGeminiProject } from './scanner.js';
```

- [x] **Step 7: Stop `fix` running `doctor` twice**

In `src/core/fixer.ts`, add `reports` to the return type and both returns:

```typescript
export async function fixProject(
  projectPath: string,
  opts: { dryRun?: boolean } = {},
): Promise<{ txId: string | null; fixes: string[]; changes: PlannedChange[]; reports: DoctorAgentReport[] }> {
```

```typescript
  if (planned.length === 0) return { txId: null, fixes: [], changes: [], reports };
```

```typescript
  if (opts.dryRun) {
    return { txId: null, fixes: planned.map(p => p.op.targetPath), changes, reports };
  }
```

```typescript
  return { txId: tx.id, fixes: planned.map(p => p.op.targetPath), changes, reports };
```

and import the type: `import { doctor, DoctorAgentReport } from './doctor.js';`

Then in `src/cli/commands/fix.ts`, destructure `reports` and delete the second doctor call:

```typescript
  const { txId, fixes, changes, reports } = await fixProject(projectPath, { dryRun });

  if (changes.length === 0) {
    // Nothing auto-fixable — surface what doctor still wants a human for.
    const remaining = reports.flatMap(r => r.problems.map(p => `${r.agent} → ${p.file}: ${p.message}`));
```

and remove the now-unused `import { doctor } from '../../core/doctor.js';`.

- [x] **Step 8: Trim the last two bits of dead surface**

`src/cli/banner.ts` line 1 — `export const BANNER` → `const BANNER` (only `printBanner()` in that file reads it).

`src/core/model/types.ts` lines 1-5 — replace the enum with:

```typescript
export type MigrationStatus = 'DIRECT' | 'ADAPTED' | 'UNSUPPORTED';
```

and in `src/core/pipeline.ts` use the literals: `status: MigrationStatus` stays, `MigrationStatus.UNSUPPORTED` → `'UNSUPPORTED'`, `MigrationStatus.DIRECT` → `'DIRECT'`, `MigrationStatus.ADAPTED` → `'ADAPTED'`, and drop `MigrationStatus` from the `./model/types.js` import if it becomes unused there (keep it if the `PlanResult` type still references it).

- [x] **Step 9: Full suite, typecheck, and the behavioral proof**

Run: `npm test && npm run typecheck`
Expected: PASS — 34 files / 206 tests, no tsc errors.

Run: `npm run sweep`
Expected: `Sweep: 132/132 pairs passed, 0 failed` — deletion-only changes must not move a single migration result.

- [x] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor: delete dead adapter surface, dedupe doctor/migrate-all calls, enum to union"
```

---

---
### Task 2: Stop shipping orphaned build artifacts

**Files:**
- Modify: `package.json:14` (the `build` script)

**Interfaces:**
- Consumes: nothing.
- Produces: `npm run build` always yields a `dist/` that mirrors `src/` exactly — `prepublishOnly` and CI inherit this for free.

- [x] **Step 1: Reproduce the defect**

Run: `npm run build && find dist -name '*.js' | sed 's|^dist/||; s|\.js$|.ts|' | while read -r f; do [ -f "src/$f" ] || echo "ORPHAN: dist/${f%.ts}.js"; done`
Expected: `ORPHAN: dist/core/compatibility/engine.js` and `ORPHAN: dist/registry/rules.js` — compiled output of source files that no longer exist.

- [x] **Step 2: Clean `dist/` before every build**

In `package.json`, replace:

```json
    "build": "tsc",
```

with:

```json
    "build": "node -e \"require('node:fs').rmSync('dist',{recursive:true,force:true})\" && tsc",
```

(Node's own `fs.rmSync` keeps this cross-platform and dependency-free; `rimraf` would be a new devDep for one line.)

- [x] **Step 3: Verify the orphan is gone**

Run: `npm run build && find dist -name '*.js' | sed 's|^dist/||; s|\.js$|.ts|' | while read -r f; do [ -f "src/$f" ] || echo "ORPHAN: dist/${f%.ts}.js"; done`
Expected: no `ORPHAN:` lines. Then confirm the mirror is complete:

Run: `find src -name '*.ts' | sed 's|^src/||; s|\.ts$|.js|' | while read -r f; do [ -f "dist/$f" ] || echo "MISSING: src/${f%.js}.ts"; done`
Expected: no `MISSING:` lines.

- [x] **Step 4: Verify the tarball no longer contains them**

Run: `npm pack --dry-run 2>&1 | grep -E 'compatibility|registry/rules'`
Expected: no output (both orphans gone).

- [x] **Step 5: Confirm the compiled CLI still runs**

Run: `bash scripts/smoke.sh`
Expected: `smoke OK`.

- [x] **Step 6: Commit**

```bash
git add package.json
git commit -m "fix: clean dist before build so deleted sources stop shipping to npm"
```

---

### Task 3: Make the release pipeline as strict as CI

**Files:**
- Modify: `.github/workflows/release.yml` (the smoke step)
- Modify: `RELEASING.md` (version-history table; git-identity note)

**Interfaces:**
- Consumes: `scripts/smoke.sh` (already used by `ci.yml`).
- Produces: nothing.

- [x] **Step 1: Gate the release on the same checks as CI**

In `.github/workflows/release.yml`, replace:

```yaml
      - name: Smoke-test the compiled CLI
        run: node dist/cli/main.js doctor .
```

with:

```yaml
      - name: Type check
        run: npm run typecheck

      - name: Smoke-test the compiled CLI
        run: bash scripts/smoke.sh
```

(`scripts/smoke.sh` exercises scan → doctor's exit-1 rejection → fix → doctor-clean on the compiled CLI, which is strictly stronger than `doctor .` alone. RELEASING.md already *claims* the release runs this script — now it does.)

- [x] **Step 2: Finish the stale version-history table**

In `RELEASING.md`, replace the three-row `## Version history quick reference` table with:

```markdown
| Tag | Highlights |
|-----|------------|
| v1.2.0 | 12 agents, 132 bidirectional migrations, merge-don't-clobber |
| v1.3.0 | `doctor`, `fix`, CI on every push/PR, writer-derived plan/diff |
| v1.4.0 | Instruction-file validation + divergence warnings, doctor in CI |
| v1.5.0 | `fix` syncs divergent instruction files; doctor reports every divergence; compiled-CLI smoke in CI |
| v1.6.0 | `fix --dry-run`; honest migrate feedback; registry-validated `plan`/`diff`; `scan` prints agent ids; EPIPE fix |
| v1.7.0 | 132-pair full-migration sweep; OpenCode documented dialect; Copilot instruction-file normalization |
```

- [x] **Step 3: Verify the workflow file is wired correctly**

Run: `node -e "const s=require('node:fs').readFileSync('.github/workflows/release.yml','utf8'); if(!/npm run typecheck/.test(s)||!/bash scripts\/smoke.sh/.test(s)) process.exit(1); console.log('release.yml gates OK')"`
Expected: `release.yml gates OK`.

- [x] **Step 4: Commit**

```bash
git add .github/workflows/release.yml RELEASING.md
git commit -m "ci: gate releases on typecheck + compiled-CLI smoke; refresh RELEASING.md"
```

---
### Task 4: Changelog, full verification, release handoff

**Files:**
- Modify: `CHANGELOG.md` (the `## [1.7.0]` section — safe to edit: 1.7.0 is tagged but **not on npm**, so it is unshipped)

**Interfaces:**
- Consumes: everything from Tasks 1–3.
- Produces: the exact commands a human runs to publish. Nothing is pushed or published by this plan.

- [x] **Step 1: Add the refactor notes to the unshipped 1.7.0 section**

In `CHANGELOG.md`, under `## [1.7.0] - 2026-09-16`, insert a `### Refactor` section before `### Tests & docs`:

```markdown
### Refactor
- Deleted dead surface found by a repo-wide over-engineering audit: the unused `id` field on the simple-agent writer factory (plus its six call sites) and eight adapter re-exports nothing imported
- `fix` no longer runs `doctor` twice — `fixProject` returns the reports it already computed
- `migrate-all` reuses the shared `requireAgent` check, so an unknown source's agent list goes to stderr and can no longer be lost when output is piped
- `MigrationStatus` is a plain union type instead of a runtime enum (one consumer)
- `npm run build` now cleans `dist/` first — deleted sources were leaving orphaned compiled files (`dist/core/compatibility/engine.js`, `dist/registry/rules.js`) in the published tarball
- Release workflow now gates on `npm run typecheck` and the compiled-CLI smoke script, matching CI
```

and change the test-count line to `206 tests (was 195)`.

- [x] **Step 2: Run every gate**

Run: `npm test && npm run typecheck && npx tsx src/cli/main.ts doctor . && npm run build && bash scripts/smoke.sh`
Expected: all pass, `doctor` exits 0, `smoke OK`.

- [x] **Step 3: Run the 132-pair sweep**

Run: `npm run sweep`
Expected: `Sweep: 132/132 pairs passed, 0 failed`.

- [x] **Step 4: Verify the published artifact**

Run: `npm pack --dry-run 2>&1 | tail -12`
Expected: `total files:` below 145, no `compatibility/` or `registry/rules` entries, only `dist/` + `package.json` + README/LICENSE/CHANGELOG.

- [x] **Step 5: Commit**

```bash
git add CHANGELOG.md docs/superpowers/plans/2026-09-18-cleanup-and-release-hardening.md
git commit -m "docs: changelog + plan for the cleanup and release hardening"
```

- [x] **Step 6: Report the release state (do not push, do not publish)**

Report to the maintainer, with the exact commands, that:
- `main` is 4+ commits ahead of `origin/main` and **must be pushed first** (`git push origin main`).
- npm `latest` is `1.6.0` while `package.json` is `1.7.0`, and `refs/tags/v1.7.0` already exists on origin at `a1f2256` — so re-pushing that tag will not re-trigger the Release workflow. Per RELEASING.md's documented recovery:

```bash
git push origin :refs/tags/v1.7.0
git tag -fa v1.7.0 -m "agent-bridge 1.7.0"
git push origin v1.7.0
```

- The publish step needs the `NPM_TOKEN` repo secret; without it the workflow fails at `npm publish` (which is why 1.7.0 never shipped).

---

## Self-Review Notes

1. **Spec coverage:** orphaned dist artifacts (spec 2) → Task 2. Tagged-but-unpublished 1.7.0 (spec 3) → Task 4's unshipped-section edit + handoff. Weaker release gates (spec 4) → Task 3 Step 1. Stale RELEASING.md (spec 5) → Task 3 Step 2. Audit findings (spec 6) → Task 1, all ten steps. The deliberately-skipped structural finding is stated with its reason in the Spec section.
2. **No placeholders:** every step is a literal command or a complete code replacement; the one new test is given in full.
3. **Type consistency:** `fixProject`'s new `reports: DoctorAgentReport[]` is declared in `fixer.ts` and consumed only in `fix.ts` (both updated in Step 7); `MigrationStatus` keeps its name and its three string values, so `plan.ts`/`diff.ts`'s `=== 'UNSUPPORTED'` comparisons keep working unchanged.
4. **Risk:** Tasks 1 and 2 are deletion/equivalence only, proven by 206 tests plus the 132-pair sweep; the single behavior change (`migrate-all` stderr) is test-first in Step 1. Task 4 touches no executable code.
5. **Not done, deliberately:** no `git push`, no `npm publish`, no tag creation — outward-facing and irreversible, so Task 4 hands the commands to a human instead.

