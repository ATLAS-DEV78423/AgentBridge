# Changelog

## [0.1.0] - 2026-08-29

### Added
- Initial project setup with TypeScript + Vitest
- CLI shell with `--help` command
- Canonical model types (AgentBundle, Provenance, CompatibilityResult)
- Filesystem primitives (atomicWrite, backupFile, restoreBackup, safePath, hashFile)
- Claude Code scanner with fixtures
- OpenCode scanner with fixtures
- Kilo scanner with fixtures
- Compatibility engine with rule evaluation
- Capability registry for agent support matrix
- Compatibility rules for agent pairs
- Normalizer for scanner output
- Plan command for migration compatibility analysis
- 53 tests passing

### Commands
- `agentbridge scan [path]` - Scan for agent configurations
- `agentbridge plan <src> <tgt> [path]` - Generate migration plan

### Supported Agents
- Claude Code
- OpenCode
- Kilo

## Roadmap

### Phase 5 - First Real Migration Path
- Claude → OpenCode deterministic migration
- Target file generation
- Diff output

### Phase 6 - Transaction Safety
- Transaction IDs
- Atomic writes
- Backup and rollback
- Migration history

### Phase 7 - CLI Polish
- JSON output mode
- Exit codes
- Doctor command
- Diff command

### Phase 8 - Portable Bundles
- Export/import bundle format
- Bundle validation
- Secret redaction

### Phase 9 - Verification
- File-level verification
- Hash verification
- Migration reports
