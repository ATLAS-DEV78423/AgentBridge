import fs from 'node:fs';
import path from 'node:path';
import { adapters } from '../../adapters/registry.js';
import { normalizeBundle } from '../../core/normalize/normalizer.js';
import { evaluateCompatibility } from '../../core/compatibility/engine.js';
import { getRulesForMigration } from '../../registry/rules.js';
import { writeOpenCodeFiles } from '../../adapters/opencode/writer.js';
import { createTransaction, applyTransaction } from '../../core/transaction/transaction.js';

const DEBOUNCE_MS = 500;

const WATCH_PATTERNS: Record<string, string[]> = {
  'claude-code': ['AGENTS.md', 'CLAUDE.md', '.claude'],
  'opencode': ['AGENTS.md', 'opencode.jsonc'],
  'kilo': ['AGENTS.md', '.kilo'],
};

function getWatchPaths(sourceAgent: string, projectPath: string): string[] {
  const patterns = WATCH_PATTERNS[sourceAgent] || ['AGENTS.md'];
  return patterns.map(p => path.join(projectPath, p));
}

async function sync(source: string, target: string, projectPath: string): Promise<boolean> {
  const sourceAdapter = adapters[source];
  if (!sourceAdapter) return false;

  try {
    const bundle = await sourceAdapter.scanProject({ root: projectPath });
    const resources = normalizeBundle(bundle);
    const rules = getRulesForMigration(source, target);

    let targetFiles;
    if (target === 'opencode') {
      targetFiles = writeOpenCodeFiles(resources);
    } else {
      return false;
    }

    const ops = targetFiles
      .filter(f => f.action !== 'skip')
      .map(f => ({
        id: `op-${f.path}`,
        type: f.action as 'create' | 'modify',
        targetPath: f.path,
        content: f.content
      }));

    if (ops.length === 0) return false;

    const tx = createTransaction(ops);
    await applyTransaction(tx, projectPath);
    return true;
  } catch {
    return false;
  }
}

export async function executeWatch(
  source: string,
  target: string,
  projectPath: string
): Promise<void> {
  const sourceAdapter = adapters[source];
  if (!sourceAdapter) {
    console.error(`Unknown source agent: ${source}. Supported: ${Object.keys(adapters).join(', ')}`);
    process.exit(1);
  }
  if (!adapters[target]) {
    console.error(`Unknown target agent: ${target}. Supported: ${Object.keys(adapters).join(', ')}`);
    process.exit(1);
  }

  const watchPaths = getWatchPaths(source, projectPath);
  const exists = await Promise.all(watchPaths.map(p =>
    fs.promises.access(p).then(() => true, () => false)
  ));
  const activeWatchPaths = watchPaths.filter((_, i) => exists[i]);

  if (activeWatchPaths.length === 0) {
    console.error(`No ${source} config files found in ${projectPath}`);
    process.exit(1);
  }

  console.log(`Watching ${source} configs → ${target}`);
  console.log(`  Paths: ${activeWatchPaths.map(p => path.relative(projectPath, p)).join(', ')}`);
  console.log('  Press Ctrl+C to stop.\n');

  // Initial sync
  const synced = await sync(source, target, projectPath);
  if (synced) console.log('  [sync] Initial sync complete.');

  // Watch with debounce
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const watchers: fs.FSWatcher[] = [];

  for (const watchPath of activeWatchPaths) {
    try {
      const stat = await fs.promises.stat(watchPath);
      const watchTarget = stat.isDirectory() ? watchPath : path.dirname(watchPath);
      const watcher = fs.watch(watchTarget, { recursive: stat.isDirectory() }, (eventType) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          const now = new Date().toLocaleTimeString();
          const result = await sync(source, target, projectPath);
          if (result) console.log(`  [sync] ${now} — configs updated`);
        }, DEBOUNCE_MS);
      });
      watchers.push(watcher);
    } catch {
      // Path disappeared, skip
    }
  }

  // Graceful shutdown
  process.on('SIGINT', () => {
    for (const w of watchers) w.close();
    console.log('\nStopped watching.');
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    for (const w of watchers) w.close();
    process.exit(0);
  });
}
