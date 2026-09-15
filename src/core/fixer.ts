import fs from 'node:fs/promises';
import path from 'node:path';
import { doctor } from './doctor.js';
import { parseJsonc } from './jsonc.js';
import { createTransaction, applyTransaction, Transaction, TransactionOperation } from './transaction/transaction.js';

/**
 * The one safe auto-fix: a strict-JSON config that fails only because of
 * comments/trailing commas. Rewriting it comment-free in place preserves
 * every byte of data and keeps the agent reading its own documented path —
 * renaming to .jsonc would NOT be safe (e.g. Claude Code only reads
 * settings.json). Schema problems (missing type, wrong shapes) change
 * behavior, so a human decides those.
 */
export async function fixProject(projectPath: string): Promise<{ txId: string | null; fixes: string[] }> {
  const reports = await doctor(projectPath);
  const ops: TransactionOperation[] = [];

  for (const report of reports) {
    for (const problem of report.problems) {
      if (!problem.message.includes('comments or trailing commas')) continue;

      const fullPath = path.join(projectPath, problem.file);
      let raw: string;
      try {
        raw = await fs.readFile(fullPath, 'utf-8');
      } catch { continue; }

      let doc: unknown;
      try {
        doc = parseJsonc(raw);
      } catch { continue; } // not actually comment-fixable — leave it

      ops.push({ type: 'create' as const, targetPath: problem.file, content: JSON.stringify(doc, null, 2) + '\n' });
    }
  }

  if (ops.length === 0) return { txId: null, fixes: [] };

  const tx: Transaction = createTransaction(ops);
  await applyTransaction(tx, projectPath);
  return { txId: tx.id, fixes: ops.map(o => o.targetPath) };
}
