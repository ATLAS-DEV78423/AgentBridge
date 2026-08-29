export const HELP_TEXT = `
agent-migrate - Cross-agent migration tool

Usage:
  agent-migrate <command> [options]

Quick start:
  agent-migrate migrate claude-code opencode    One-step migration

Commands:
  scan [path]                     Scan directory for agent configs
  plan <source> <target> [path]   Show migration compatibility report
  diff <source> <target> [path]   Preview file changes
  doctor [path] [--target <agent>] Validate environment
  export [agent] [path] [output]  Export config to portable bundle
  import <bundle>                 Import and validate a bundle
  migrate <source> <target> [path] Scan → plan → apply in one step
  apply <source> <target> [path]  Apply a migration
  apply <source> <target> [path] --dry-run  Preview without writing
  rollback <path> <migration-id>  Rollback a migration
  history [path]                  List past migrations
  verify [path]                   Verify migration results

Options:
  --help, -h                      Show this help message
  --json                          Output in JSON format

Supported agents:
  claude-code                     Claude Code
  opencode                        OpenCode
  kilo                            Kilo Code
`;

export function showHelp(): void {
  console.log(HELP_TEXT);
}
