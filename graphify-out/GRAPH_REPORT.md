# Graph Report - project mesh transit  (2026-08-29)

## Corpus Check
- Corpus is ~27,012 words - fits in a single context window. You may not need a graph.

## Summary
- 268 nodes · 599 edges · 14 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Agent Adapters
- Package Config
- Target Writers
- Bundle System
- Compatibility Engine
- CLI Commands
- Project Structure
- Data Model
- Filesystem Safety
- Verification Engine
- Dependencies

## God Nodes (most connected - your core abstractions)
1. `MigrationStatus` - 13 edges
2. `AgentBundle` - 13 edges
3. `AgentAdapter` - 13 edges
4. `compilerOptions` - 13 edges
5. `normalizeBundle()` - 11 edges
6. `claudeAdapter` - 10 edges
7. `getRulesForMigration()` - 10 edges
8. `keywords` - 9 edges
9. `output()` - 9 edges
10. `evaluateCompatibility()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `executeDiff()` --calls--> `normalizeBundle()`  [EXTRACTED]
  src/cli/commands/diff.ts → src/core/normalize/normalizer.ts
- `executeExport()` --calls--> `exportBundle()`  [EXTRACTED]
  src/cli/commands/export.ts → src/core/bundle/export.ts
- `executeImport()` --calls--> `output()`  [EXTRACTED]
  src/cli/commands/import-bundle.ts → src/cli/output/formatter.ts
- `executePlan()` --calls--> `normalizeBundle()`  [EXTRACTED]
  src/cli/commands/plan.ts → src/core/normalize/normalizer.ts
- `executeVerify()` --calls--> `verifyMigration()`  [EXTRACTED]
  src/cli/commands/verify.ts → src/core/verification/verify.ts

## Import Cycles
- None detected.

## Communities (14 total, 0 thin omitted)

### Community 0 - "Agent Adapters"
Cohesion: 0.12
Nodes (24): CLAUDE_MARKERS, detectClaude(), claudeAdapter, INSTRUCTION_FILES, scanClaudeProject(), detectKilo(), kiloAdapter, scanKiloProject() (+16 more)

### Community 1 - "Package Config"
Cohesion: 0.05
Nodes (38): author, bin, agent-migrate, bugs, url, description, engines, node (+30 more)

### Community 2 - "Target Writers"
Cohesion: 0.16
Nodes (17): writeOpenCodeFiles(), adapters, executeApply(), executeRollback(), readDirRecursive(), CanonicalResource, groupByType(), normalizeBundle() (+9 more)

### Community 3 - "Bundle System"
Cohesion: 0.20
Nodes (17): executeImport(), calculateChecksum(), containsSecret(), countResources(), exportBundle(), redactSecrets(), SECRET_PATTERNS, importBundle() (+9 more)

### Community 4 - "Compatibility Engine"
Cohesion: 0.17
Nodes (13): executeDiff(), executePlan(), CompatibilityResult, CompatibilityRule, evaluateCompatibility(), AgentCapabilities, CAPABILITIES, getCapabilities() (+5 more)

### Community 5 - "CLI Commands"
Cohesion: 0.15
Nodes (13): executeDoctor(), executeExport(), HELP_TEXT, showHelp(), discoverFiles(), executeVerify(), args, jsonIndex (+5 more)

### Community 6 - "Project Structure"
Cohesion: 0.10
Nodes (20): node, node_modules, src/**/*, tests, compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames (+12 more)

### Community 7 - "Data Model"
Cohesion: 0.13
Nodes (16): createBundle(), VALID_STATUSES, validateBundle(), ValidationResult, AgentRef, CompatibilityResult, MigrationStatus, ADAPTED (+8 more)

### Community 8 - "Filesystem Safety"
Cohesion: 0.26
Nodes (11): hashFile(), atomicWrite(), backupFile(), restoreBackup(), safePath(), applyTransaction(), createTransaction(), rollbackTransaction() (+3 more)

### Community 9 - "Verification Engine"
Cohesion: 0.45
Nodes (8): FileVerification, ResourceVerification, VerificationReport, VerificationStatus, verifyConfig(), verifyFile(), verifyMigration(), verifyResource()

### Community 10 - "Dependencies"
Cohesion: 0.22
Nodes (9): devDependencies, tsx, @types/node, typescript, vitest, tsx, @types/node, typescript (+1 more)

## Knowledge Gaps
- **84 isolated node(s):** `name`, `version`, `description`, `type`, `main` (+79 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MigrationStatus` connect `Data Model` to `Compatibility Engine`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `AgentBundle` connect `Bundle System` to `Agent Adapters`, `Target Writers`, `Data Model`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `hashFile()` connect `Filesystem Safety` to `Agent Adapters`, `Target Writers`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _84 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Agent Adapters` be split into smaller, more focused modules?**
  _Cohesion score 0.12323232323232323 - nodes in this community are weakly interconnected._
- **Should `Package Config` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `Project Structure` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._