import { AgentAdapter } from '../core/scanner/scanner.js';
import { claudeAdapter } from './claude-code/index.js';
import { openCodeAdapter } from './opencode/index.js';
import { kiloAdapter } from './kilo/index.js';
import { cursorAdapter } from './cursor/index.js';
import { geminiAdapter } from './gemini/index.js';
import { codexAdapter } from './codex/index.js';
import { copilotAdapter, crushAdapter, grokAdapter, ompAdapter, museCodeAdapter, piAdapter } from './simple-agents.js';
import { registerWriter } from '../core/writers.js';
import { writeOpenCodeFiles } from './opencode/writer.js';
import { writeClaudeFiles } from './claude-code/writer.js';
import { writeKiloFiles } from './kilo/writer.js';
import { writeCursorFiles } from './cursor/writer.js';
import { writeGeminiFiles } from './gemini/writer.js';
import { writeCodexFiles } from './codex/writer.js';
import { writeCopilotFiles, writeCrushFiles, writeGrokFiles, writeOmpFiles, writeMuseCodeFiles, writePiFiles } from './simple-agents.js';

export const adapters: Record<string, AgentAdapter> = {
  'claude-code': claudeAdapter,
  'opencode': openCodeAdapter,
  'kilo': kiloAdapter,
  'cursor': cursorAdapter,
  'gemini': geminiAdapter,
  'codex': codexAdapter,
  'copilot': copilotAdapter,
  'crush': crushAdapter,
  'grok': grokAdapter,
  'omp': ompAdapter,
  'muse-code': museCodeAdapter,
  'pi': piAdapter,
};



// Register target writers
registerWriter('opencode', writeOpenCodeFiles);
registerWriter('claude-code', writeClaudeFiles);
registerWriter('kilo', writeKiloFiles);
registerWriter('cursor', writeCursorFiles);
registerWriter('gemini', writeGeminiFiles);
registerWriter('codex', writeCodexFiles);
registerWriter('copilot', writeCopilotFiles);
registerWriter('crush', writeCrushFiles);
registerWriter('grok', writeGrokFiles);
registerWriter('omp', writeOmpFiles);
registerWriter('muse-code', writeMuseCodeFiles);
registerWriter('pi', writePiFiles);
