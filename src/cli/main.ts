#!/usr/bin/env node

import { showHelp } from './commands/help.js';
import { executeScan } from './commands/scan.js';
import { executePlan } from './commands/plan.js';
import { executeDiff } from './commands/diff.js';
import { executeDoctor } from './commands/doctor.js';
import { setOutputFormat, OutputFormat } from './output/formatter.js';
import { ExitCodes } from './output/exit-codes.js';

const args = process.argv.slice(2);

// Parse --json flag
const jsonIndex = args.indexOf('--json');
const jsonMode = jsonIndex !== -1;
if (jsonMode) {
  setOutputFormat('json');
  args.splice(jsonIndex, 1);
}

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  showHelp();
  process.exit(ExitCodes.SUCCESS);
}

const command = args[0];
const fmt: OutputFormat = jsonMode ? 'json' : 'human';

switch (command) {
  case 'scan': {
    const path = args[1] || '.';
    executeScan(path).catch(err => {
      console.error('Error:', err.message);
      process.exit(ExitCodes.GENERAL_ERROR);
    });
    break;
  }
  case 'plan': {
    const source = args[1];
    const target = args[2];
    const path = args[3] || '.';
    if (!source || !target) {
      console.error('Usage: agent-migrate plan <source> <target> [path]');
      process.exit(ExitCodes.INVALID_ARGS);
    }
    executePlan(source, target, path).catch(err => {
      console.error('Error:', err.message);
      process.exit(ExitCodes.GENERAL_ERROR);
    });
    break;
  }
  case 'diff': {
    const source = args[1];
    const target = args[2];
    const path = args[3] || '.';
    if (!source || !target) {
      console.error('Usage: agent-migrate diff <source> <target> [path]');
      process.exit(ExitCodes.INVALID_ARGS);
    }
    executeDiff(source, target, path).catch(err => {
      console.error('Error:', err.message);
      process.exit(ExitCodes.GENERAL_ERROR);
    });
    break;
  }
  case 'doctor': {
    const path = args[1] || '.';
    const target = args[2];
    executeDoctor(path, target, fmt).catch(err => {
      console.error('Error:', err.message);
      process.exit(ExitCodes.GENERAL_ERROR);
    });
    break;
  }
  case 'apply':
  case 'rollback':
    console.log(`Command "${command}" not yet implemented.`);
    process.exit(ExitCodes.GENERAL_ERROR);
  default:
    console.error(`Unknown command: ${command}`);
    console.log('Run "agent-migrate --help" for usage.');
    process.exit(ExitCodes.INVALID_ARGS);
}
