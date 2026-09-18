import { AgentAdapter } from '../../core/scanner/scanner.js';
import { detectClaude } from './detector.js';
import { scanClaudeProject } from './scanner.js';

export const claudeAdapter: AgentAdapter = {
  id: 'claude-code',
  detect: detectClaude,
  scanProject: scanClaudeProject
};
