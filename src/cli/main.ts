#!/usr/bin/env node

import { showHelp } from './commands/help.js';
import { executeScan } from './commands/scan.js';
import { executePlan } from './commands/plan.js';
import { executeDiff } from './commands/diff.js';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  showHelp();
  process.exit(0);
}

const command = args[0];

switch (command) {
  case 'scan': {
    const path = args[1] || '.';
    executeScan(path).catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
    break;
  }
  case 'plan': {
    const source = args[1];
    const target = args[2];
    const path = args[3] || '.';
    if (!source || !target) {
      console.error('Usage: agentbridge plan <source> <target> [path]');
      process.exit(1);
    }
    executePlan(source, target, path).catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
    break;
  }
  case 'diff': {
    const source = args[1];
    const target = args[2];
    const path = args[3] || '.';
    if (!source || !target) {
      console.error('Usage: agentbridge diff <source> <target> [path]');
      process.exit(1);
    }
    executeDiff(source, target, path).catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
    break;
  }
  case 'doctor':
  case 'export':
  case 'import':
  case 'apply':
  case 'rollback':
  case 'verify':
    console.log(`Command "${command}" not yet implemented.`);
    process.exit(1);
  default:
    console.error(`Unknown command: ${command}`);
    console.log('Run "agentbridge --help" for usage.');
    process.exit(1);
}
