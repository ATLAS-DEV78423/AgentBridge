import { AgentAdapter } from '../core/scanner/scanner.js';
import { claudeAdapter } from './claude-code/index.js';
import { openCodeAdapter } from './opencode/index.js';
import { kiloAdapter } from './kilo/index.js';
import { cursorAdapter } from './cursor/index.js';
import { registerWriter } from '../core/writers.js';
import { writeOpenCodeFiles } from './opencode/writer.js';
import { writeClaudeFiles } from './claude-code/writer.js';
import { writeKiloFiles } from './kilo/writer.js';
import { writeCursorFiles } from './cursor/writer.js';

export const adapters: Record<string, AgentAdapter> = {
  'claude-code': claudeAdapter,
  'opencode': openCodeAdapter,
  'kilo': kiloAdapter,
  'cursor': cursorAdapter,
};



// Register target writers
registerWriter('opencode', writeOpenCodeFiles);
registerWriter('claude-code', writeClaudeFiles);
registerWriter('kilo', writeKiloFiles);
registerWriter('cursor', writeCursorFiles);
