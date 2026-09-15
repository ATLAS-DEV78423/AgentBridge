import { AgentAdapter } from '../core/scanner/scanner.js';
import { registerWriter } from '../core/writers.js';
import { claudeAdapter } from './claude-code/index.js';
import { writeClaudeFiles } from './claude-code/writer.js';
import { openCodeAdapter } from './opencode/index.js';
import { writeOpenCodeFiles } from './opencode/writer.js';
import { kiloAdapter } from './kilo/index.js';
import { writeKiloFiles } from './kilo/writer.js';
import { cursorAdapter } from './cursor/index.js';
import { writeCursorFiles } from './cursor/writer.js';
import { geminiAdapter } from './gemini/index.js';
import { writeGeminiFiles } from './gemini/writer.js';
import { codexAdapter } from './codex/index.js';
import { writeCodexFiles } from './codex/writer.js';
import {
  copilotAdapter, writeCopilotFiles,
  crushAdapter, writeCrushFiles,
  grokAdapter, writeGrokFiles,
  ompAdapter, writeOmpFiles,
  museCodeAdapter, writeMuseCodeFiles,
  piAdapter, writePiFiles,
} from './simple-agents.js';

/**
 * One entry per agent: the adapter (detector/scanner) and its target writer
 * are registered together, so the "registered adapter, forgot writer" bug
 * class is structurally impossible. registerWriter throws on duplicates,
 * guarding against double registration.
 */
const AGENT_REGISTRATIONS: [string, AgentAdapter, (resources: Parameters<Parameters<typeof registerWriter>[1]>[0]) => ReturnType<Parameters<typeof registerWriter>[1]>][] = [
  ['claude-code', claudeAdapter, writeClaudeFiles],
  ['opencode', openCodeAdapter, writeOpenCodeFiles],
  ['kilo', kiloAdapter, writeKiloFiles],
  ['cursor', cursorAdapter, writeCursorFiles],
  ['gemini', geminiAdapter, writeGeminiFiles],
  ['codex', codexAdapter, writeCodexFiles],
  ['copilot', copilotAdapter, writeCopilotFiles],
  ['crush', crushAdapter, writeCrushFiles],
  ['grok', grokAdapter, writeGrokFiles],
  ['omp', ompAdapter, writeOmpFiles],
  ['muse-code', museCodeAdapter, writeMuseCodeFiles],
  ['pi', piAdapter, writePiFiles],
];

export const adapters: Record<string, AgentAdapter> = {};

for (const [id, adapter, writeFn] of AGENT_REGISTRATIONS) {
  adapters[id] = adapter;
  registerWriter(id, writeFn);
}
