import { AgentAdapter } from '../core/scanner/scanner.js';
import { claudeAdapter } from './claude-code/index.js';
import { openCodeAdapter } from './opencode/index.js';
import { kiloAdapter } from './kilo/index.js';
import { registerWriter } from '../core/writers.js';
import { writeOpenCodeFiles } from './opencode/writer.js';

export const adapters: Record<string, AgentAdapter> = {
  'claude-code': claudeAdapter,
  'opencode': openCodeAdapter,
  'kilo': kiloAdapter,
};



// Register target writers
registerWriter('opencode', writeOpenCodeFiles);
