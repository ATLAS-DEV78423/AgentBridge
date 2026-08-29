# Phase 5: First Real Migration Path (Claude -> OpenCode)

**Goal:** Generate actual OpenCode target files from Claude source, with diff output and staging.

**What exists:** scan, normalize, compat, plan commands working.

## Tasks

### Task 1: Target Writer Interface
- Define how adapters generate target files
- Create src/core/translate/writer.ts interface

### Task 2: OpenCode Target Writer
- Generate OpenCode files from Claude resources
- Instructions -> AGENTS.md (copy)
- Settings -> opencode.json (adapt)
- Skills -> commands (adapt)

### Task 3: Diff Command
- Add agentbridge diff <source> <target> [path]
- Show what files will be created/modified
- Human-readable output

### Task 4: Staging Directory
- Generate files in .agentbridge/staging/
- Show diff before applying
- Test with Claude -> OpenCode fixture

## Verification
- agentbridge diff claude-code opencode <path> shows target files
- Generated files parse as valid JSON/markdown
