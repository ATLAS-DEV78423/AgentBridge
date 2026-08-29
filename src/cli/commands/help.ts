export const HELP_TEXT = `
agent-migrate - Cross-agent migration tool

Usage:
  agent-migrate <command> [options]

Commands:
  scan [path]                     Scan current directory for agent configs
  plan <source> <target> [path]   Show migration compatibility report
  diff <source> <target> [path]   Show what files would change
  doctor [path] [--target <agent>] Validate environment and detect agents
  export [agent] [path] [output]  Export agent config to portable bundle
  import <bundle>                 Import and validate a bundle
  verify [path]                   Verify migration results
  apply <plan>                    Apply a migration plan
  rollback <migration>            Rollback a migration

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
