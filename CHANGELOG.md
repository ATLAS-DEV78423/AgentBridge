# Changelog

## [1.0.0] - 2026-08-29

### Added
- Multi-agent support: Claude Code, OpenCode, Kilo Code
- Scan command for discovering agent configurations
- Plan command for migration compatibility reports
- Diff command for previewing file changes
- Doctor command for environment validation
- Export command for portable bundles
- Import command for bundle validation
- Verify command for migration verification
- JSON output mode (`--json` flag)
- Proper exit codes (0 success, 1 error, 2 invalid args)
- Transaction engine with backup and rollback
- Capability registry for agent feature mapping
- Compatibility rules engine
- Normalizer for converting scanner output to canonical model
- Secret redaction in exported bundles
- Checksum verification for bundle integrity

### Architecture
- Modular adapter system for adding new agents
- Canonical resource model for cross-agent compatibility
- TDD with 87 tests passing
- Zero runtime dependencies

## [0.1.0] - 2026-08-28

### Added
- Initial project setup
- Claude Code scanner
- Basic CLI shell
- Canonical model types
- Filesystem primitives
