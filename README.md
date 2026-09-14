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

# Any direction works — e.g. back to Claude Code
agent-migrate migrate opencode claude-code

# Or sync one agent's config to every other agent in the project
agent-migrate migrate-all claude-code .
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
| OpenCode | Claude Code | ✅ Supported |
| OpenCode | Kilo Code | ✅ Supported |
| Kilo Code | Claude Code | ✅ Supported |
| Kilo Code | OpenCode | ✅ Supported |
| Cursor | Claude Code | ✅ Supported |
| Cursor | OpenCode | ✅ Supported |
| Cursor | Kilo Code | ✅ Supported |
| Claude Code | Cursor | ✅ Supported |
| OpenCode | Cursor | ✅ Supported |
| Kilo Code | Cursor | ✅ Supported |
| Gemini CLI | Claude Code | ✅ Supported |
| Gemini CLI | OpenCode | ✅ Supported |
| Gemini CLI | Kilo Code | ✅ Supported |
| Gemini CLI | Cursor | ✅ Supported |
| Claude Code | Gemini CLI | ✅ Supported |
| OpenCode | Gemini CLI | ✅ Supported |
| Kilo Code | Gemini CLI | ✅ Supported |
| Cursor | Gemini CLI | ✅ Supported |

## How It Works

1. **Scan** — finds `AGENTS.md`, `.claude/`, `opencode.jsonc`, `.kilo/`, `.cursor/`, `.gemini/` etc.
2. **Plan** — maps each resource via compatibility rules (DIRECT / ADAPTED / UNSUPPORTED)
3. **Migrate** — writes target files, backs up originals
4. **Rollback** — restores everything from backup

MCP server configs are translated between formats (e.g. Claude's implicit stdio → OpenCode's explicit `type: "stdio"`).

## What migrates (per pair)

What each direction carries, computed from the writers' actual behavior:

| Direction | Instructions | MCP servers | Model settings |
|---|---|---|---|
| claude-code → opencode | ✓ | ✓ | ✓ |
| claude-code → kilo | ✓ | ✓ | ✓ |
| claude-code → cursor | ✓ | ✓ | ✗ |
| claude-code → gemini | ✓ | ✓ | ✗ |
| opencode → claude-code | ✓ | ✓ | ✓ |
| opencode → kilo | ✓ | ✓ | ✓ |
| opencode → cursor | ✓ | ✓ | ✗ |
| opencode → gemini | ✓ | ✓ | ✗ |
| kilo → claude-code | ✓ | ✓ | ✓ |
| kilo → opencode | ✓ | ✓ | ✓ |
| kilo → cursor | ✓ | ✓ | ✗ |
| kilo → gemini | ✓ | ✓ | ✗ |
| cursor → claude-code | ✓ | ✓ | ✗ |
| cursor → opencode | ✓ | ✓ | ✗ |
| cursor → kilo | ✓ | ✓ | ✗ |
| cursor → gemini | ✓ | ✓ | ✗ |
| gemini → claude-code | ✓ | ✓ | ✗ |
| gemini → opencode | ✓ | ✓ | ✗ |
| gemini → kilo | ✓ | ✓ | ✗ |
| gemini → cursor | ✓ | ✓ | ✗ |

Notes:
- **Instructions** land at the target's own filename — `AGENTS.md` everywhere except Gemini CLI, which reads `GEMINI.md`.
- **MCP servers** are translated to each target's format (stdio vs local vs inferred transport; Claude gets the explicit `type` stripped, Cursor gets it added).
- **Model settings** mean `model` (plus `permissions` for OpenCode targets, `maxTokens` for Kilo). Cursor and Gemini store no equivalent settings fields, so those columns are ✗ by design — their configs are MCP-only.

## Development

```bash
npm test          # run tests
npm run typecheck # type check
npm run build     # compile to dist/
```

## License

MIT
