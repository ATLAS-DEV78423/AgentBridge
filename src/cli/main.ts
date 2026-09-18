#!/usr/bin/env node

import { printBanner } from './banner.js';
import { showHelp } from './commands/help.js';
import { executeScan } from './commands/scan.js';
import { executePlan } from './commands/plan.js';
import { executeDiff } from './commands/diff.js';
import { executeRollback } from './commands/rollback.js';
import { executeMigrate } from './commands/migrate.js';
import { executeMigrateAll } from './commands/migrate-all.js';
import { executeDoctor } from './commands/doctor.js';
import { executeFix } from './commands/fix.js';

// Tolerate closed pipes (agent-migrate scan | head): Node throws EPIPE on
// pending console writes otherwise, crashing with a stack trace.
process.stdout?.on?.('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EPIPE') process.exit(0);
  throw err;
});

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  printBanner();
  showHelp();
  process.exit(0);
}

const command = args[0];

/**
 * Positional arg extraction that skips well-known flags so
 * `migrate s t --dry-run` doesn't parse `--dry-run` as the path.
 */
function positional(flags: string[] = ['--dry-run']): (i: number) => string | undefined {
  const positionals = args.slice(1).filter(a => !flags.includes(a));
  return (i: number) => positionals[i];
}

printBanner();

function fail(message: string, code: number): never {
  console.error(message);
  process.exit(code);
}

function checkPair(source?: string, target?: string): void {
  if (!source || !target) return; // arity handled per-command below
  if (source === target) fail(`Error: source and target are the same agent (${source}); nothing to migrate.`, 2);
}

switch (command) {
  case 'scan': {
    executeScan(positional()(0) || '.').catch(err => { console.error('Error:', err.message); process.exit(1); });
    break;
  }
  case 'plan': {
    const p = positional();
    const source = p(0), target = p(1), path = p(2) || '.';
    if (!source || !target) fail('Usage: agent-migrate plan <source> <target> [path]', 2);
    checkPair(source, target);
    executePlan(source, target, path).catch(err => { console.error('Error:', err.message); process.exit(1); });
    break;
  }
  case 'diff': {
    const p = positional();
    const source = p(0), target = p(1), path = p(2) || '.';
    if (!source || !target) fail('Usage: agent-migrate diff <source> <target> [path]', 2);
    checkPair(source, target);
    executeDiff(source, target, path).catch(err => { console.error('Error:', err.message); process.exit(1); });
    break;
  }
  case 'rollback': {
    const p = positional();
    const path = p(0) || '.', migrationId = p(1);
    if (!migrationId) fail('Usage: agent-migrate rollback <path> <migration-id>', 2);
    executeRollback(path, migrationId).catch(err => { console.error('Error:', err.message); process.exit(1); });
    break;
  }
  case 'migrate': {
    const p = positional();
    const source = p(0), target = p(1), path = p(2) || '.';
    const dryRun = args.includes('--dry-run');
    if (!source || !target) fail('Usage: agent-migrate migrate <source> <target> [path] [--dry-run]', 2);
    checkPair(source, target);
    executeMigrate(source, target, path, dryRun).catch(err => { console.error('Error:', err.message); process.exit(1); });
    break;
  }
  case 'doctor': {
    executeDoctor(positional()(0) || '.').catch(err => { console.error('Error:', err.message); process.exit(1); });
    break;
  }
  case 'fix': {
    executeFix(positional()(0) || '.', args.includes('--dry-run')).catch(err => { console.error('Error:', err.message); process.exit(1); });
    break;
  }
  case 'migrate-all': {
    const p = positional();
    const source = p(0), path = p(1) || '.';
    const dryRun = args.includes('--dry-run');
    if (!source) fail('Usage: agent-migrate migrate-all <source> [path] [--dry-run]', 2);
    executeMigrateAll(source, path, dryRun).catch(err => { console.error('Error:', err.message); process.exit(1); });
    break;
  }
  case 'help':
    showHelp();
    break;
  default:
    fail(`Unknown command: ${command}\nRun "agent-migrate --help" for usage.`, 2);
}
