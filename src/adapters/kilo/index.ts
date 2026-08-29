import { AgentAdapter } from '../../core/scanner/scanner.js';
import { detectKilo } from './detector.js';
import { scanKiloProject } from './scanner.js';

export const kiloAdapter: AgentAdapter = {
  id: 'kilo',
  detect: detectKilo,
  scanProject: scanKiloProject
};
