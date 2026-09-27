import fs from 'node:fs/promises';
import path from 'node:path';
import { doctor, DoctorAgentReport } from './doctor.js';
import { parseJsonc } from './jsonc.js';
import { createTransaction, applyTransaction, Transaction, TransactionOperation } from './transaction/transaction.js';

/**
 * Applies exactly the auto-fixes doctor marks as safe — the `fix` payload on
 * each problem, never a re-parse of its message:
 *
 * 1. `rewrite-comment-free` — a strict-JSON config that fails only because of
 *    comments/trailing commas is rewritten comment-free in place, preserving
 *    every byte of data and keeping the agent reading its own documented path
 *    (renaming to .jsonc would NOT be safe: e.g. Claude Code only reads
 *    settings.json).
 *
 * 2. `rewrite-alias-key` — a legacy MCP key (mcpServers in an opencode/kilo
 *    config that expects mcp) is renamed to the key the agent actually reads.
 *
 * 3. `sync-from-AGENTS.md` — divergent project-general instruction files
 *    (AGENTS.md / GEMINI.md / MUSE_CODE.md) are synced from AGENTS.md, the
 *    convention every agent here reads.
 *
 * Everything else doctor reports (schema problems like a missing transport
 * type, wrong MCP key shapes, unparseable files) changes behavior, so a
 * human decides those.
 */
export type PlannedChange = {
  file: string;
  kind: 'rewrite-comment-free' | 'sync-from-AGENTS.md' | 'rewrite-alias-key';
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
      const fix = problem.fix;
      if (!fix) continue; // needs a human decision

      if (fix.kind === 'sync-from-AGENTS.md') {
        const source = await readFile('AGENTS.md');
        const before = source === null ? null : await readFile(problem.file);
        // No AGENTS.md to sync from, or the diverged file is already gone.
        if (source === null || before === null) continue;
        if (planned.some(p => p.op.targetPath === problem.file)) continue;
        planned.push({ op: { targetPath: problem.file, content: source }, kind: fix.kind, before });
        continue;
      }

      const before = await readFile(problem.file);
      if (before === null) continue;

      let doc: Record<string, unknown>;
      try {
        doc = parseJsonc(before) as Record<string, unknown>;
      } catch { continue; } // not actually fixable — leave it for a human

      if (fix.kind === 'rewrite-alias-key') {
        // Only rename when the agent's real key is absent: if both are
        // present the file is ambiguous and a human picks the winner.
        if (!(fix.from in doc) || fix.to in doc) continue;
        doc[fix.to] = doc[fix.from];
        delete doc[fix.from];
      }

      planned.push({
        op: { targetPath: problem.file, content: JSON.stringify(doc, null, 2) + '\n' },
        kind: fix.kind,
        before,
      });
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
