# Changelog

## [Unreleased]

### Refactor
- Plan/diff statuses now derive from each target's **real writer** via a `writerSupports` probe — the 132-entry rules table and compatibility engine are deleted, and what `plan` reports can no longer drift from what migration does
- Adapter + writer registered together in one list per agent; `registerWriter` throws on duplicates, making the "registered adapter, forgot writer" bug class structurally impossible (invariant test enforces exactly one adapter and one writer per agent)
- README compatibility matrix drift-guard now runs through the production `planMigration` code path

## [1.2.0] - 2026-09-15

### Features
- **Seven new agents, both directions each** — OpenAI Codex (`.codex/config.toml`, TOML), GitHub Copilot CLI (`.copilot/mcp-config.json`, instructions to `.github/copilot-instructions.md`), Crush (`.crush.json`, `mcp` key), Grok CLI (`.mcp.json`), omp/Oh My Pi (`.pi/mcp.json`), Muse Code (`MUSE_CODE.md`), Pi (`AGENTS.md`) — **132 ordered-pair migrations** across 12 agents (Cursor CLI covered by the Cursor adapter)
- Shared JSON-adapter factory generates detector/scanner/writer triples from one per-agent spec; hand-rolled minimal TOML parser/serializer powers the Codex adapter (throws loudly on unsupported TOML features instead of mis-parsing)
- Merge-don't-clobber extended to **TOML and commented-JSON targets** — user keys in `config.toml` and hand-commented `.json` configs survive migration
- `migrate-all` works across all new agents with per-target rollback ids

### Fixes
- `migrate --dry-run` was silently ignored (flag dropped in CLI arg parsing) — it now plans without writing, matching `migrate-all`
- Crush output now schema-compliant: `type` written on every server (`stdio`/`http`) per the required field in Crush's docs
- Commented `.json` configs no longer fall back to whole-file replace — comment-tolerant parsing applies at the merge boundary too
- Instructions normalize `MUSE_CODE.md` → `AGENTS.md` for all targets (not just `GEMINI.md`)
- OpenCode writer's obsolete opaque-config gate removed; parsing is now the test

### Docs & tooling
- README compatibility matrix regenerated for all 132 directions from real writer behavior (drift-guard test enforces it)
- 163 tests (was 119)

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
