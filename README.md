# AgentBridge

[![npm version](https://img.shields.io/npm/v/@superdev2347832/agent-bridge.svg)](https://www.npmjs.com/package/@superdev2347832/agent-bridge)
[![CI](https://github.com/ATLAS-DEV78423/AgentBridge/actions/workflows/ci.yml/badge.svg)](https://github.com/ATLAS-DEV78423/AgentBridge/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> Migrate your AI coding agent configuration between 12 agents: Claude Code, OpenCode, Kilo Code, Cursor, Gemini CLI, Codex, Copilot CLI, Crush, Grok, omp, Muse Code, and Pi.

A local-first CLI tool that discovers, compares, and migrates coding agent environments with backup and rollback.

## Installation

```bash
# From npm (installs the `agent-migrate` binary)
npm install -g @superdev2347832/agent-bridge

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

# Check configs for schema problems (exit 1 on errors — CI-friendly)
agent-migrate doctor

# Apply the safe auto-fixes (commented strict-JSON, divergent instructions)
agent-migrate fix

# Any direction works — e.g. back to Claude Code
agent-migrate migrate opencode claude-code

# Or sync one agent's config to every other agent in the project
agent-migrate migrate-all claude-code .
```

## Commands

| Command | Description |
|---------|-------------|
| `scan [path]` | Detect every agent config present (all of them, not just the first) |
| `plan <source> <target> [path]` | Show what maps to what |
| `diff <source> <target> [path]` | Preview file changes |
| `migrate <source> <target> [path] [--dry-run]` | Scan + write in one step |
| `apply <source> <target> [path]` | Same as migrate (alias) |
| `apply ... --dry-run` | Preview without writing |
| `migrate-all <source> [path]` | Sync to every other detected agent |
| `doctor [path]` | Validate detected agent configs against their documented schemas (exit 1 on errors) |
| `fix [path] [--dry-run]` | Apply safe auto-fixes with backup — e.g. strip comments from a strict-JSON config. `--dry-run` previews before/after without writing |
| `rollback <path> <migration-id>` | Restore from backup |

## Supported agents

| Agent | ID | Project config | Instructions file |
|-------|----|----------------|-------------------|
| Claude Code | `claude-code` | `.claude/settings.json` | AGENTS.md |
| OpenCode | `opencode` | `opencode.json[c]` | AGENTS.md |
| Kilo Code | `kilo` | `.kilo/kilo.jsonc` | AGENTS.md |
| Cursor | `cursor` | `.cursor/mcp.json` | AGENTS.md |
| Gemini CLI | `gemini` | `.gemini/settings.json` | GEMINI.md |
| Codex | `codex` | `.codex/config.toml` (TOML) | AGENTS.md |
| Copilot CLI | `copilot` | `.copilot/mcp-config.json` | `.github/copilot-instructions.md` |
| Crush | `crush` | `.crush.json` | AGENTS.md |
| Grok | `grok` | `.mcp.json` | AGENTS.md |
| omp (Oh My Pi) | `omp` | `.pi/mcp.json` | AGENTS.md |
| Muse Code | `muse-code` | — (instructions only) | MUSE_CODE.md |
| Pi | `pi` | — (instructions only) | AGENTS.md |

Honest caveats:
- **Copilot CLI** primarily reads MCP config from user-level `~/.copilot/mcp-config.json`; project-level support varies by CLI version. Project files are migrated as-is — verify your install picks them up.
- **Muse Code** and **Pi** document no project-scoped MCP config, so only instructions migrate for them.
- **Hermes** (Nous Research) and **OpenClaw** are intentionally unsupported: their configuration lives in global/gateway state with no repo-scoped files to migrate.

## How It Works

1. **Scan** — finds `AGENTS.md`, `.claude/`, `opencode.json[c]`, `.kilo/`, `.cursor/`, `.gemini/`, `.codex/`, `.copilot/`, `.crush.json`, `.mcp.json`, `.pi/` etc.
2. **Plan** — maps each resource via compatibility rules (DIRECT / ADAPTED / UNSUPPORTED)
3. **Migrate** — writes target files, backing up originals; existing JSON/JSONC/TOML configs are **merged**, so your hand-added keys survive
4. **Rollback** — restores everything from backup

MCP server configs are translated between formats (e.g. Claude's implicit stdio → OpenCode's explicit `type: "stdio"` → Kilo's array-form `command` → Codex's TOML tables).

## What migrates (per pair)

What each direction carries, computed from the writers' actual behavior:

| Direction | Instructions | MCP servers | Model settings |
|---|---|---|---|
| claude-code → opencode | ✓ | ✓ | ✓ |
| claude-code → kilo | ✓ | ✓ | ✓ |
| claude-code → cursor | ✓ | ✓ | ✗ |
| claude-code → gemini | ✓ | ✓ | ✗ |
| claude-code → codex | ✓ | ✓ | ✓ |
| claude-code → copilot | ✓ | ✓ | ✗ |
| claude-code → crush | ✓ | ✓ | ✗ |
| claude-code → grok | ✓ | ✓ | ✗ |
| claude-code → omp | ✓ | ✓ | ✗ |
| claude-code → muse-code | ✓ | ✗ | ✗ |
| claude-code → pi | ✓ | ✗ | ✗ |
| opencode → claude-code | ✓ | ✓ | ✓ |
| opencode → kilo | ✓ | ✓ | ✓ |
| opencode → cursor | ✓ | ✓ | ✗ |
| opencode → gemini | ✓ | ✓ | ✗ |
| opencode → codex | ✓ | ✓ | ✓ |
| opencode → copilot | ✓ | ✓ | ✗ |
| opencode → crush | ✓ | ✓ | ✗ |
| opencode → grok | ✓ | ✓ | ✗ |
| opencode → omp | ✓ | ✓ | ✗ |
| opencode → muse-code | ✓ | ✗ | ✗ |
| opencode → pi | ✓ | ✗ | ✗ |
| kilo → claude-code | ✓ | ✓ | ✓ |
| kilo → opencode | ✓ | ✓ | ✓ |
| kilo → cursor | ✓ | ✓ | ✗ |
| kilo → gemini | ✓ | ✓ | ✗ |
| kilo → codex | ✓ | ✓ | ✓ |
| kilo → copilot | ✓ | ✓ | ✗ |
| kilo → crush | ✓ | ✓ | ✗ |
| kilo → grok | ✓ | ✓ | ✗ |
| kilo → omp | ✓ | ✓ | ✗ |
| kilo → muse-code | ✓ | ✗ | ✗ |
| kilo → pi | ✓ | ✗ | ✗ |
| cursor → claude-code | ✓ | ✓ | ✗ |
| cursor → opencode | ✓ | ✓ | ✗ |
| cursor → kilo | ✓ | ✓ | ✗ |
| cursor → gemini | ✓ | ✓ | ✗ |
| cursor → codex | ✓ | ✓ | ✗ |
| cursor → copilot | ✓ | ✓ | ✗ |
| cursor → crush | ✓ | ✓ | ✗ |
| cursor → grok | ✓ | ✓ | ✗ |
| cursor → omp | ✓ | ✓ | ✗ |
| cursor → muse-code | ✓ | ✗ | ✗ |
| cursor → pi | ✓ | ✗ | ✗ |
| gemini → claude-code | ✓ | ✓ | ✗ |
| gemini → opencode | ✓ | ✓ | ✗ |
| gemini → kilo | ✓ | ✓ | ✗ |
| gemini → cursor | ✓ | ✓ | ✗ |
| gemini → codex | ✓ | ✓ | ✗ |
| gemini → copilot | ✓ | ✓ | ✗ |
| gemini → crush | ✓ | ✓ | ✗ |
| gemini → grok | ✓ | ✓ | ✗ |
| gemini → omp | ✓ | ✓ | ✗ |
| gemini → muse-code | ✓ | ✗ | ✗ |
| gemini → pi | ✓ | ✗ | ✗ |
| codex → claude-code | ✓ | ✓ | ✓ |
| codex → opencode | ✓ | ✓ | ✓ |
| codex → kilo | ✓ | ✓ | ✓ |
| codex → cursor | ✓ | ✓ | ✗ |
| codex → gemini | ✓ | ✓ | ✗ |
| codex → copilot | ✓ | ✓ | ✗ |
| codex → crush | ✓ | ✓ | ✗ |
| codex → grok | ✓ | ✓ | ✗ |
| codex → omp | ✓ | ✓ | ✗ |
| codex → muse-code | ✓ | ✗ | ✗ |
| codex → pi | ✓ | ✗ | ✗ |
| copilot → claude-code | ✓ | ✓ | ✗ |
| copilot → opencode | ✓ | ✓ | ✗ |
| copilot → kilo | ✓ | ✓ | ✗ |
| copilot → cursor | ✓ | ✓ | ✗ |
| copilot → gemini | ✓ | ✓ | ✗ |
| copilot → codex | ✓ | ✓ | ✗ |
| copilot → crush | ✓ | ✓ | ✗ |
| copilot → grok | ✓ | ✓ | ✗ |
| copilot → omp | ✓ | ✓ | ✗ |
| copilot → muse-code | ✓ | ✗ | ✗ |
| copilot → pi | ✓ | ✗ | ✗ |
| crush → claude-code | ✓ | ✓ | ✗ |
| crush → opencode | ✓ | ✓ | ✗ |
| crush → kilo | ✓ | ✓ | ✗ |
| crush → cursor | ✓ | ✓ | ✗ |
| crush → gemini | ✓ | ✓ | ✗ |
| crush → codex | ✓ | ✓ | ✗ |
| crush → copilot | ✓ | ✓ | ✗ |
| crush → grok | ✓ | ✓ | ✗ |
| crush → omp | ✓ | ✓ | ✗ |
| crush → muse-code | ✓ | ✗ | ✗ |
| crush → pi | ✓ | ✗ | ✗ |
| grok → claude-code | ✓ | ✓ | ✗ |
| grok → opencode | ✓ | ✓ | ✗ |
| grok → kilo | ✓ | ✓ | ✗ |
| grok → cursor | ✓ | ✓ | ✗ |
| grok → gemini | ✓ | ✓ | ✗ |
| grok → codex | ✓ | ✓ | ✗ |
| grok → copilot | ✓ | ✓ | ✗ |
| grok → crush | ✓ | ✓ | ✗ |
| grok → omp | ✓ | ✓ | ✗ |
| grok → muse-code | ✓ | ✗ | ✗ |
| grok → pi | ✓ | ✗ | ✗ |
| omp → claude-code | ✓ | ✓ | ✗ |
| omp → opencode | ✓ | ✓ | ✗ |
| omp → kilo | ✓ | ✓ | ✗ |
| omp → cursor | ✓ | ✓ | ✗ |
| omp → gemini | ✓ | ✓ | ✗ |
| omp → codex | ✓ | ✓ | ✗ |
| omp → copilot | ✓ | ✓ | ✗ |
| omp → crush | ✓ | ✓ | ✗ |
| omp → grok | ✓ | ✓ | ✗ |
| omp → muse-code | ✓ | ✗ | ✗ |
| omp → pi | ✓ | ✗ | ✗ |
| muse-code → claude-code | ✓ | ✓ | ✗ |
| muse-code → opencode | ✓ | ✓ | ✗ |
| muse-code → kilo | ✓ | ✓ | ✗ |
| muse-code → cursor | ✓ | ✓ | ✗ |
| muse-code → gemini | ✓ | ✓ | ✗ |
| muse-code → codex | ✓ | ✓ | ✗ |
| muse-code → copilot | ✓ | ✓ | ✗ |
| muse-code → crush | ✓ | ✓ | ✗ |
| muse-code → grok | ✓ | ✓ | ✗ |
| muse-code → omp | ✓ | ✓ | ✗ |
| muse-code → pi | ✓ | ✗ | ✗ |
| pi → claude-code | ✓ | ✓ | ✗ |
| pi → opencode | ✓ | ✓ | ✗ |
| pi → kilo | ✓ | ✓ | ✗ |
| pi → cursor | ✓ | ✓ | ✗ |
| pi → gemini | ✓ | ✓ | ✗ |
| pi → codex | ✓ | ✓ | ✗ |
| pi → copilot | ✓ | ✓ | ✗ |
| pi → crush | ✓ | ✓ | ✗ |
| pi → grok | ✓ | ✓ | ✗ |
| pi → omp | ✓ | ✓ | ✗ |
| pi → muse-code | ✓ | ✗ | ✗ |

Notes:
- **Instructions** land at the target's own filename — `AGENTS.md` for most, `GEMINI.md` for Gemini CLI, `MUSE_CODE.md` for Muse Code, `.github/copilot-instructions.md` for Copilot CLI. Agent-specific names never leak into other targets.
- **MCP servers** are translated to each target's dialect: explicit vs inferred `type` (Cursor requires `type: "stdio"`, Gemini and Codex infer from shape, Kilo wants array-form `command` with `environment`, Crush defaults stdio but tags remote as `http`). Agents without a project MCP config (muse-code, pi) are honest ✗.
- **Model settings** flow only where the target has a real field: `model` (+`permissions` for claude-code, `maxTokens` for kilo) in JSON/JSONC configs, `model` in Codex's TOML. The other targets store no model-equivalent fields — those ✗s are by design, not gaps.

## Development

```bash
npm test          # run tests
npm run typecheck # type check
npm run build     # compile to dist/
bash scripts/smoke.sh  # smoke-test the compiled CLI (run npm run build first)
```

Maintainers: see [RELEASING.md](RELEASING.md) for the release flow and
`NPM_TOKEN` setup. Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
