import { AgentAdapter } from '../../core/scanner/scanner.js';
import { detectOpenCode } from './detector.js';
import { scanOpenCodeProject } from './scanner.js';

export const opencodeAdapter: AgentAdapter = {
  id: 'opencode',
  detect: detectOpenCode,
  scanProject: scanOpenCodeProject
};

export { detectOpenCode } from './detector.js';
export { scanOpenCodeProject } from './scanner.js';
