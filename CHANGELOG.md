# Changelog

## [1.1.0] - 2026-09-14

### Features
- **Cursor adapter** (source & target) — `.cursor/mcp.json`, adds explicit `type: "stdio"` for command servers, remote passthrough
- **Gemini CLI adapter** (source & target) — `.gemini/settings.json`, strips the stdio `type` (transport inferred from shape), instructions as `GEMINI.md`
- **`migrate-all <source>`** — sync one agent's config to every other detected agent, per-target rollback ids, `--dry-run` supported
- **Bidirectional migrations** — every ordered pair among Claude Code, OpenCode, Kilo Code, Cursor, and Gemini CLI (20 directions)
- **Merge instead of clobber** — migrations deep-merge into existing JSON target configs; user-added keys survive, incoming values win

### Fixes
- `migrate claude-code kilo` no longer throws "writer not implemented" — Kilo gained a target writer (`.kilo/kilo.jsonc`, documented `mcp` key, local/remote formats)
- JSONC configs parse comment-tolerantly (`kilo.jsonc`, `opencode.jsonc`) — comments and trailing commas no longer silently drop MCP extraction
- Kilo as a source now extracts its `mcp` servers (normalized to the canonical command/args/env shape), so `kilo → opencode` carries MCP for the first time
- Kilo scanner/detector read the documented `.kilo/kilo.jsonc` (legacy `.kilo/config.json` as fallback)
- `scan` reports **all** detected agents, not just the first
- Instructions normalize across filename conventions (`GEMINI.md` ↔ `AGENTS.md`) so migrations land files the target actually reads
- `plan` no longer claims opaque settings adapt to Cursor/Gemini (honest UNSUPPORTED); kilo's real `model`/`maxTokens` mapping is reflected
- `migrate-all` pre-flights writer coverage and fails fast before touching files if any detected agent lacks a writer

### Docs & tooling
- Per-pair compatibility matrix in the README, generated from real writer behavior and guarded by a test
- 119 tests (was 24)

## [1.0.0] - 2026-08-29
## [1.0.0] - 2026-08-29

### Features
- Scan, plan, diff, migrate, apply, rollback commands
- Claude Code, OpenCode, Kilo Code support
- MCP server config translation between agents
- Backup and rollback with manifest-based restore
- ASCII art banner

### Architecture
- Single pipeline (`migratePipeline`) shared by migrate and apply
- Writer registry for adding new target agents
- Compatibility rules engine
- Zero runtime dependencies
- 24 tests passing
