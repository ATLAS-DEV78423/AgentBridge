# Graph Report - project mesh transit  (2026-08-29)

## Corpus Check
- Corpus is ~7,607 words - fits in a single context window. You may not need a graph.

## Summary
- 110 nodes · 104 edges · 13 communities (10 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Migration System
- Migration System
- Planning & Tasks
- Skills & Review
- Planning & Tasks
- Migration System
- Migration System
- Migration System
- Migration System
- Compatibility Engine
- Community 10
- Migration System
- Planning & Tasks

## God Nodes (most connected - your core abstractions)
1. `14. Coding-agent operating instructions` - 12 edges
2. `Writing Plans` - 11 edges
3. `Verification Before Completion` - 9 edges
4. `Executing Plans` - 6 edges
5. `13. Future architecture, only after MVP` - 6 edges
6. `16. First tasks the coding agent should execute` - 6 edges
7. `Agent Migration Tool — TDD Action Plan` - 5 edges
8. `1. Architecture` - 5 edges
9. `The Process` - 4 edges
10. `Initial scope` - 3 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities (13 total, 3 thin omitted)

### Community 0 - "Migration System"
Cohesion: 0.06
Nodes (32): 11. Definition of done, 12. What not to build in the first version, 15. Suggested implementation order, 17. Research revalidation requirement, 18. Final product bar, 2. Universal representation, 3. Compatibility model, 5. Safety model (+24 more)

### Community 1 - "Migration System"
Cohesion: 0.17
Nodes (12): 14. Coding-agent operating instructions, Apply the repository's efficiency ladder, Checkpoint discipline, Do not guess agent behavior, Do not over-abstract, First understand, then code, Make failure explicit, Prefer deterministic behavior (+4 more)

### Community 2 - "Planning & Tasks"
Cohesion: 0.17
Nodes (11): Bite-Sized Task Granularity, Execution Handoff, File Structure, No Placeholders, Overview, Plan Document Header, Scope Check, Self-Review (+3 more)

### Community 3 - "Skills & Review"
Cohesion: 0.20
Nodes (9): Common Failures, Key Patterns, Overview, Rationalization Prevention, Red Flags - STOP, The Gate Function, The Iron Law, Verification Before Completion (+1 more)

### Community 4 - "Planning & Tasks"
Cohesion: 0.20
Nodes (9): Executing Plans, Overview, Remember, Step 1: Load and Review Plan, Step 2: Execute Tasks, Step 3: Complete Development, The Process, When to Revisit Earlier Steps (+1 more)

### Community 5 - "Migration System"
Cohesion: 0.29
Nodes (7): Agent Migration Tool — TDD Action Plan, Goal, Important researched constraints, Initial capability scope, Initial scope, Initial source/target agents, Product thesis

### Community 6 - "Migration System"
Cohesion: 0.33
Nodes (6): 13. Future architecture, only after MVP, Agent registry, Interactive migration, LLM transformation service, Third-party adapters, TUI/GUI

### Community 7 - "Migration System"
Cohesion: 0.33
Nodes (6): 16. First tasks the coding agent should execute, Task 1 — Repository reconnaissance, Task 2 — Minimal CLI shell, Task 3 — Canonical model, Task 4 — Filesystem transaction primitives, Task 5 — Claude scan fixture

### Community 8 - "Migration System"
Cohesion: 0.40
Nodes (5): 1. Architecture, A. Observed source state, B. Canonical model, C. Migration plan, D. Target output

### Community 9 - "Compatibility Engine"
Cohesion: 0.67
Nodes (3): 4. Deterministic vs semantic translation, Deterministic transformations, Semantic/LLM-assisted transformations

## Knowledge Gaps
- **92 isolated node(s):** `Ponytail, lazy senior dev mode`, `Overview`, `The Iron Law`, `The Gate Function`, `Common Failures` (+87 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `14. Coding-agent operating instructions` connect `Migration System` to `Migration System`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Why does `Agent Migration Tool — TDD Action Plan` connect `Migration System` to `Migration System`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `13. Future architecture, only after MVP` connect `Migration System` to `Migration System`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **What connects `Ponytail, lazy senior dev mode`, `Overview`, `The Iron Law` to the rest of the system?**
  _92 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Migration System` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._