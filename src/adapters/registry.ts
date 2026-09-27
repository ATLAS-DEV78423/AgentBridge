import { AgentAdapter } from '../core/scanner/scanner.js';
import { registerWriter, WriteFn } from '../core/writers.js';
import { claudeAdapter } from './claude-code/scanner.js';
import { writeClaudeFiles } from './claude-code/writer.js';
import { openCodeAdapter } from './opencode/scanner.js';
import { writeOpenCodeFiles } from './opencode/writer.js';
import { kiloAdapter } from './kilo/scanner.js';
import { writeKiloFiles } from './kilo/writer.js';
import { codexAdapter } from './codex/scanner.js';
import { writeCodexFiles } from './codex/writer.js';
import {
  cursorAdapter, writeCursorFiles,
  geminiAdapter, writeGeminiFiles,
  copilotAdapter, writeCopilotFiles,
  crushAdapter, writeCrushFiles,
  grokAdapter, writeGrokFiles,
  ompAdapter, writeOmpFiles,
  museCodeAdapter, writeMuseCodeFiles,
  piAdapter, writePiFiles,
  clineAdapter, writeClineFiles,
  windsurfAdapter, writeWindsurfFiles,
} from './simple-agents.js';

/**
 * One entry per agent: the adapter (detector/scanner) and its target writer
 * are registered together, so the "registered adapter, forgot writer" bug
 * class is structurally impossible. registerWriter throws on duplicates,
 * guarding against double registration.
 */
const AGENT_REGISTRATIONS: [string, AgentAdapter, WriteFn][] = [
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
  ['cline', clineAdapter, writeClineFiles],
  ['windsurf', windsurfAdapter, writeWindsurfFiles],
];

export const adapters: Record<string, AgentAdapter> = {};

for (const [id, adapter, writeFn] of AGENT_REGISTRATIONS) {
  adapters[id] = adapter;
  registerWriter(id, writeFn);
}
