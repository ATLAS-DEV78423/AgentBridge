import fs from 'node:fs/promises';
import path from 'node:path';
import { doctor } from './doctor.js';
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
export async function fixProject(projectPath: string): Promise<{ txId: string | null; fixes: string[] }> {
  const reports = await doctor(projectPath);
  const ops: TransactionOperation[] = [];

  for (const report of reports) {
    for (const problem of report.problems) {
      // 1. Commented strict-JSON config → rewrite comment-free in place.
      if (problem.message.includes('comments or trailing commas')) {
        const fullPath = path.join(projectPath, problem.file);
        let raw: string;
        try {
          raw = await fs.readFile(fullPath, 'utf-8');
        } catch { continue; }

        let doc: unknown;
        try {
          doc = parseJsonc(raw);
        } catch { continue; } // not actually comment-fixable — leave it

        ops.push({ type: 'create', targetPath: problem.file, content: JSON.stringify(doc, null, 2) + '\n' });
        continue;
      }

      // 2. Divergent project instructions → sync from AGENTS.md.
      if (report.agent === 'project' && problem.message.includes('instruction files diverge')) {
        let source: string;
        try {
          source = await fs.readFile(path.join(projectPath, 'AGENTS.md'), 'utf-8');
        } catch { continue; } // no AGENTS.md to sync from — human decides

        const diverged = problem.message.match(/AGENTS\.md and ([\w./-]+) differ/);
        if (!diverged) continue;
        const target = diverged[1];
        const already = ops.find(o => o.targetPath === target);
        if (already) continue;
        ops.push({ type: 'create', targetPath: target, content: source });
      }
    }
  }

  if (ops.length === 0) return { txId: null, fixes: [] };

  const tx: Transaction = createTransaction(ops);
  await applyTransaction(tx, projectPath);
  return { txId: tx.id, fixes: ops.map(o => o.targetPath) };
}
