# AgentBridge

> Safely migrate your AI coding agent configuration between different agents.

A local-first CLI tool that discovers, normalizes, compares, and migrates coding agent environments (Claude Code ↔ OpenCode ↔ Kilo Code) with full transparency and rollback support.

## Features

- **Multi-agent support**: Claude Code, OpenCode, Kilo Code
- **Safe migration**: Backup before overwrite, atomic writes, full rollback
- **Transparent**: Every change is explainable with clear status indicators
- **Portable bundles**: Export/import agent configs across machines
- **JSON output**: Machine-readable output for automation
- **Zero dependencies**: Only uses Node.js built-in modules

## Installation

```bash
# From npm (when published)
npm install -g agent-migrate

# From source
git clone https://github.com/ATLAS-DEV78423/AgentBridge.git
cd AgentBridge
npm install
npm link
```

## Quick Start

```bash
# Scan your project for agent configs
agent-migrate scan

# See what would change when migrating to OpenCode
agent-migrate plan claude-code opencode

# Preview the file changes
agent-migrate diff claude-code opencode

# Validate your environment
agent-migrate doctor
```

## Commands

| Command | Description |
|---------|-------------|
| `scan [path]` | Scan directory for agent configurations |
| `plan <source> <target> [path]` | Show migration compatibility report |
| `diff <source> <target> [path]` | Preview file changes |
| `doctor [path]` | Validate environment and detect agents |
| `export [agent] [path] [output]` | Export config to portable bundle |
| `import <bundle>` | Import and validate a bundle |
| `verify [path]` | Verify migration results |

All commands support `--json` for structured output.

## Migration Status Types

| Status | Meaning |
|--------|---------|
| `EXACT` | Equivalent representation, no semantic change |
| `DIRECT` | Direct target-supported representation |
| `ADAPTED` | Transformed with known differences |
| `PARTIAL` | Some resources can migrate, some cannot |
| `UNSUPPORTED` | No safe target representation exists |
| `BLOCKED` | Migration cannot proceed safely |

## Architecture

```
Scanner → Source Model → Normalizer → Canonical Model
    ↓
Capability Registry → Compatibility Rules
    ↓
Migration Planner → Target Writer → Transaction Engine
    ↓
Backup → Atomic Write → Verify → Rollback (if needed)
```

## Supported Migrations

| Source | Target | Status |
|--------|--------|--------|
| Claude Code | OpenCode | ✅ Supported |
| Claude Code | Kilo Code | ✅ Supported |
| OpenCode | Claude Code | 🔜 Planned |
| Kilo Code | Claude Code | 🔜 Planned |

## Development

```bash
# Run tests
npm test

# Type check
npm run typecheck

# Run in development
npx tsx src/cli/main.ts --help
```

## License

MIT
