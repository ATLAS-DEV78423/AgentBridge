import { AgentAdapter } from '../../core/scanner/scanner.js';
import { detectCursor } from './detector.js';
import { scanCursorProject } from './scanner.js';

export const cursorAdapter: AgentAdapter = {
  id: 'cursor',
  detect: detectCursor,
  scanProject: scanCursorProject,
};

export { detectCursor } from './detector.js';
export { scanCursorProject } from './scanner.js';
