# Contributing to AgentBridge

Thank you for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/ATLAS-DEV78423/AgentBridge.git
cd AgentBridge
npm install
```

## Running Tests

```bash
npm test           # Run all tests
npm run typecheck  # Type check
```

## Code Style

- TypeScript strict mode
- Follow existing patterns
- Keep files focused (single responsibility)
- No unnecessary abstractions

## TDD Approach

1. Write failing test
2. Run test to verify failure
3. Write minimal implementation
4. Run test to verify pass
5. Commit

## Adding a New Agent Adapter

1. For standard JSON-config/instruction agents: define the adapter and writer using `makeJsonAgent` and `makeJsonWriter` in `src/adapters/simple-agents.ts`. For bespoke dialect agents, create `src/adapters/<agent-name>/` (detector, scanner, writer).
2. Register the adapter and writer in `AGENT_REGISTRATIONS` in `src/adapters/registry.ts`.
3. Add the agent's schema facts to `SPECS` and its instructions to `INSTRUCTION_FILES` in `src/core/doctor.ts`.
4. Add unit and integration tests under `tests/unit/adapters/` and `tests/integration/`.
5. Add the agent to `scripts/sweep.ts` and update the compatibility matrix in `README.md`.

## Commit Messages

Use conventional commits:

- `feat: add new feature`
- `fix: bug fix`
- `docs: documentation`
- `test: add tests`
- `refactor: code cleanup`

## Pull Requests

1. Fork the repository
2. Create feature branch
3. Add tests for changes
4. Ensure all tests pass
5. Submit pull request

## License

By contributing, you agree that your contributions will be licensed under MIT License.
