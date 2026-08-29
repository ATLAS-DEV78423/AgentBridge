#!/usr/bin/env node

import { printBanner } from './banner.js';
import { showHelp } from './commands/help.js';
import { executeScan } from './commands/scan.js';
import { executePlan } from './commands/plan.js';
import { executeDiff } from './commands/diff.js';
import { executeRollback } from './commands/rollback.js';
import { executeMigrate } from './commands/migrate.js';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  printBanner();
  showHelp();
  process.exit(0);
}

const command = args[0];

printBanner();

switch (command) {
  case 'scan': {
    const path = args[1] || '.';
    executeScan(path).catch(err => { console.error('Error:', err.message); process.exit(1); });
    break;
  }
  case 'plan': {
    const source = args[1], target = args[2], path = args[3] || '.';
    if (!source || !target) { console.error('Usage: agent-migrate plan <source> <target> [path]'); process.exit(2); }
    executePlan(source, target, path).catch(err => { console.error('Error:', err.message); process.exit(1); });
    break;
  }
  case 'diff': {
    const source = args[1], target = args[2], path = args[3] || '.';
    if (!source || !target) { console.error('Usage: agent-migrate diff <source> <target> [path]'); process.exit(2); }
    executeDiff(source, target, path).catch(err => { console.error('Error:', err.message); process.exit(1); });
    break;
  }
  case 'apply': {
    const source = args[1], target = args[2], path = args[3] || '.';
    const dryRun = args.includes('--dry-run');
    if (!source || !target) { console.error('Usage: agent-migrate apply <source> <target> [path] [--dry-run]'); process.exit(2); }
    executeMigrate(source, target, path, dryRun).catch(err => { console.error('Error:', err.message); process.exit(1); });
    break;
  }
  case 'rollback': {
    const path = args[1] || '.', migrationId = args[2];
    if (!migrationId) { console.error('Usage: agent-migrate rollback <path> <migration-id>'); process.exit(2); }
    executeRollback(path, migrationId).catch(err => { console.error('Error:', err.message); process.exit(1); });
    break;
  }
  case 'migrate': {
    const source = args[1], target = args[2], path = args[3] || '.';
    if (!source || !target) { console.error('Usage: agent-migrate migrate <source> <target> [path]'); process.exit(2); }
    executeMigrate(source, target, path).catch(err => { console.error('Error:', err.message); process.exit(1); });
    break;
  }
  default:
    console.error(`Unknown command: ${command}`);
    console.log('Run "agent-migrate --help" for usage.');
    process.exit(2);
}
