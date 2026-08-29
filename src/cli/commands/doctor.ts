import fs from 'node:fs/promises';
import path from 'node:path';
import { claudeAdapter } from '../../adapters/claude-code/index.js';
import { openCodeAdapter } from '../../adapters/opencode/index.js';
import { kiloAdapter } from '../../adapters/kilo/index.js';
import { AgentAdapter } from '../../core/scanner/scanner.js';
import { output, OutputFormat } from '../output/formatter.js';

type CheckResult = {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
};

const adapters: { adapter: AgentAdapter; label: string }[] = [
  { adapter: claudeAdapter, label: 'Claude Code' },
  { adapter: openCodeAdapter, label: 'OpenCode' },
  { adapter: kiloAdapter, label: 'Kilo Code' }
];

export async function executeDoctor(projectPath: string, target?: string, fmt: OutputFormat = 'human'): Promise<void> {
  const checks: CheckResult[] = [];

  // Check 1: Path exists
  try {
    await fs.access(projectPath);
    checks.push({ name: 'project-path', status: 'ok', message: `Path exists: ${projectPath}` });
  } catch {
    checks.push({ name: 'project-path', status: 'error', message: `Path not found: ${projectPath}` });
  }

  // Check 2: Detect agents
  for (const { adapter, label } of adapters) {
    const result = await adapter.detect({ root: projectPath });
    if (result.detected) {
      checks.push({ name: `detect-${adapter.id}`, status: 'ok', message: `${label} detected (${result.confidence} confidence)` });
    } else {
      checks.push({ name: `detect-${adapter.id}`, status: 'warning', message: `${label} not detected` });
    }
  }

  // Check 3: Target agent (if specified)
  if (target) {
    const targetAdapter = adapters.find(a => a.adapter.id === target);
    if (targetAdapter) {
      checks.push({ name: 'target-agent', status: 'ok', message: `Target agent ${targetAdapter.label} is supported` });
    } else {
      checks.push({ name: 'target-agent', status: 'error', message: `Unknown target agent: ${target}` });
    }
  }

  // Check 4: Node.js version
  const major = parseInt(process.version.slice(1));
  if (major >= 18) {
    checks.push({ name: 'node-version', status: 'ok', message: `Node.js ${process.version}` });
  } else {
    checks.push({ name: 'node-version', status: 'error', message: `Node.js ${process.version} (requires >=18)` });
  }

  // Output
  if (fmt === 'json') {
    output({
      success: checks.every(c => c.status !== 'error'),
      command: 'doctor',
      data: { path: projectPath, target, checks }
    });
  } else {
    console.log(`\nDoctor: ${projectPath}\n`);
    for (const check of checks) {
      const icon = check.status === 'ok' ? '✓' : check.status === 'warning' ? '⚠' : '✗';
      console.log(`  ${icon} ${check.message}`);
    }
    console.log('');
  }

  const hasErrors = checks.some(c => c.status === 'error');
  process.exit(hasErrors ? 1 : 0);
}
