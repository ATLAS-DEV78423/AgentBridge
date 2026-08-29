# Agent Migration — Full User-Ready Product Roadmap

> **Implementation owner:** An AI coding agent. The human role is product direction, review, and approval of checkpoints; the coding agent performs research, planning, implementation, testing, documentation, and refactoring.
>
> **Primary engineering rule:** Do not begin by building the entire vision. Prove the smallest useful migration loop, then expand only when tests, real compatibility gaps, and user workflows justify each new capability.

## 1. Product Definition

### One-sentence product

A local-first developer tool that safely moves a user's AI coding-agent environment from one agent to another by discovering configuration, normalizing it, analyzing compatibility, translating what can be translated, previewing the result, applying it transactionally, verifying it, and allowing rollback.

### The problem

Switching coding agents is currently a configuration archaeology problem. A developer may have project instructions, global instructions, skills, commands, agents/subagents, MCP servers, permissions, hooks, scripts, and agent-specific settings spread across different locations and formats. Some concepts map directly between agents; others require adaptation; some have no equivalent.

The product must answer three questions before changing anything:

1. **What do I currently have?**
2. **What can the target agent reproduce, and what will be lost or changed?**
3. **Can I migrate safely and reverse the change?**

### Product thesis

Do not compete as another generic skills installer. Cross-agent skill installation and broader agent-package management already exist. The product should own the higher-level migration workflow:

`discover → understand → compare → translate → preview → approve → apply → verify → rollback`

### Initial agents

Start with:

- Claude Code
- OpenCode
- Kilo Code

Expand only after the adapter contract is stable and the first migration paths are trustworthy.

### Initial capabilities

Priority order:

1. Project/global instructions and rules
2. Skills
3. Commands
4. MCP servers
5. Agents/subagents
6. Permissions
7. Hooks where safe and meaningful
8. Compatibility analysis
9. Human-readable and JSON reports
10. Dry-run and diff
11. Transactional apply
12. Backups and rollback
13. Export/import of portable bundles
14. Verification

### Explicit non-goals for the initial product

Do not build these before the core migration loop is reliable:

- GUI/desktop application
- cloud accounts
- hosted sync
- marketplace
- telemetry
- social features
- automatic arbitrary third-party plugin discovery
- automatic secret migration
- execution of migrated scripts during migration
- universal support for every coding agent
- promise of perfect semantic equivalence
- autonomous web research during every migration
- an always-on daemon

---

# 2. User Personas and Main Workflows

## Persona A — Agent switcher

A developer wants to try a new coding agent without rebuilding years of configuration.

Typical flow:

```text
agent-migrate scan
agent-migrate doctor --target opencode
agent-migrate plan claude-code opencode
agent-migrate diff claude-code opencode
agent-migrate apply <plan-id>
agent-migrate verify <migration-id>
```

## Persona B — Multi-agent developer

A developer intentionally uses several agents and wants a portable baseline.

Typical flow:

```text
agent-migrate export ./my-agent.bundle
agent-migrate import ./my-agent.bundle --target opencode
agent-migrate import ./my-agent.bundle --target kilo
```

## Persona C — Team/automation user

A developer wants machine-readable migration analysis in CI or setup scripts.

Typical flow:

```text
agent-migrate doctor --target opencode --json
agent-migrate plan claude-code opencode --json > migration-plan.json
```

## Persona D — Recovery user

A migration produced a bad result and must be safely undone.

```text
agent-migrate rollback <migration-id>
agent-migrate verify <migration-id>
```

---

# 3. User Experience Principles

The product should feel like a dependable systems tool, not an autonomous black box.

### Principle 1 — Read first, write later

Scanning and planning never modify user files.

### Principle 2 — Show the exact consequences

Every item gets an explicit status:

- `EXACT` — equivalent representation with no known semantic change
- `DIRECT` — direct target-supported representation
- `ADAPTED` — transformed representation with known semantic difference or target-specific adaptation
- `PARTIAL` — some behavior/resources can move but some cannot
- `UNSUPPORTED` — no safe target representation exists
- `SKIPPED` — user chose not to migrate it
- `BLOCKED` — migration cannot proceed safely without action

### Principle 3 — Never hide loss

Do not turn an unsupported hook into a green check merely because the file was copied.

### Principle 4 — Preview is first-class

A user should be able to inspect the proposed file changes before application.

### Principle 5 — Safety beats convenience

Secrets, arbitrary scripts, destructive changes, and ambiguous transformations should require stronger handling rather than being silently automated.

### Principle 6 — Offline by default

The core scanner, canonical model, deterministic translators, planning engine, filesystem transaction engine, bundle export/import, and rollback must work without network access.

---

# 4. Target Architecture

```text
                ┌─────────────────────┐
                │       CLI/UI        │
                └──────────┬──────────┘
                           │
                    command request
                           │
                           v
                ┌─────────────────────┐
                │ Discovery / Scanner │
                └──────────┬──────────┘
                           │
                           v
                ┌─────────────────────┐
                │   Observed State    │
                └──────────┬──────────┘
                           │
                           v
                ┌─────────────────────┐
                │     Normalizer      │
                └──────────┬──────────┘
                           │
                           v
                ┌─────────────────────┐
                │ Canonical Agent IR  │
                └──────────┬──────────┘
                           │
              ┌────────────┴────────────┐
              v                         v
    ┌──────────────────┐      ┌──────────────────┐
    │ Secret Detector  │      │ Capability/Rules │
    └────────┬─────────┘      └────────┬─────────┘
             └────────────┬────────────┘
                          v
                ┌─────────────────────┐
                │ Compatibility Engine│
                └──────────┬──────────┘
                           │
                           v
                ┌─────────────────────┐
                │ Migration Planner   │
                └──────────┬──────────┘
                           │
              ┌────────────┴────────────┐
              v                         v
    ┌──────────────────┐      ┌──────────────────┐
    │ Deterministic    │      │ Optional semantic│
    │ Translators      │      │ transformer      │
    └────────┬─────────┘      └────────┬─────────┘
             └────────────┬────────────┘
                          v
                ┌─────────────────────┐
                │ Target Adapter      │
                └──────────┬──────────┘
                           v
                ┌─────────────────────┐
                │ Migration Plan/IR   │
                └──────────┬──────────┘
                           v
                ┌─────────────────────┐
                │ Transaction Engine  │
                │ backup/atomic/undo  │
                └──────────┬──────────┘
                           v
                ┌─────────────────────┐
                │ Verification Engine │
                └─────────────────────┘
```

Separate these four concepts:

1. **Observed state:** exactly what was found.
2. **Canonical model:** normalized portable concepts.
3. **Migration plan:** intended operations and evidence.
4. **Target output:** concrete target-agent files/configuration.

Do not collapse these into one giant object.

---

# 5. Universal Model

Use a versioned JSON-based internal representation.

Illustrative TypeScript shape:

```ts
interface AgentBundle {
  schemaVersion: string;
  metadata: BundleMetadata;
  instructions: InstructionResource[];
  rules: RuleResource[];
  skills: SkillResource[];
  commands: CommandResource[];
  agents: AgentResource[];
  mcpServers: McpServerResource[];
  permissions: PermissionResource[];
  hooks: HookResource[];
  opaque: OpaqueResource[];
}
```

Every resource retains provenance:

```ts
interface Provenance {
  sourceAgent: string;
  sourcePath: string;
  scope: "project" | "user" | "system" | "unknown";
  originalHash: string;
}
```

Unknown target-specific data must not be fabricated into a fake universal field. Preserve it as explicitly opaque/source-specific data when safe.

---

# 6. Compatibility Engine

Compatibility must be calculated per resource, not only as one percentage.

```ts
interface CompatibilityResult {
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
}
```

The UI may summarize the results, but the evidence must always remain inspectable.

---

# 7. Translation Policy

## Deterministic first

Use deterministic code for known-safe transformations:

- path changes
- filename changes
- JSON ↔ JSONC where syntax permits
- YAML parsing/serialization
- known configuration key mappings
- directory layout
- known permission mappings
- known skill locations/formats
- known MCP shape conversions

Every deterministic transform gets fixture/golden tests.

## Semantic transformation second

LLM-assisted translation may be introduced only where meaning must be adapted, such as:

- agent/subagent prompt adaptation
- non-identical command formats
- hook-to-target lifecycle adaptation
- instruction conversion where target behavior genuinely differs

The LLM must never directly write to the user's filesystem.

Required flow:

```text
source data
  -> structured transform request
  -> model output
  -> schema validation
  -> semantic/safety checks
  -> generated diff
  -> user approval
  -> transaction
```

The model response must include:

- transformed content
- rationale
- assumptions
- confidence
- known losses
- manual actions

If structured output fails validation, reject it.

---

# 8. Security and Data Safety

## Mandatory rules

- Scan is read-only.
- Plan/diff/export are read-only with respect to the source environment.
- Apply is explicit.
- Never print secret values.
- Detect common secrets before bundle export.
- Replace secret values with references/placeholders where possible.
- Never migrate credentials automatically.
- Never execute migrated scripts during migration.
- Never install packages merely because a migrated resource references them.
- Use path containment checks.
- Handle symlinks safely.
- Use atomic writes.
- Back up overwritten/deleted files.
- Make rollback offline-capable.
- Store only the metadata needed to reverse a migration.
- Do not upload user configuration to a remote service unless a future feature explicitly and visibly enables it.

---

# 9. CLI Product Surface

Initial command surface:

```bash
agent-migrate scan [path]
agent-migrate doctor [path] --target <agent>
agent-migrate diff <source> <target> [path]
agent-migrate plan <source> <target> [path]
agent-migrate export [path] --output <bundle>
agent-migrate import <bundle> --target <agent> [path]
agent-migrate apply <plan-id>
agent-migrate rollback <migration-id>
agent-migrate verify [migration-id]
```

Recommended later additions:

```bash
agent-migrate agents
agent-migrate capabilities <agent>
agent-migrate inspect <resource>
agent-migrate history
agent-migrate validate <bundle>
```

All commands should eventually support:

```bash
--json
--quiet
--verbose
```

Do not add flags merely because they are easy. Add them when a real workflow needs them.

---

# 10. Roadmap Overview

```text
Phase 0  Foundation + research lock
Phase 1  Canonical model + safe filesystem
Phase 2  Agent discovery + Claude scanner
Phase 3  OpenCode scanner + Kilo scanner
Phase 4  Normalization + compatibility engine
Phase 5  First real migration path
Phase 6  Transaction safety + rollback
Phase 7  CLI polish + JSON automation
Phase 8  Bundles + import/export
Phase 9  Verification + real-world hardening
Phase 10 Advanced adaptations + optional LLM
Phase 11 User-ready release
Phase 12 Expansion to more agents
```

Every phase ends in a checkpoint. The coding agent does not start the next phase until the previous phase is green and its acceptance criteria are met.

---

# Phase 0 — Foundation and Research Lock

## Goal

Make the repository safe to build in and establish a current, evidence-based specification for the first three agents.

## Features

- repository bootstrap
- coding instructions loaded
- agent capability matrix
- fixture strategy
- test harness
- documentation skeleton
- versioning policy

## Agent execution instructions

1. Read the entire repository and `AGENTS.md` before modifying code.
2. Inspect existing package managers, scripts, dependencies, and test conventions.
3. Do not create a new abstraction when an existing repository pattern already solves the job.
4. Verify current official documentation for Claude Code, OpenCode, and Kilo before encoding paths or semantics.
5. Record uncertain behavior as an explicit compatibility limitation instead of guessing.
6. Write the plan before implementation if the repository has no existing plan.

The project `AGENTS.md` explicitly prioritizes YAGNI, reuse, minimal dependencies, understanding the real flow, root-cause fixes, and small focused changes. Treat those as implementation constraints. fileciteturn0file0L5-L27

## TDD checkpoints

### Test first

- CLI starts.
- Help output exists.
- Test runner exists.
- Typecheck exists.

### Green

- `agent-migrate --help` exits 0.
- `npm test` passes.
- `npm run typecheck` passes.

### Acceptance gate

No product migration behavior yet. Repository is stable and reproducible.

---

# Phase 1 — Canonical Model and Safe Filesystem Core

## Goal

Build the smallest reusable foundation on which every future adapter depends.

## Features

- versioned canonical model
- provenance
- resource IDs
- migration statuses
- hashes
- path safety
- atomic writes
- backup metadata
- restore primitives

## TDD sequence

For every non-trivial function:

1. Write failing test.
2. Run focused test and confirm failure reason.
3. Implement minimum behavior.
4. Run focused test.
5. Run relevant suite.
6. Refactor only if needed.
7. Commit.

## Required safety tests

- path traversal rejected
- absolute path outside workspace rejected where not explicitly allowed
- symlink escape rejected/handled safely
- atomic write leaves no partial file after simulated failure
- backup preserves exact original bytes
- rollback restores exact original bytes
- hashes change only when content changes
- duplicate resources are detected consistently

## Checkpoint

A synthetic migration transaction can be applied to a temporary fixture, deliberately fail, and restore the fixture byte-for-byte.

---

# Phase 2 — Agent Detection and Claude Scanner

## Goal

Build the first complete read-only discovery path.

## Features

- agent detection
- project/user scope discovery
- Claude instruction discovery
- skill discovery
- command discovery
- agent/subagent discovery where representable
- MCP discovery
- permission/settings discovery
- hook discovery as observed resources
- warnings for missing/unreadable optional files

## Agent instructions

Use synthetic fixtures. Never test against the developer's real home directory in automated tests.

The scanner should:

- read only
- preserve source paths
- preserve scope
- hash source content
- record parsing errors without crashing the entire scan
- never execute discovered scripts

## Tests

- empty fixture
- minimal Claude fixture
- full Claude fixture
- malformed config
- unreadable optional file
- multiple scopes
- symlink case
- secret-bearing configuration

## Checkpoint

```bash
agent-migrate scan tests/fixtures/claude-basic
```

returns a stable inventory that can be asserted in tests.

---

# Phase 3 — OpenCode and Kilo Scanners

## Goal

Discover enough real target/source state to perform useful comparisons.

## Features

Implement the same observed-state contract for:

- OpenCode
- Kilo Code

Do not force each agent into identical file semantics. The adapter should expose what it actually supports.

## Tests

- fixture-driven detection for each agent
- complete fixture inventory
- malformed configuration
- missing optional resources
- project/global scope separation
- unsupported source constructs preserved rather than silently discarded

## Checkpoint

Running scans on all three synthetic fixture trees produces normalized inventories with correct provenance and no filesystem mutation.

---

# Phase 4 — Normalization and Compatibility Engine

## Goal

Turn agent-specific observations into a common model and produce explainable compatibility results.

## Features

- normalizers
- capability registry
- capability mapping
- status classification
- confidence levels
- reasons/warnings
- per-resource compatibility report
- target capability lookup

## Tests

Test each mapping class:

- exact/direct
- adapted
- partial
- unsupported
- blocked

Add golden fixtures for known transformations.

Test that:

- every source resource gets a result
- unsupported resources never disappear silently
- reasons identify why a mapping was selected
- confidence cannot be omitted
- the same input yields the same deterministic result

## Checkpoint

```bash
agent-migrate doctor --target opencode
```

produces a per-resource compatibility report without making changes.

---

# Phase 5 — First Real Migration Path

## Goal

Make one migration genuinely useful end-to-end.

Recommended first path:

**Claude Code → OpenCode**

Start with the safest/highest-value resources:

1. instructions/rules
2. skills
3. commands where deterministic mapping exists
4. MCP where deterministic mapping exists

Defer complicated hooks and semantic agents until the deterministic path is reliable.

## Features

- migration planner
- deterministic target writers
- diff output
- explicit unsupported items
- generated target files in a staging directory

## Tests

### Golden migration tests

Given a known Claude fixture, assert the exact OpenCode target output.

### Idempotency

Running planning twice on the same input yields equivalent plans.

### No-source-mutation

Planning and staged import do not alter source files.

### Loss reporting

An unsupported source resource remains visible in the plan.

## Checkpoint

```bash
agent-migrate plan claude-code opencode tests/fixtures/claude-basic
agent-migrate diff claude-code opencode tests/fixtures/claude-basic
```

produce stable output and no writes.

---

# Phase 6 — Transaction Engine, Backup, Apply, Rollback

## Goal

Convert the planner into a safe production-grade migration mechanism.

## Features

- transaction IDs
- operation manifests
- backups
- atomic writes
- create/modify/delete operations
- conflict detection
- rollback
- migration history metadata
- crash-safe recovery state where practical

## Required operation model

Each operation should record:

```text
operation id
resource id
source path
target path
operation type
before hash
expected after hash
backup location
reason
status
```

## TDD cases

1. create new file
2. overwrite existing file
3. delete generated target file only when explicitly planned
4. target conflict with changed file
5. user chooses conflict preservation
6. simulated failure halfway through transaction
7. rollback after successful migration
8. rollback after partial migration
9. repeated apply is idempotent or safely rejected
10. rollback after source files changed after migration does not overwrite unrelated user changes

## Checkpoint

A migration can be safely applied, verified, and reverted with zero mutation outside the planned target set.

---

# Phase 7 — CLI Polish and Automation Interface

## Goal

Make the product pleasant for a developer using it from a terminal.

## Features

- concise human-readable output
- structured JSON output
- useful exit codes
- `doctor`
- `diff`
- `plan`
- clear confirmation flow
- progress/status where useful
- actionable errors

## UX rules

Bad:

```text
Error.
```

Good:

```text
Migration blocked: target file changed after planning.
Target: .opencode/config.json
Expected hash: ...
Actual hash: ...
Action: rerun `agent-migrate plan ...` or explicitly allow conflict resolution.
```

## Tests

- snapshot/golden tests for important CLI output
- JSON schema tests
- exit-code tests
- invalid argument tests
- missing-path tests
- terminal-independent JSON tests

## Checkpoint

A user can complete the full deterministic Claude→OpenCode migration without reading source code.

---

# Phase 8 — Portable Bundles

## Goal

Separate “migration from a live source agent” from “portable representation.”

## Features

- bundle export
- bundle validation
- bundle import
- bundle schema version
- manifest
- checksums
- safe secret redaction
- provenance
- opaque-resource preservation

Suggested bundle structure:

```text
bundle/
  manifest.json
  resources/
    instructions/
    skills/
    commands/
    agents/
    mcp/
    permissions/
    hooks/
    opaque/
```

A zip/tar-based distribution format can be added only after the directory-format bundle is stable.

## Tests

- export/import round-trip
- checksum validation
- corrupt bundle rejection
- version mismatch handling
- secret detection
- unknown resource preservation
- no executable code automatically run from bundle

## Checkpoint

A developer can export a portable bundle, store it in Git, and import it into another supported agent without requiring access to the original source agent.

---

# Phase 9 — Verification and Real-World Hardening

## Goal

Verify that migration produced what the plan promised.

## Features

- file-level verification
- expected hash verification
- resource-level verification
- target config parsing where safe
- post-migration inventory
- migration report
- warnings for unverifiable semantics

Verification must distinguish:

```text
FILE_EXISTS
FILE_MATCHES
CONFIG_PARSES
RESOURCE_DISCOVERED
BEHAVIOR_VERIFIED
```

Do not claim behavioral verification merely because a file exists.

## Tests

- successful verification
- modified file detection
- malformed target config detection
- missing migrated resource detection
- unsupported semantic behavior reported honestly

## Checkpoint

Every successful migration produces a verification report explaining what was verified and what could not be verified.

---

# Phase 10 — Advanced Adaptation and Optional LLM Support

## Goal

Handle migrations where deterministic mappings are insufficient.

This phase must be optional and isolated from the core engine.

## Features

- semantic transformer interface
- provider abstraction only if multiple providers become a real requirement
- structured output validation
- confidence scoring
- human approval
- transformation diff
- assumption/loss report

## Hard rule

The LLM is a **translator**, not an executor and not a transaction manager.

It must not:

- edit user files directly
- install software
- run arbitrary shell commands
- invent target capabilities
- hide unsupported behavior

## Tests

- valid structured response accepted
- malformed response rejected
- missing required fields rejected
- low-confidence response marked for review
- prompt injection content inside a source resource treated as data, not agent instruction
- deterministic mapping preferred when available

## Checkpoint

At least one real semantic adaptation can be previewed, reviewed, applied, and verified without compromising the core deterministic system.

---

# Phase 11 — User-Ready Release

## Goal

Make the project trustworthy enough for public use.

## Release features

- polished README
- installation instructions
- supported-agent matrix
- compatibility documentation
- migration examples
- troubleshooting guide
- security model documentation
- bundle format documentation
- versioning policy
- changelog
- release artifacts
- reproducible test suite
- CI
- platform checks for supported operating systems

## User-facing documentation should answer

1. What problem does this solve?
2. Which agents are supported?
3. What exactly gets migrated?
4. What cannot be migrated?
5. Does it copy secrets?
6. Can it break my setup?
7. Can I undo it?
8. Can I review changes first?
9. Does it require the internet?
10. Can I use it in CI?
11. How do I report an adapter bug?

## Release gate

Do not call the project user-ready until:

- deterministic migrations have strong fixture coverage
- apply/rollback tests are green
- security tests are green
- malformed-input tests are green
- documentation matches actual behavior
- supported versions are documented
- no known silent-loss bug remains in the initial adapters

---

# Phase 12 — Expansion to More Agents

Add agents one at a time.

Candidate expansion order should be determined by:

1. user demand
2. documentation quality
3. configuration accessibility
4. adapter effort
5. overlap with existing canonical capabilities
6. whether the agent adds a meaningful migration path

Potential later adapters:

- OpenAI Codex
- Gemini CLI
- Cursor
- Cline
- Roo Code
- Windsurf
- others after evidence

Each new adapter must satisfy the same contract:

```text
detect
scan
normalize
capabilities
translate
write
verify
```

Do not let one unusual agent force a complex abstraction onto every adapter.

---

# 11. Agent Adapter Contract

Keep adapters intentionally boring.

```ts
interface AgentAdapter {
  id: string;
  displayName: string;
  detect(context: DetectionContext): Promise<DetectionResult>;
  scanProject(context: ScanContext): Promise<ObservedAgentState>;
  scanUser?(context: ScanContext): Promise<ObservedAgentState>;
  getCapabilities(): AgentCapabilities;
  buildTarget(resources: CanonicalResource[], context: BuildContext): Promise<TargetPlan>;
  verify?(context: VerificationContext): Promise<VerificationResult>;
}
```

Do not put transaction logic inside adapters.

Do not put global compatibility logic inside adapters.

Do not let adapters directly mutate the filesystem.

Adapters should describe how an agent looks and how a target representation is generated. The core owns safety, planning, transactions, and reporting.

---

# 12. Recommended Repository Structure

Use TypeScript/Node.js with a minimal dependency footprint.

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
│   ├── golden/
│   ├── fixtures/
│   └── e2e/
├── docs/
│   ├── architecture/
│   ├── agents/
│   ├── bundle-format/
│   ├── compatibility/
│   └── migration-rules/
├── package.json
├── tsconfig.json
├── README.md
└── AGENTS.md
```

Do not pre-create every file. Create each file when the task that owns it begins.

---

# 13. Testing Strategy

Use a layered TDD system.

## Layer 1 — Unit tests

Test pure transformations, parsing, classification, hashing, path logic, secret detection, and model validation.

## Layer 2 — Fixture/integration tests

Synthetic agent directory trees model known environments.

## Layer 3 — Golden tests

Exact expected target files for deterministic migrations.

## Layer 4 — Transaction/fault-injection tests

Force errors at selected transaction stages and verify restoration.

## Layer 5 — CLI end-to-end tests

Run the executable against temporary fixture directories.

## Layer 6 — Optional live compatibility tests

Only run against installed agents in a separately marked integration suite. Never make the core test suite depend on the user's local agent installation.

## TDD loop

Every feature:

```text
1. Write one failing behavior test.
2. Run it.
3. Confirm intended failure.
4. Implement minimum code.
5. Run focused test.
6. Run nearby suite.
7. Refactor only when justified.
8. Run full suite.
9. Review diff.
10. Commit.
```

This matches the supplied planning guidance: tasks should be independently testable, and each TDD step should be small enough to review and verify separately. fileciteturn1file1L36-L52

---

# 14. Mandatory Test Categories Before Release

## Functional

- all supported resource types
- scope handling
- parsing
- normalization
- target generation
- bundle export/import

## Safety

- secret detection
- no secret output
- path traversal
- symlink escape
- malicious filenames
- malformed structured data
- arbitrary script non-execution

## Reliability

- interruption during apply
- partial failure
- rollback
- repeated migration
- concurrent/conflicting file modification detection

## Compatibility

- each adapter fixture
- each mapping status
- known unsupported features
- versioned capability differences

## UX

- clear errors
- stable exit codes
- readable plan output
- JSON output validity

---

# 15. Definition of Done for Any Feature

A feature is not complete when code exists.

It is complete when:

- behavior has a failing test that demonstrates the requirement
- implementation makes that test pass
- regression coverage exists where appropriate
- invalid inputs are handled
- security implications are addressed
- output is documented
- CLI behavior is documented if user-facing
- no unnecessary dependency was added
- no duplicate logic was introduced
- the relevant integration/self-check passes
- the code has been reviewed for unnecessary complexity

For non-trivial logic, leave one runnable check behind, consistent with the repository's `AGENTS.md`. fileciteturn0file0L27-L32

---

# 16. Coding-Agent Operating Instructions

These instructions are for the coding agent that will actually build the product.

## Before coding anything

1. Read the entire repository.
2. Read `AGENTS.md` completely.
3. Read the current feature/spec/roadmap completely.
4. Inspect the existing package scripts and dependencies.
5. Search for existing implementations before creating new ones.
6. Verify current agent documentation for any external behavior being encoded.
7. Write a concrete implementation plan for the next checkpoint.
8. Do not start implementation until the plan identifies files, interfaces, tests, and acceptance criteria.

The supplied writing-plan skill specifically requires the plan to assume little prior context, map files first, define exact interfaces, use bite-sized TDD steps, and avoid placeholders. fileciteturn1file1L8-L12 fileciteturn1file1L25-L34

## While coding

- Follow red → green → refactor.
- Prefer standard library behavior where sufficient.
- Reuse existing dependencies.
- Do not add abstractions for hypothetical future agents.
- Keep adapters small.
- Keep filesystem transactions centralized.
- Never let source adapters write files directly.
- Keep deterministic and semantic transformations separate.
- Keep reporting separate from transformation logic.
- Preserve provenance.
- Never silently discard unsupported resources.
- Never print secrets.
- Never execute discovered scripts while scanning.
- Keep output deterministic whenever possible.
- Do not rely on network access for core functionality.

## Before declaring a task complete

Run:

```bash
npm test
npm run typecheck
npm run lint
```

plus the task-specific test and the relevant CLI self-check.

Then review:

```bash
git diff
```

Ask:

> Did I build anything this task did not require?

If yes, remove it unless it is required for correctness, safety, or a clearly accepted prerequisite.

## When blocked

Do not guess silently about an external agent's semantics.

Stop the implementation path, record the uncertainty, and use current authoritative documentation or a controlled fixture to resolve it.

The execution guidance supplied with the project says to stop when blocked, when the plan has a critical gap, when an instruction is unclear, or when verification repeatedly fails rather than forcing through the uncertainty. fileciteturn1file2L40-L48

---

# 17. Planning and Review Checkpoints

The coding agent should create a checkpoint report after every major phase.

Checkpoint format:

```markdown
# Checkpoint <N>

## Completed
- ...

## Tests
- command:
- result:

## Compatibility covered
- ...

## Known limitations
- ...

## Files changed
- ...

## Complexity review
- unnecessary code removed:
- new dependencies:
- abstractions justified:

## Security review
- ...

## Decision
PASS | BLOCKED
```

A checkpoint is a gate, not a diary entry.

The uploaded execution guidance also calls for critical plan review before execution and explicit verification of each task. fileciteturn1file2L18-L31

---

# 18. Plan Review Gate Before Implementation

Before executing a new phase plan, have a reviewer/subagent check:

- completeness
- alignment with the spec
- task decomposition
- buildability
- missing tests
- missing files/interfaces
- accidental scope creep

Only block for real implementation problems, not stylistic preferences. This mirrors the supplied plan-review template. fileciteturn1file0L13-L30

Required review output:

```text
Status: Approved | Issues Found
Issues: concrete implementation blockers
Recommendations: advisory improvements
```

---

# 19. Git and Commit Strategy

Use small commits that each represent one behavior or coherent testable task.

Examples:

```text
feat: add canonical resource model
feat: add safe atomic file writer
feat: detect Claude Code project configuration
feat: normalize Claude skills
feat: add Claude-to-OpenCode compatibility rules
feat: generate OpenCode instruction files
feat: add migration transaction manifest
feat: add rollback support
```

Do not produce one giant commit containing an entire phase.

Never implement on main/master without explicit permission; use an isolated worktree/branch when repository tooling supports it. fileciteturn1file2L18-L24 fileciteturn1file2L58-L64

---

# 20. Product Metrics

Do not optimize for vanity metrics.

Track technical/user outcomes that measure whether the migration problem is actually solved.

Useful early metrics:

- percentage of a fixture environment represented correctly
- percentage of resources with explainable compatibility results
- number of migrations requiring manual edits
- migration rollback success rate
- silent-loss incidents (target: zero)
- migration plan determinism
- mean time from scan to usable target environment
- number of supported migrations passing golden tests

A particularly important quality metric is:

**Silent loss = 0**

A tool that says it migrated something when behavior was lost is worse than a tool that openly reports that the feature is unsupported.

---

# 21. Future Differentiators After Core Product Works

Only consider these after the deterministic migration product is reliable.

## Visual migration review

A polished diff UI that lets the developer inspect each resource and approve/reject individual changes.

## Migration recipes

Reusable transformations such as:

```text
Claude Code → OpenCode
Claude Code → Kilo
OpenCode → Claude Code
```

## Team portability

A Git-trackable portable agent bundle that developers can use as a canonical team baseline.

## Compatibility registry

A maintained public mapping registry describing:

- agent versions
- capabilities
- known mappings
- unsupported features
- known caveats

## Semantic validation

Use optional LLM assistance to explain and validate difficult adaptations, never as an unbounded autonomous migration executor.

## Ecosystem integrations

Only add package-manager or skill-registry integrations when they reduce a concrete migration workflow and can reuse existing ecosystems rather than duplicating them.

---

# 22. What the Product Must Never Become

Avoid these failure modes:

### A generic plugin marketplace

That shifts the product into a different problem already served by other projects.

### A huge “universal agent framework”

The product should translate between systems, not replace them.

### An opaque AI black box

The user must always be able to see what changed and why.

### A destructive synchronization tool

Never silently overwrite user configuration.

### A dependency-heavy enterprise platform before product-market proof

Local CLI first. Add infrastructure only when the user problem demands it.

### A compatibility-score gimmick

A high aggregate percentage must never hide a critical unsupported hook or permission.

---

# 23. First Release Scope

The first public release should aim to be exceptionally good at one job:

> **Safely migrate common Claude Code configuration into OpenCode or Kilo with complete preview, explainable compatibility, deterministic transformations, backup, rollback, and verification.**

Suggested first-release support:

```text
Agents
  Claude Code
  OpenCode
  Kilo Code

Capabilities
  Instructions/rules
  Skills
  Commands
  MCP
  Agents/subagents (where direct mapping exists)
  Permissions (where direct mapping exists)
  Hooks: report/skip unless a safe direct mapping exists

Operations
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

Anything outside this list requires evidence that it is necessary for the user-ready experience.

---

# 24. Final Release Acceptance Test

A fresh developer with Claude Code configured should be able to:

1. install the tool
2. run `agent-migrate scan`
3. see an understandable inventory
4. run `agent-migrate doctor --target opencode`
5. understand every compatibility warning
6. generate a migration plan
7. inspect the diff
8. confirm the apply
9. have the tool create a safe backup
10. apply the migration
11. verify the target configuration
12. inspect the migration report
13. rollback successfully
14. verify the original source state is intact

Repeat the same acceptance flow from OpenCode toward Claude Code and Kilo as soon as those paths are supported.

---

# 25. Final Instruction to the Coding Agent

You are not being asked to “write a lot of code.” You are being asked to turn a real developer pain point into a dependable migration system.

Your priorities, in order, are:

1. **Understand the actual source and target agent behavior.**
2. **Build the smallest correct representation of that behavior.**
3. **Prove each behavior with tests before expanding it.**
4. **Make migration outcomes explicit and explainable.**
5. **Protect user files and secrets.**
6. **Prefer deterministic transformations over AI transformations.**
7. **Use AI only when semantic adaptation is genuinely required.**
8. **Never claim equivalence without evidence.**
9. **Keep the implementation boring, modular, and local-first.**
10. **Stop and reassess instead of inventing complexity.**

The project-level `AGENTS.md` explicitly says to ask whether a feature needs to be built, reuse existing helpers/dependencies/platform features, avoid unnecessary abstractions and boilerplate, prefer deletion and boring solutions, and understand the real end-to-end flow before choosing an implementation. Those principles govern every phase. fileciteturn0file0L5-L27

The coding agent should therefore operate as a senior engineer with a skeptical bias toward unnecessary code:

> **Do the least work that produces the most trustworthy migration.**

The finished product should feel less like an experimental AI project and more like a reliable developer systems tool that happens to understand AI coding-agent environments.
