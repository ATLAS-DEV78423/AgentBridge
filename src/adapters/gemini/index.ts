import { AgentAdapter } from '../../core/scanner/scanner.js';
import { detectGemini } from './detector.js';
import { scanGeminiProject } from './scanner.js';

export const geminiAdapter: AgentAdapter = {
  id: 'gemini',
  detect: detectGemini,
  scanProject: scanGeminiProject,
};

export { detectGemini } from './detector.js';
export { scanGeminiProject } from './scanner.js';
