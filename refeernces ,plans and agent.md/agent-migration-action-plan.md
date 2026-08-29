# Agent Migration Tool — TDD Action Plan

> **For agentic workers:** Read this plan completely before touching code. Follow the repository's `AGENTS.md` instructions. Use TDD for every non-trivial behavior. Work in an isolated branch/worktree when possible. Do not begin broad implementation until the first architecture checkpoint is passed.

## Goal

Build a local-first, cross-platform migration and compatibility tool that makes moving a developer's coding-agent environment from one AI coding agent to another safe, explainable, reversible, and as automatic as the target agent allows.

The product is **not** another generic skill installer. Existing tools already cover important pieces, including cross-agent skill installation and broader agent-package management. This project should focus on the end-to-end migration problem: discover the source environment, normalize it, analyze source→target compatibility, deterministically translate what can be translated, clearly report what cannot, safely apply the migration, verify it, and support rollback.

## Product thesis

A developer should be able to move from Agent A to Agent B without manually hunting through configuration directories, remembering undocumented paths, rewriting instruction files, recreating MCP configuration, or losing track of unsupported features.

The tool must optimize for:

1. **Truthful portability** — never claim an item migrated when behavior was lost or materially changed.
2. **Safety** — scanning is read-only; applying changes is explicit; credentials are never copied or printed.
3. **Explainability** — every migration result has a reason and status.
4. **Reversibility** — migrations create backups and can be rolled back.
5. **Determinism first** — ordinary conversions should not require an LLM.
6. **LLM assistance only where semantics genuinely require it** — and only behind explicit opt-in and validation.
7. **Extensibility without a framework explosion** — adapters should be small, boring modules with explicit contracts.

The user's project `AGENTS.md` emphasizes the same engineering posture: question whether something needs to be built, reuse existing functionality, avoid unnecessary dependencies and abstractions, understand the real end-to-end flow before coding, prefer deletion and boring solutions, and leave one runnable check for non-trivial logic. These are project constraints, not optional style advice.

## Initial scope

### Initial source/target agents

Start with the smallest useful ecosystem:

- Claude Code
- OpenCode
- Kilo Code

Do not begin by implementing every known agent.

### Initial capability scope

Support, in priority order:

1. Project/global instructions and rules
2. Skills
3. Commands
4. MCP server configuration
5. Agents/subagents
6. Permissions
7. Compatibility analysis and reporting
8. Dry-run/diff
9. Backup and rollback
10. Export/import of a portable bundle

Explicitly defer until the core migration engine is proven:

- GUI
- cloud sync
- hosted accounts
- marketplace
- telemetry
- autonomous online discovery of arbitrary third-party plugins
- automatic migration of secrets
- automatic execution of untrusted migrated scripts
- universal support for dozens of agents
- speculative "perfect semantic equivalence"

## Important researched constraints

The research found materially different configuration models between agents. Claude Code uses project instructions plus `.claude` configuration, skills, MCP configuration, hooks, and other agent-specific state. OpenCode uses `AGENTS.md`, `opencode.jsonc`, agents, permissions, and MCP configuration. Kilo has its own configuration and permissions while also providing compatibility with Claude skills. Gemini and other agents use different configuration mechanisms again.

The ecosystem already has portability projects:

- Vercel Skills provides cross-agent skill installation.
- OpenPackage/opkg provides broader package/config management for rules, commands, agents, skills, and MCPs.
- Therefore this project must not differentiate on "install skills everywhere."
- Its differentiator is safe, end-to-end **migration analysis + semantic compatibility + transactional application + verification + rollback**.

Do not copy third-party implementation code into this repository. Reuse compatible libraries or interoperable formats where licensing and technical fit permit.

---

# 1. Architecture

Use a pipeline with explicit boundaries:

```text
Source filesystem
      |
      v
[Scanner]
      |
      v
[Source model]
      |
      v
[Normalizer]
      |
      v
[Canonical Agent Model]
      |
      +------> [Security/secret detector]
      |
      v
[Capability detector]
      |
      v
[Compatibility engine]
      |
      +------> [LLM-assisted transformer - optional]
      |
      v
[Migration plan / IR]
      |
      v
[Target adapter]
      |
      v
[Filesystem transaction]
      |
      +------> [Backup]
      |
      +------> [Verification]
      |
      v
Target agent environment
```

There are four distinct data concepts:

### A. Observed source state

A lossless-enough representation of what was actually found.

### B. Canonical model

An agent-neutral representation of portable concepts.

### C. Migration plan

A list of intended operations, each with source, destination, transformation method, compatibility status, confidence, warnings, and whether user approval is required.

### D. Target output

Exact target-agent files/configuration generated by an adapter.

Do not collapse these into one giant object.

---

# 2. Universal representation

Use a versioned JSON-based canonical model internally.

Possible top-level shape:

```ts
type AgentBundle = {
  schemaVersion: string;
  metadata: {
    name: string;
    createdAt?: string;
    sourceAgent?: AgentRef;
    sourceRoot?: string;
  };
  instructions: InstructionResource[];
  rules: RuleResource[];
  skills: SkillResource[];
  commands: CommandResource[];
  agents: AgentResource[];
  mcpServers: McpServerResource[];
  permissions: PermissionResource[];
  hooks: HookResource[];
  opaque: OpaqueResource[];
};
```

Every resource must preserve provenance:

```ts
type Provenance = {
  sourceAgent: string;
  sourcePath: string;
  scope: "project" | "user" | "system" | "unknown";
  originalHash: string;
};
```

Every migration result must have one of:

```text
EXACT
DIRECT
ADAPTED
PARTIAL
UNSUPPORTED
SKIPPED
BLOCKED
```

and a machine-readable reason code.

Do not design the canonical model to represent every target-specific field on day one. Preserve unsupported target-specific data under an explicit `opaque` area rather than inventing fake portability.

---

# 3. Compatibility model

Represent compatibility per capability, not as one global percentage.

Example:

```ts
type CompatibilityResult = {
  resourceId: string;
  sourceCapability: string;
  targetCapability?: string;
  status:
    | "exact"
    | "direct"
    | "adapted"
    | "partial"
    | "unsupported"
    | "blocked";
  method: "copy" | "rewrite" | "generate" | "omit";
  confidence: "high" | "medium" | "low";
  reasons: string[];
  warnings: string[];
  requiresApproval: boolean;
};
```

Never produce a score such as "92% compatible" without retaining the underlying per-resource evidence.

A summary score may later be derived from the item-level results, but it must never replace them.

---

# 4. Deterministic vs semantic translation

## Deterministic transformations

Use deterministic code for:

- path changes
- filename changes
- JSON/YAML/JSONC conversion
- known key mappings
- directory layout
- known permission mappings
- MCP shape conversion where semantics are equivalent
- skill relocation where the target supports the same skill format
- copying non-secret resource files

These transformations must have golden tests.

## Semantic/LLM-assisted transformations

Allow optional LLM assistance only for tasks such as:

- converting instruction semantics where target conventions differ materially
- adapting a command to a target agent's command schema
- rewriting an agent/subagent prompt to fit a different lifecycle/model
- adapting a hook to an actual target extension mechanism if an equivalent exists

The LLM must NOT directly write into the user's filesystem.

Instead:

```text
source
 -> candidate transformation
 -> structured result
 -> validation
 -> diff
 -> user approval
 -> transaction
```

The LLM must return structured output with:

- transformed content
- rationale
- assumptions
- confidence
- known losses
- required manual actions

If structured output fails validation, reject it.

LLM-assisted mode should be disabled by default in the first MVP unless a task genuinely needs it.

---

# 5. Safety model

Security is a first-class product feature because agent configurations can contain executable hooks, scripts, MCP commands, environment variables, and instructions that affect an agent.

Rules:

- Scanning is read-only.
- `plan` and `diff` never modify files.
- `migrate/apply` requires an explicit apply action.
- Never copy API keys, OAuth tokens, passwords, cookies, or other secrets.
- Never print secret values.
- Detect common secret patterns before bundle creation and migration.
- Replace secret-bearing values with references such as environment-variable placeholders.
- Back up every file that will be overwritten or deleted.
- Use atomic writes.
- Never "cut" source files; migration is copy/generate only.
- Do not execute scripts from migrated skills during migration.
- Do not install packages or run arbitrary agent code as part of scanning.
- Prefer invoking target-agent validation commands only when explicitly enabled and documented.
- Keep network access out of the core scanner and transaction engine.

---

# 6. CLI contract

Choose one simple executable name. Use `agent-migrate` as the working name unless the repository already establishes another name.

Initial commands:

```bash
agent-migrate scan [path]
agent-migrate doctor [path]
agent-migrate diff <source> <target> [path]
agent-migrate plan <source> <target> [path]
agent-migrate export [path] --output <bundle>
agent-migrate import <bundle> --target <agent> [path]
agent-migrate apply <plan>
agent-migrate rollback <migration-id>
agent-migrate verify [migration-id]
```

Behavioral rules:

- `scan`, `doctor`, `diff`, `plan`, and `export` are read-only.
- `import` generates a target representation but does not modify the project unless an explicit `--apply` is supplied.
- `apply` performs the transaction.
- `rollback` must work without network access.
- All commands must provide useful exit codes.
- Human output is readable by default.
- Add a machine-readable `--json` mode early, because it will be useful for future UIs and automation.

Example:

```bash
agent-migrate plan claude-code opencode .
```

Output:

```text
Claude Code -> OpenCode

Found
  Instructions    3
  Skills          7
  Commands        4
  MCP servers     2
  Agents          2
  Permissions     1
  Hooks           3

Migration plan
  3 instructions     DIRECT
  7 skills           DIRECT
  4 commands         ADAPTED
  2 MCP servers      DIRECT
  1 agent            ADAPTED
  1 permission       DIRECT
  3 hooks            UNSUPPORTED

3 items need manual review.
No files changed.
```

---

# 7. Repository structure

Use a small TypeScript CLI repository.

Recommended:

```text
/
├── src/
│   ├── cli/
│   │   ├── main.ts
│   │   ├── commands/
│   │   └── output/
│   ├── core/
│   │   ├── model/
│   │   ├── scanner/
│   │   ├── normalize/
│   │   ├── compatibility/
│   │   ├── planning/
│   │   ├── transaction/
│   │   ├── secrets/
│   │   └── verification/
│   ├── adapters/
│   │   ├── claude-code/
│   │   ├── opencode/
│   │   └── kilo/
│   └── registry/
│       ├── agents/
│       └── mappings/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── fixtures/
│   └── golden/
├── docs/
│   ├── architecture/
│   ├── agent-support/
│   ├── bundle-format/
│   └── migration-rules/
├── package.json
├── tsconfig.json
├── README.md
└── AGENTS.md
```

Do not create all of these files at the beginning. Create directories only as the first task that needs them.

---

# 8. Tech stack

Preferred first implementation:

- TypeScript
- Node.js LTS
- A minimal CLI argument parser
- Native `fs`, `path`, `crypto`, and `child_process` where sufficient
- A maintained YAML parser
- A JSON Schema validator only when the schema layer is actually introduced
- Vitest or the repository's existing test runner if one exists

Avoid frameworks.

Use Node's filesystem APIs rather than an abstraction layer unless repeated behavior proves the abstraction necessary.

Do not add an HTTP server, database, frontend, ORM, telemetry SDK, plugin marketplace SDK, or LLM framework to the MVP.

The tool should be fully functional offline for scanning, planning, deterministic migration, export/import, backup, rollback, and verification that does not require the target agent.

---

# 9. Development process: TDD

Every non-trivial task follows:

```text
RED
  Write the smallest failing test.
  Run it.
  Confirm it fails for the intended reason.

GREEN
  Implement the minimum code.
  Run the focused test.
  Then run the relevant suite.

REFACTOR
  Simplify only if needed.
  Keep behavior unchanged.
  Re-run tests.

CHECKPOINT
  Review output and repository diff.
  Run the task's integration/self-check.
  Commit.
```

Each task must be independently testable.

Do not write a large pile of code and then add tests.

---

# 10. Checkpoint roadmap

## Checkpoint 0 — Repository and architecture gate

Goal: establish the repository and confirm the build direction before implementing product behavior.

Tests/checks:

```bash
node --version
npm test
npm run lint
npm run typecheck
```

Expected:

- clean baseline
- no unnecessary dependencies
- documented supported Node versions
- project instructions present
- first CLI invocation works

Acceptance:

```bash
agent-migrate --help
```

exits 0 and lists the initial command surface.

STOP if the repository structure becomes more complex than necessary.

---

# Checkpoint 1 — Canonical model

Build only the types/schema needed for the canonical representation.

TDD tests:

- model accepts a minimal bundle
- unknown/unsupported resources can be represented without data loss
- provenance is preserved
- compatibility statuses are constrained to valid values
- schema/version mismatch is rejected

Acceptance:

A test can construct and validate a bundle containing one instruction, one skill, one MCP server, and one opaque resource.

Do not build adapters yet.

---

# Checkpoint 2 — Safe filesystem primitives

Build trusted primitives:

- normalized path handling
- project-root containment checks
- file hashing
- atomic write
- backup
- restore
- temp directory helper for tests

TDD cases:

1. write creates expected file
2. overwrite creates backup
3. interrupted/failed write does not leave a partial target
4. rollback restores original bytes exactly
5. path traversal outside allowed root is rejected
6. symlink escape is rejected or explicitly handled safely
7. permissions are preserved where supported
8. backup metadata is recorded

Acceptance:

A migration transaction can write a file, fail midway in a test, and restore the original state byte-for-byte.

---

# Checkpoint 3 — Agent detection and scanner contracts

Define an adapter interface:

```ts
interface AgentAdapter {
  id: string;
  detect(input: DetectionContext): Promise<DetectionResult>;
  scanProject(input: ScanContext): Promise<ObservedAgentState>;
  scanUser?(input: ScanContext): Promise<ObservedAgentState>;
}
```

Do not make the adapter responsible for migration.

TDD:

- empty directory finds no agent
- fixture with Claude files detects Claude
- fixture with OpenCode config detects OpenCode
- fixture with Kilo files detects Kilo
- multiple agents are reported rather than arbitrarily selecting one
- missing optional files do not fail the scan
- unreadable files generate structured warnings

Acceptance:

```bash
agent-migrate scan tests/fixtures/claude-basic
```

returns a useful inventory.

---

# Checkpoint 4 — Claude scanner

Implement Claude-only discovery using fixtures.

Cover:

- project instructions
- `.claude` configuration
- skills
- commands
- agents
- MCP configuration
- settings/permission information where supportable
- hooks as observed resources
- source/global vs project scope

Tests must use synthetic fixtures, not the developer's actual home directory.

Acceptance:

The scanner returns a deterministic structured state from the same fixture.

Important:

Never read a real user's credential store in tests.

---

# Checkpoint 5 — OpenCode scanner

Cover:

- `AGENTS.md`
- `opencode.json/jsonc` configuration
- agents
- permissions
- MCP
- supported command/workflow representations

Add tests for JSONC parsing and unsupported constructs.

Acceptance:

A fixture with the major supported concepts produces normalized observations without losing unknown fields.

---

# Checkpoint 6 — Kilo scanner

Cover:

- Kilo project configuration
- instruction/agent files
- permissions
- skills
- MCP
- target-specific metadata

Include a regression test for Claude skill compatibility because the research indicates Kilo can consume Claude skills directly.

Acceptance:

A Claude skill fixture can be identified as directly portable to Kilo without needless rewriting.

---

# Checkpoint 7 — Normalization

Convert scanner output into canonical resources.

Requirements:

- preserve source path and scope
- preserve hashes
- preserve raw source when safe/necessary for round-trip
- normalize frontmatter
- distinguish resource content from resource metadata
- represent unsupported items rather than silently dropping them

TDD tests:

- same semantic fixture from two syntaxes produces equivalent canonical resources
- hashes are stable
- line endings do not unexpectedly alter semantic content
- unknown fields survive normalization

Acceptance:

Claude, OpenCode, and Kilo fixtures can all be converted to the canonical model.

---

# Checkpoint 8 — Compatibility engine

Implement rule evaluation.

Start with explicit rules, not an LLM.

Example mapping concepts:

```text
Claude skill -> Kilo skill       DIRECT
Claude skill -> OpenCode skill  ADAPTED/PORTABLE based on target capability
Claude MCP   -> OpenCode MCP    DIRECT/ADAPTED
Claude hook  -> OpenCode hook   UNSUPPORTED unless verified equivalent
```

Do not assert equivalence merely because filenames look similar.

Each rule must have:

- source capability
- target capability
- preconditions
- transformation
- result status
- warnings
- confidence
- test fixture

TDD:

- direct mapping returns DIRECT
- missing target capability returns UNSUPPORTED
- conditional mapping returns PARTIAL/ADAPTED
- rule order is deterministic
- one unsupported resource does not hide other successful resources

Acceptance:

`diff` can explain every resource rather than only giving a global score.

---

# Checkpoint 9 — Migration planner

Build an immutable migration plan.

Suggested shape:

```ts
type MigrationPlan = {
  id: string;
  source: AgentRef;
  target: AgentRef;
  workspaceRoot: string;
  operations: MigrationOperation[];
  warnings: Diagnostic[];
  summary: MigrationSummary;
};
```

Operations should include:

```text
create
update
copy
transform
skip
manual-review
```

Each operation must specify:

- source resource
- destination path
- expected source hash
- transformation kind
- generated content or generator reference
- compatibility result
- whether approval is needed

TDD:

- plan generation is deterministic
- identical input produces identical plan content except explicit timestamps/IDs
- plan does not modify filesystem
- unsupported items appear as diagnostics
- conflicting destination files are detected

Acceptance:

`agent-migrate plan ...` is a complete preflight report.

---

# Checkpoint 10 — Diff renderer

Build human and JSON output.

Human output must show:

- what was found
- what will be created/changed/skipped
- compatibility state
- warnings
- destination paths
- secret redactions
- count summary
- "No files changed"

TDD:

Snapshot or golden tests for representative plans.

Acceptance:

A user can understand the entire migration without opening generated files.

---

# Checkpoint 11 — Export/import bundle

Implement a versioned portable bundle.

Bundle requirements:

- schema version
- metadata
- resources
- provenance
- compatibility metadata
- checksums
- no raw secret values
- deterministic serialization as much as practical

TDD:

- export fixture
- validate bundle
- import bundle
- invalid bundle rejected
- corrupted checksum rejected
- secret-bearing config exported with placeholders/redactions
- round-trip canonical model preserved

Acceptance:

```bash
agent-migrate export tests/fixtures/claude-basic --output sample.abundle.json
agent-migrate import sample.abundle.json --target opencode
```

produces a migration plan without modifying the source.

---

# Checkpoint 12 — Transactional apply

Implement explicit apply.

Rules:

1. Re-read the source/plan preconditions before applying.
2. Refuse to apply if source hashes changed unless explicitly overridden.
3. Create backup.
4. Write all changes atomically.
5. On failure, restore prior state.
6. Record migration ID and backup location.
7. Do not delete source resources as part of migration.
8. Never copy secrets.
9. Return non-zero on incomplete transactions.

TDD fault injection:

- failure on operation 1
- failure in the middle
- target already changed
- destination conflict
- backup failure
- disk write failure simulation
- rollback after successful apply

Acceptance:

A failed migration leaves the target in its original state.

---

# Checkpoint 13 — Rollback

Implement:

```bash
agent-migrate rollback <migration-id>
```

TDD:

- successful migration rolls back exactly
- rollback is idempotent or clearly rejects second rollback
- missing backup is detected
- unrelated user changes after migration are not silently destroyed

Important design choice:

If a user edits a migrated file after apply, rollback must detect that the file no longer matches the post-migration hash and require an explicit force/merge policy instead of overwriting blindly.

Acceptance:

Rollback is safe enough to use on a real project.

---

# Checkpoint 14 — Verification

Build offline verification first.

Verification checks:

- generated files exist
- generated JSON/JSONC/YAML parses
- bundle hashes match
- planned files match applied files
- expected source files were not modified
- no prohibited secret values appeared in output
- migration metadata is internally consistent

Optional target-agent verification should be adapter-specific and opt-in.

TDD:

- valid migration verifies successfully
- malformed generated config fails verification
- missing file fails verification
- changed file fails hash verification

---

# Checkpoint 15 — Security/secret scanner

Implement conservative detection.

At minimum inspect:

- environment variable assignments with obvious secret names
- API key/token/password patterns
- Authorization headers
- JSON fields such as token/key/secret/password
- known credential file names

Do not attempt to "prove" a value is safe.

Prefer false positives over secret leakage in exported bundles.

Tests must include fake secrets such as:

```text
sk-example-not-real
ghp_example_not_real
PASSWORD=example
Authorization: Bearer example
```

The test data must clearly be dummy values.

Acceptance:

Secrets are redacted or replaced with references and are never printed in normal or JSON output.

---

# Checkpoint 16 — Doctor

`doctor` should inspect the environment without changing anything.

Report:

- detected agents
- versions when available
- supported adapter versions
- readable/unreadable config
- suspicious secret locations
- unsupported constructs
- recommended next command

TDD:

- no-agent environment
- one-agent environment
- conflicting/multiple agents
- malformed config
- old/unknown agent version

Acceptance:

Doctor provides actionable diagnostics with stable exit codes.

---

# Checkpoint 17 — Golden migration matrix

Build fixtures for representative migrations:

```text
Claude -> OpenCode
Claude -> Kilo
OpenCode -> Claude
OpenCode -> Kilo
Kilo -> Claude
Kilo -> OpenCode
```

Do not claim every capability is supported in every direction.

Each fixture should intentionally include:

- portable instruction
- portable skill
- command
- MCP server
- permission
- agent/subagent
- unsupported hook or target-specific feature
- fake secret

For each migration, assert:

- expected status per resource
- exact generated files
- warnings
- secret handling
- rollback behavior

This is the project's most important regression suite.

---

# Checkpoint 18 — CLI end-to-end suite

Execute the real compiled CLI against temporary directories.

Tests should cover:

```bash
scan
doctor
plan
diff
export
import
apply
verify
rollback
```

Do not mock the entire application. Use real temporary files and adapters.

Acceptance:

A clean test fixture can complete:

```text
scan -> plan -> diff -> export -> import -> apply -> verify -> rollback
```

without manual intervention.

---

# Checkpoint 19 — Documentation and agent support matrix

Document exactly what is supported.

For each capability/agent pair:

```text
Supported
Direct
Adapted
Partial
Unsupported
```

Do not use vague claims.

Document known semantic losses.

Create:

```text
docs/agent-support/claude-code.md
docs/agent-support/opencode.md
docs/agent-support/kilo.md
docs/bundle-format.md
docs/security.md
docs/testing.md
```

Only create these when their corresponding implementations are stable.

---

# Checkpoint 20 — Release gate

Before alpha:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Then run the complete end-to-end migration matrix.

Release acceptance:

- no known credential leak
- no default destructive operations
- rollback tested
- unsupported features are reported
- CLI has stable exit behavior
- README can take a new user from zero to first migration
- all adapter claims are covered by fixtures/tests

---

# 11. Definition of done

A feature is done only when:

1. A failing test was written first for non-trivial behavior.
2. The smallest implementation makes it pass.
3. Relevant regression tests pass.
4. The behavior is documented when user-visible.
5. Diagnostics are actionable.
6. Failure cases are tested.
7. No secrets are exposed.
8. The code uses existing helpers before introducing new abstractions.
9. A runnable self-check exists for significant logic.
10. The final diff is smaller than or equal to what is justified by the requirement.

---

# 12. What not to build in the first version

Do NOT build:

- GUI
- daemon/service
- cloud account
- login
- remote migration service
- hosted bundle registry
- marketplace
- AI chat UI
- automatic online package installation
- plugin execution sandbox
- arbitrary code execution during migration
- automatic credential transfer
- support for every coding agent
- automatic browser/IDE extension migration
- speculative memory/session migration
- opaque "AI decides everything" behavior

The MVP succeeds if a real developer can safely migrate a meaningful Claude/OpenCode/Kilo configuration with a clear report and rollback.

---

# 13. Future architecture, only after MVP

Potential later additions:

### Agent registry

A signed/ versioned registry describing:

- agent IDs
- supported versions
- config locations
- capabilities
- schema versions
- mappings

### Third-party adapters

Move agent adapters behind a stable interface only after two or three adapters demonstrate repeated structure.

### LLM transformation service

Optional local/provider abstraction:

```text
Deterministic transformer
        |
        +-- insufficient?
                |
                v
        Optional LLM transformer
                |
                v
          structured result
                |
                v
            validator
```

### Interactive migration

Allow users to resolve conflicts:

```text
Hook X has no target equivalent.

[Skip]
[Convert manually]
[Generate candidate]
```

### TUI/GUI

Build only when CLI workflows are proven and the UX problem is demonstrated.

---

# 14. Coding-agent operating instructions

The coding agent must internalize the following.

## First understand, then code

Before modifying anything:

- inspect the repository
- read `AGENTS.md`
- identify existing utilities
- inspect package/dependency choices
- trace the relevant flow
- inspect tests that cover the behavior
- confirm whether the requested functionality already exists

Do not jump directly into implementation.

## Apply the repository's efficiency ladder

Use this decision order:

```text
Does this need to exist?
    ↓
Does it already exist in this repository?
    ↓
Can the standard library do it?
    ↓
Can the platform do it?
    ↓
Can an installed dependency do it?
    ↓
Can the implementation be made smaller?
    ↓
Only then add code.
```

This mirrors the project's `AGENTS.md`, which explicitly prioritizes YAGNI, reuse, standard-library/platform capabilities, minimal dependencies, and small diffs.

## Do not over-abstract

Do not create:

- generic factory systems before repetition exists
- event buses
- dependency injection frameworks
- plugin SDKs
- service locators
- repository layers over local files
- a giant AST framework

Prefer a simple function or object until repeated requirements demonstrate that a boundary is justified.

## Root-cause fixes

When a test fails:

1. identify the actual cause
2. find callers
3. fix the shared behavior
4. add the regression test
5. rerun sibling cases

Do not patch only the visible symptom.

## Security is not optional

Never:

- log secrets
- copy credentials automatically
- execute untrusted source code during migration
- modify source files destructively
- silently discard unsupported features
- claim semantic equivalence without evidence

## TDD is mandatory for non-trivial logic

For every non-trivial change:

```text
test fails
→ minimal implementation
→ focused test passes
→ broader tests pass
→ refactor if necessary
→ checkpoint
```

Do not write tests after the implementation unless the repository's existing test architecture makes a specific exception unavoidable.

## Checkpoint discipline

At every checkpoint:

```text
git diff
git status
test suite
typecheck
lint
manual CLI smoke test where relevant
```

Commit small, coherent changes.

A checkpoint is complete only when the acceptance criteria are actually demonstrated.

## Do not guess agent behavior

The target agent's current documentation is the authority for its format.

If the project does not yet have enough evidence to claim a mapping, represent it as unsupported/unknown and add a follow-up research task.

Never infer that two concepts are equivalent just because their names are similar.

## Preserve provenance

Every generated resource must be traceable back to:

- source agent
- source path
- source scope
- source hash
- transformation rule/version

This is essential for trustworthy diffs and rollback.

## Prefer deterministic behavior

The same source fixture + same target adapter + same rule version should produce the same migration plan.

Avoid hidden randomness.

## Make failure explicit

A migration that partially works is still a partially successful migration.

Report:

```text
what worked
what changed
what did not change
what could not be translated
what needs human review
```

Do not hide failures to make the product appear successful.

---

# 15. Suggested implementation order

Use this exact dependency order:

```text
0. Repository baseline
        ↓
1. Canonical model
        ↓
2. Safe filesystem primitives
        ↓
3. Adapter/scanner contract
        ↓
4. Claude scanner
        ↓
5. OpenCode scanner
        ↓
6. Kilo scanner
        ↓
7. Normalization
        ↓
8. Compatibility engine
        ↓
9. Migration plan
        ↓
10. Diff/reporting
        ↓
11. Bundle export/import
        ↓
12. Transactional apply
        ↓
13. Rollback
        ↓
14. Verification
        ↓
15. Secret scanning
        ↓
16. Doctor
        ↓
17. Golden migration matrix
        ↓
18. CLI E2E
        ↓
19. Documentation
        ↓
20. Alpha release gate
```

Do not start semantic LLM conversion before deterministic conversion and transaction safety are working.

---

# 16. First tasks the coding agent should execute

### Task 1 — Repository reconnaissance

No product code.

Read:

- `AGENTS.md`
- `package.json`
- existing source
- existing tests
- configuration
- CI

Produce an implementation note describing:

- existing architecture
- reusable utilities
- current test command
- proposed minimal additions
- any blocker

Checkpoint: no code changes except required project metadata.

### Task 2 — Minimal CLI shell

TDD:

- failing `--help` test
- minimal CLI implementation
- focused test
- smoke test

Checkpoint:

```bash
agent-migrate --help
```

### Task 3 — Canonical model

TDD resource validation.

Checkpoint: canonical fixture validates.

### Task 4 — Filesystem transaction primitives

TDD write/backup/rollback.

Checkpoint: simulated failed migration leaves original state intact.

### Task 5 — Claude scan fixture

TDD scanner behavior.

Checkpoint: `scan` returns deterministic inventory.

Only after these first five tasks should the coding agent expand the adapter matrix.

---

# 17. Research revalidation requirement

The research behind this plan is a starting point, not a permanent specification.

Before implementing or updating an agent adapter, verify the target agent's current official documentation and, where useful, its current source repository. Agent configuration systems can change quickly.

The implementation must record:

- documentation URL/reference
- date verified
- feature/version tested
- known differences

If current documentation conflicts with an earlier research statement, the current authoritative documentation wins and the support matrix must be updated.

---

# 18. Final product bar

The finished tool should make this possible:

```bash
$ agent-migrate doctor

Detected:
  Claude Code
  OpenCode
  Kilo

$ agent-migrate plan claude-code opencode .

Source:
  Claude Code

Target:
  OpenCode

14 resources found

✓ 8 direct
≈ 3 adapted
⚠ 2 partial
✕ 1 unsupported

No credentials will be copied.

$ agent-migrate diff claude-code opencode .

[full human-readable migration diff]

$ agent-migrate apply migration-abc123

Backup created.
12 operations applied.
2 operations skipped by policy.
1 item requires manual review.

Migration complete.

$ agent-migrate verify migration-abc123

✓ Generated configs parse
✓ Expected files present
✓ Source unchanged
✓ No secrets detected
✓ Transaction metadata valid

$ agent-migrate rollback migration-abc123

✓ Target restored
✓ Source unchanged
```

That is the minimum product experience that proves the thesis.

The project should earn complexity by demonstrating repeated migration problems. Do not build the imagined end-state before the simplest trustworthy migration loop works.
