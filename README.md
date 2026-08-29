# AgentBridge

> Migrate your AI coding agent configuration between Claude Code, OpenCode, and Kilo Code.

A local-first CLI tool that discovers, compares, and migrates coding agent environments with backup and rollback.

## Installation

```bash
# From npm
npm install -g agent-migrate

# From source
git clone https://github.com/ATLAS-DEV78423/AgentBridge.git
cd AgentBridge
npm install
npm link
```

Requires Node.js >= 22.

## Quick Start

```bash
# See what's in your project
agent-migrate scan

# Preview a migration
agent-migrate plan claude-code opencode

# Do it
agent-migrate migrate claude-code opencode

# Undo if needed
agent-migrate rollback . <migration-id>
```

## Commands

| Command | Description |
|---------|-------------|
| `scan [path]` | Detect which agent configs exist |
| `plan <source> <target> [path]` | Show what maps to what |
| `diff <source> <target> [path]` | Preview file changes |
| `migrate <source> <target> [path]` | Scan + write in one step |
| `apply <source> <target> [path]` | Same as migrate (alias) |
| `apply ... --dry-run` | Preview without writing |
| `rollback <path> <migration-id>` | Restore from backup |

## Supported Migrations

| Source | Target | Status |
|--------|--------|--------|
| Claude Code | OpenCode | ✅ Supported |
| Claude Code | Kilo Code | ✅ Supported |

## How It Works

1. **Scan** — finds `AGENTS.md`, `.claude/`, `opencode.jsonc`, `.kilo/` etc.
2. **Plan** — maps each resource via compatibility rules (DIRECT / ADAPTED / UNSUPPORTED)
3. **Migrate** — writes target files, backs up originals
4. **Rollback** — restores everything from backup

MCP server configs are translated between formats (e.g. Claude's implicit stdio → OpenCode's explicit `type: "stdio"`).

## Development

```bash
npm test          # run tests
npm run typecheck # type check
npm run build     # compile to dist/
```

## License

MIT
