import { AgentAdapter, ScanContext } from '../../core/scanner/scanner.js';
import { detectClaude } from './detector.js';
import { scanClaudeProject } from './scanner.js';

export const claudeAdapter: AgentAdapter = {
  id: 'claude-code',
  detect: detectClaude,
  scanProject: scanClaudeProject
};

export { detectClaude } from './detector.js';
export { scanClaudeProject } from './scanner.js';
