# AgentBridge

Local-first, cross-platform migration tool for coding agent environments.

Safely move your coding agent configuration from one AI agent to another — Claude Code, OpenCode, Kilo, and more.

## Features

- **Scan** — detect agent configurations in any project
- **Plan** — analyze compatibility between source and target agents
- **Apply** — execute migrations with atomic writes and rollback
- **Verify** — confirm migrations succeeded
- **Rollback** — undo any migration safely

## Quick Start

```bash
npm install
npm run build
npx agentbridge --help
```

## Commands

```bash
agentbridge scan [path]           # Scan for agent configurations
agentbridge plan <src> <tgt> [p]  # Generate migration plan
agentbridge apply <plan>          # Apply a migration
agentbridge rollback <id>         # Undo a migration
```

## Development

```bash
npm test           # Run tests
npm run typecheck  # Type check
npm run build      # Build
```

## License

MIT
