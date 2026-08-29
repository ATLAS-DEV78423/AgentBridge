export const HELP_TEXT = `
Usage:
  agent-migrate <command> [options]

Quick start:
  agent-migrate migrate claude-code opencode    One-step migration

Commands:
  scan [path]                     Scan directory for agent configs
  plan <source> <target> [path]   Show migration compatibility report
  diff <source> <target> [path]   Preview file changes
  migrate <source> <target> [path] Scan → plan → apply in one step
  apply <source> <target> [path]  Apply a migration
  apply <source> <target> [path] --dry-run  Preview without writing
  rollback <path> <migration-id>  Rollback a migration

Supported agents:
  claude-code                     Claude Code
  opencode                        OpenCode
  kilo                            Kilo Code
`;

export function showHelp(): void {
  console.log(HELP_TEXT);
}
