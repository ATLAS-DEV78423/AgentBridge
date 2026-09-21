export const HELP_TEXT = `
Usage:
  agent-migrate <command> [options]

Quick start:
  agent-migrate migrate claude-code opencode    One-step migration

Commands:
  scan [path]                     Scan directory for agent configs
  plan <source> <target> [path]   Show migration compatibility report
  diff <source> <target> [path]   Preview file changes
  migrate <source> <target> [path] [--dry-run]
                                  Scan → plan → write in one step
  migrate-all <source> [path]     Sync source config to every other detected agent
  doctor [path]                   Validate detected agent configs against their schemas
  fix [path]                      Apply safe auto-fixes (e.g. strip comments from strict-JSON configs)
  rollback <path> <migration-id>  Rollback a migration

Supported agents:
  claude-code                     Claude Code (source & target)
  opencode                        OpenCode (source & target)
  kilo                            Kilo Code (source & target)
  cursor                          Cursor (source & target)
  gemini                          Gemini CLI (source & target)
  codex                           OpenAI Codex (source & target)
  copilot                         Copilot CLI (source & target)
  crush                           Crush (source & target)
  grok                            Grok (source & target)
  omp                             Oh My Pi (source & target)
  muse-code                       Muse Code (instructions only)
  pi                              Pi (instructions only)
  cline                           Cline (instructions only)
`;

export function showHelp(): void {
  console.log(HELP_TEXT);
}
