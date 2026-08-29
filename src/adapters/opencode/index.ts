import { AgentAdapter } from '../../core/scanner/scanner.js';
import { detectOpenCode } from './detector.js';
import { scanOpenCodeProject } from './scanner.js';

export const openCodeAdapter: AgentAdapter = {
  id: 'opencode',
  detect: detectOpenCode,
  scanProject: scanOpenCodeProject
};
