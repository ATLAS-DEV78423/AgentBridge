import fs from 'node:fs/promises';
import path from 'node:path';
import { doctor, DoctorAgentReport } from './doctor.js';
import { parseJsonc } from './jsonc.js';
import { createTransaction, applyTransaction, Transaction, TransactionOperation } from './transaction/transaction.js';

/**
 * The safe auto-fixes:
 *
 * 1. A strict-JSON config that fails only because of comments/trailing
 *    commas is rewritten comment-free in place — preserves every byte of
 *    data and keeps the agent reading its own documented path (renaming to
 *    .jsonc would NOT be safe: e.g. Claude Code only reads settings.json).
 *
 * 2. Divergent project-general instruction files (AGENTS.md / GEMINI.md /
 *    MUSE_CODE.md) are synced from AGENTS.md, the convention every agent
 *    here reads. Each written file is backed up by the transaction.
 *
 * Everything else doctor reports (schema problems like a missing transport
 * type, wrong MCP key shapes, unparseable files) changes behavior, so a
 * human decides those.
 */
export type PlannedChange = {
  file: string;
  kind: 'rewrite-comment-free' | 'sync-from-AGENTS.md';
  before: string;
  after: string;
};

export async function fixProject(
  projectPath: string,
  opts: { dryRun?: boolean } = {},
): Promise<{ txId: string | null; fixes: string[]; changes: PlannedChange[]; reports: DoctorAgentReport[] }> {
  const reports = await doctor(projectPath);
  const planned: { op: TransactionOperation; kind: PlannedChange['kind']; before: string }[] = [];

  const readFile = (rel: string) =>
    fs.readFile(path.join(projectPath, rel), 'utf-8').catch(() => null);

  for (const report of reports) {
    for (const problem of report.problems) {
      // 1. Commented strict-JSON config → rewrite comment-free in place.
      if (problem.message.includes('comments or trailing commas')) {
        const raw = await readFile(problem.file);
        if (raw === null) continue;

        let doc: unknown;
        try {
          doc = parseJsonc(raw);
        } catch { continue; } // not actually comment-fixable — leave it

        planned.push({
          op: { type: 'create', targetPath: problem.file, content: JSON.stringify(doc, null, 2) + '\n' },
          kind: 'rewrite-comment-free',
          before: raw,
        });
        continue;
      }

      // 2. Divergent project instructions → sync from AGENTS.md.
      if (report.agent === 'project' && problem.message.includes('instruction files diverge')) {
        const source = await readFile('AGENTS.md');
        if (source === null) continue; // no AGENTS.md to sync from — human decides

        const diverged = problem.message.match(/AGENTS\.md and ([\w./-]+) differ/);
        if (!diverged) continue;
        const target = diverged[1];
        if (planned.some(p => p.op.targetPath === target)) continue;

        const before = await readFile(target);
        if (before === null) continue;
        planned.push({
          op: { type: 'create', targetPath: target, content: source },
          kind: 'sync-from-AGENTS.md',
          before,
        });
      }
    }
  }

  if (planned.length === 0) return { txId: null, fixes: [], changes: [], reports };

  const changes: PlannedChange[] = planned.map(p => ({
    file: p.op.targetPath,
    kind: p.kind,
    before: p.before,
    after: p.op.content,
  }));

  if (opts.dryRun) {
    return { txId: null, fixes: planned.map(p => p.op.targetPath), changes, reports };
  }

  const tx: Transaction = createTransaction(planned.map(p => p.op));
  await applyTransaction(tx, projectPath);
  return { txId: tx.id, fixes: planned.map(p => p.op.targetPath), changes, reports };
}
