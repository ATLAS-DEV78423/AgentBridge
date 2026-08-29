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

1. Create `src/adapters/<agent-name>/detector.ts`
2. Create `src/adapters/<agent-name>/scanner.ts`
3. Create `src/adapters/<agent-name>/index.ts`
4. Add fixture in `tests/fixtures/`
5. Add integration test
6. Register in `src/cli/commands/scan.ts` and `plan.ts`

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
