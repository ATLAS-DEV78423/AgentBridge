#!/usr/bin/env node

import { showHelp } from './commands/help.js';
import { executeScan } from './commands/scan.js';

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
  case 'doctor':
  case 'diff':
  case 'plan':
  case 'export':
  case 'import':
  case 'apply':
  case 'rollback':
  case 'verify':
    console.log(`Command "${command}" not yet implemented.`);
    process.exit(1);
  default:
    console.error(`Unknown command: ${command}`);
    console.log('Run "agent-migrate --help" for usage.');
    process.exit(1);
}
