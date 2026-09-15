import { AgentAdapter } from '../../core/scanner/scanner.js';
import { detectCodex, scanCodexProject } from './scanner.js';

export const codexAdapter: AgentAdapter = {
  id: 'codex',
  detect: detectCodex,
  scanProject: scanCodexProject,
};

export { detectCodex } from './scanner.js';
export { scanCodexProject } from './scanner.js';
