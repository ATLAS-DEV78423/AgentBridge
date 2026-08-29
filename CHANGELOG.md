# Changelog

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
