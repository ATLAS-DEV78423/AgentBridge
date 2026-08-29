# Graph Report - project mesh transit  (2026-08-29)

## Corpus Check
- Corpus is ~20,001 words - fits in a single context window. You may not need a graph.

## Summary
- 166 nodes · 337 edges · 11 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Agent Adapters
- Project Config
- Data Model
- Compatibility Engine
- TypeScript Config
- CLI Shell
- Transaction Engine
- Filesystem Safety

## God Nodes (most connected - your core abstractions)
1. `MigrationStatus` - 13 edges
2. `compilerOptions` - 13 edges
3. `AgentAdapter` - 10 edges
4. `AgentBundle` - 9 edges
5. `ScanContext` - 9 edges
6. `createResource()` - 9 edges
7. `evaluateCompatibility()` - 8 edges
8. `normalizeBundle()` - 8 edges
9. `getRulesForMigration()` - 8 edges
10. `hashFile()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `executeDiff()` --calls--> `normalizeBundle()`  [EXTRACTED]
  src/cli/commands/diff.ts → src/core/normalize/normalizer.ts
- `executePlan()` --calls--> `normalizeBundle()`  [EXTRACTED]
  src/cli/commands/plan.ts → src/core/normalize/normalizer.ts
- `createResource()` --calls--> `hashFile()`  [EXTRACTED]
  src/core/scanner/scanner.ts → src/core/filesystem/hashing.ts
- `scanClaudeProject()` --calls--> `createResource()`  [EXTRACTED]
  src/adapters/claude-code/scanner.ts → src/core/scanner/scanner.ts
- `scanKiloProject()` --calls--> `createResource()`  [EXTRACTED]
  src/adapters/kilo/scanner.ts → src/core/scanner/scanner.ts

## Import Cycles
- None detected.

## Communities (11 total, 0 thin omitted)

### Community 0 - "Agent Adapters"
Cohesion: 0.15
Nodes (17): CLAUDE_MARKERS, detectClaude(), claudeAdapter, INSTRUCTION_FILES, scanClaudeProject(), detectKilo(), kiloAdapter, scanKiloProject() (+9 more)

### Community 1 - "Project Config"
Cohesion: 0.07
Nodes (27): author, description, devDependencies, tsx, @types/node, typescript, vitest, engines (+19 more)

### Community 2 - "Data Model"
Cohesion: 0.11
Nodes (20): createBundle(), VALID_STATUSES, validateBundle(), ValidationResult, AgentBundle, AgentRef, CompatibilityResult, MigrationStatus (+12 more)

### Community 3 - "Compatibility Engine"
Cohesion: 0.18
Nodes (16): openCodeAdapter, adapters, executeDiff(), adapters, executePlan(), CompatibilityResult, CompatibilityRule, evaluateCompatibility() (+8 more)

### Community 4 - "TypeScript Config"
Cohesion: 0.10
Nodes (20): dist, node, node_modules, src/**/*, tests, compilerOptions, declaration, esModuleInterop (+12 more)

### Community 5 - "CLI Shell"
Cohesion: 0.31
Nodes (5): HELP_TEXT, showHelp(), adapters, executeScan(), args

### Community 6 - "Transaction Engine"
Cohesion: 0.47
Nodes (6): applyTransaction(), createTransaction(), rollbackTransaction(), Transaction, TransactionOperation, CLAUDE_FIXTURE

### Community 7 - "Filesystem Safety"
Cohesion: 0.61
Nodes (5): hashFile(), atomicWrite(), backupFile(), restoreBackup(), safePath()

## Knowledge Gaps
- **58 isolated node(s):** `name`, `version`, `description`, `type`, `node` (+53 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MigrationStatus` connect `Data Model` to `Compatibility Engine`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `hashFile()` connect `Filesystem Safety` to `Agent Adapters`, `Transaction Engine`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `getRulesForMigration()` connect `Compatibility Engine` to `Transaction Engine`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _58 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Agent Adapters` be split into smaller, more focused modules?**
  _Cohesion score 0.14717741935483872 - nodes in this community are weakly interconnected._
- **Should `Project Config` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `Data Model` be split into smaller, more focused modules?**
  _Cohesion score 0.11375661375661375 - nodes in this community are weakly interconnected._