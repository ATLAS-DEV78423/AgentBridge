# Releasing

How to cut a release of `@superdev2347832/agent-bridge`. The happy path is:
update the CHANGELOG → bump the version → tag → push — and the **Release
workflow** (`.github/workflows/release.yml`) publishes to npm automatically.

## One-time setup: the `NPM_TOKEN` secret

The publish step authenticates with a repo secret named `NPM_TOKEN`.

1. Create an **Automation** token at npmjs.com → avatar → *Access Tokens* →
   *Generate New Token* (Automation is the right type: it can publish without
   2FA prompts, which CI cannot answer).
2. Add it to the repo (needs admin):

   ```bash
   gh secret set NPM_TOKEN --repo ATLAS-DEV78423/AgentBridge
   ```

   or on github.com → *Settings* → *Secrets and variables* → *Actions* →
   *New repository secret* → name `NPM_TOKEN`.

Until the secret exists, the Release workflow fails at the publish step;
tests/build/smoke still gate as usual. As a fallback you can always publish
from a logged-in machine: `npm login && npm publish`.

## Cutting a release

1. **Confirm the tree is clean and green** on GitHub CI:

   ```bash
   git status            # must be clean
   npm test && npm run typecheck && npm run build && bash scripts/smoke.sh
   ```

2. **CHANGELOG** — add a `## [X.Y.Z] - YYYY-MM-DD` section at the top
   (Features / Fixes / Refactor / Docs & tooling, ending with the test count).
   Version discipline: new commands or agents → minor (`1.4.0`); fixes only →
   patch. Promote an `[Unreleased]` section if one exists.

3. **Bump the version** (updates `package.json` + `package-lock.json`):

   ```bash
   npm version X.Y.Z --no-git-tag-version
   ```

4. **Commit and tag:**

   ```bash
   git add -A
   git commit -m "chore: release X.Y.Z"
   git tag -a vX.Y.Z -m "agent-bridge X.Y.Z — <one-line summary>"
   ```

   (If git complains about identity, add
   `-c user.name='ATLAS-DEV78423' -c user.email='atlas@agentbridge.dev'`
   to the `tag`/`commit` commands — the repo has no global git identity.
   The durable alternative is a repo-local identity, which touches nothing
   global and makes plain `git commit` work:

   ```bash
   git config --local user.name 'ATLAS-DEV78423'
   git config --local user.email 'atlas@agentbridge.dev'
   ```)

5. **Push and let CI publish:**

   ```bash
   git push origin main vX.Y.Z
   ```

   The Release workflow then runs, in order: `npm ci` → full test suite →
   `npm run build` → compiled-CLI smoke test (`bash scripts/smoke.sh`) →
   `npm publish`. Any gate failing stops the release before publish.
   Watch it: `gh run watch` (or the *Actions* tab).

6. **Verify:** `npm view @superdev2347832/agent-bridge version` should print
   the new version within a minute of the workflow finishing.

## Gotchas (all hit for real)

- **A tag runs the workflow *as defined at the tag's commit*.** If the tag
  pins a commit older than the current `release.yml` (or its triggers), the
  tag push may produce no run — or run an old pipeline. If that happens,
  retest by retagging onto the current release commit:

  ```bash
  git push origin :refs/tags/vX.Y.Z
  git tag -fa vX.Y.Z -m "agent-bridge X.Y.Z" <commit-sha>
  git push origin vX.Y.Z
  ```

- **Publishing supersedes, not backfills.** If older versions were never
  published, publishing the newest one ships the newest content; do not
  expect npm to release the intermediate versions.
- **`npm publish --dry-run` is the local sanity check** — it should print
  `+ @superdev2347832/agent-bridge@X.Y.Z` and only `dist/` + docs in the
  file list (the `files` field enforces that).
- **Fixes-only releases still bump the minor if doctor/fix gained checks**,
  since those change user-visible validation behavior.

## Version history quick reference

| Tag | Highlights |
|-----|------------|
| v1.2.0 | 12 agents, 132 bidirectional migrations, merge-don't-clobber |
| v1.3.0 | `doctor`, `fix`, CI on every push/PR, writer-derived plan/diff |
| v1.4.0 | Instruction-file validation + divergence warnings, doctor in CI |
| v1.5.0 | `fix` syncs divergent instruction files; doctor reports every divergence; compiled-CLI smoke in CI |
| v1.6.0 | `fix --dry-run`; honest migrate feedback; registry-validated `plan`/`diff`; `scan` prints agent ids; EPIPE fix |
| v1.7.0 | 132-pair full-migration sweep; OpenCode documented dialect; Copilot instruction-file normalization |
