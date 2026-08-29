import { AgentAdapter } from '../core/scanner/scanner.js';
import { claudeAdapter } from './claude-code/index.js';
import { openCodeAdapter } from './opencode/index.js';
import { kiloAdapter } from './kilo/index.js';

export const adapters: Record<string, AgentAdapter> = {
  'claude-code': claudeAdapter,
  'opencode': openCodeAdapter,
  'kilo': kiloAdapter,
};

export const adapterList: AgentAdapter[] = [claudeAdapter, openCodeAdapter, kiloAdapter];

export const adapterLabels: { adapter: AgentAdapter; label: string }[] = [
  { adapter: claudeAdapter, label: 'Claude Code' },
  { adapter: openCodeAdapter, label: 'OpenCode' },
  { adapter: kiloAdapter, label: 'Kilo Code' },
];
