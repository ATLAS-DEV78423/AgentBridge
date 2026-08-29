# AgentBridge

Local-first, cross-platform migration tool for coding agent environments.

Safely move your coding agent configuration from one AI agent to another — Claude Code, OpenCode, Kilo, and more.

## Features

- **Scan** — detect agent configurations in any project
- **Plan** — analyze compatibility between source and target agents
- **Apply** — execute migrations with atomic writes and rollback
- **Verify** — confirm migrations succeeded
- **Rollback** — undo any migration safely

## Supported Agents

| Agent | Status |
|-------|--------|
| Claude Code | ✅ Full support |
| OpenCode | ✅ Full support |
| Kilo | ✅ Full support |

## Quick Start

```bash
# Install
git clone https://github.com/ATLAS-DEV78423/AgentBridge.git
cd AgentBridge
npm install

# Scan for agent configurations
npx tsx src/cli/main.ts scan .

# Generate migration plan
npx tsx src/cli/main.ts plan claude-code opencode .
```

## Commands

```bash
agentbridge --help                 # Show help
agentbridge scan [path]            # Scan for agent configurations
agentbridge plan <src> <tgt> [p]   # Generate migration plan
agentbridge doctor [path]          # Diagnose environment
agentbridge diff <src> <tgt> [p]   # Compare configurations
agentbridge export [path]          # Export portable bundle
agentbridge import <bundle>        # Import bundle
agentbridge apply <plan>           # Apply migration
agentbridge rollback <id>          # Undo migration
agentbridge verify [id]            # Verify migration
```

## Migration Pipeline

```
scan → normalize → compat → plan → apply → verify → rollback
```

1. **Scan** — discover what agent configurations exist
2. **Normalize** — convert to canonical resource model
3. **Compatibility** — evaluate what can migrate
4. **Plan** — generate human-readable migration analysis
5. **Apply** — execute with atomic writes and backups
6. **Verify** — confirm migration succeeded
7. **Rollback** — undo if needed

## Development

```bash
npm test           # Run tests (53+ tests)
npm run typecheck  # Type check
npm run build      # Build for production
```

## Architecture

```
src/
├── cli/              # CLI commands
├── core/
│   ├── model/        # Canonical data types
│   ├── scanner/      # Scanner interface
│   ├── normalize/    # Bundle normalizer
│   ├── compatibility/ # Compatibility engine
│   └── filesystem/   # Atomic writes, backup, restore
├── adapters/
│   ├── claude-code/  # Claude Code scanner
│   ├── opencode/     # OpenCode scanner
│   └── kilo/         # Kilo scanner
└── registry/
    ├── capabilities.ts  # Agent support matrix
    └── rules.ts         # Compatibility rules
```

## Testing

Tests use Vitest with TDD approach:

- Unit tests for each module
- Integration tests for adapters
- Fixture-based testing with synthetic agent directories

## License

MIT License - see [LICENSE](LICENSE)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Acknowledgments

Built with TypeScript, Node.js, and Vitest.
