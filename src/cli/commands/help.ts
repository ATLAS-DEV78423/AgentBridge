export const HELP_TEXT = `
Usage: agent-migrate <command> [options]

Commands:
  scan [path]           Scan directory for agent configurations
  doctor [path]         Diagnose environment health
  diff <src> <tgt> [p] Compare source and target agent configs
  plan <src> <tgt> [p] Generate migration plan
  export [path]         Export agent config as portable bundle
  import <bundle>       Import bundle to target agent
  apply <plan>          Apply a migration plan
  rollback <id>         Rollback a migration
  verify [id]           Verify migration integrity

Options:
  -h, --help            Show this help message
  --json                Machine-readable output
`;

export function showHelp(): void {
  console.log(HELP_TEXT.trim());
}
