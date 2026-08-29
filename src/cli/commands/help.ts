export const HELP_TEXT = `
agent-migrate - Cross-agent migration tool

Usage:
  agent-migrate <command> [options]

Commands:
  scan [path]                     Scan current directory for agent configs
  plan <source> <target> [path]   Show migration compatibility report
  diff <source> <target> [path]   Show what files would change
  apply <plan>                    Apply a migration plan
  rollback <migration>            Rollback a migration

Options:
  --help, -h                      Show this help message

Supported agents:
  claude-code                     Claude Code
  opencode                        OpenCode
  kilo                            Kilo Code
`;

export function showHelp(): void {
  console.log(HELP_TEXT);
}
