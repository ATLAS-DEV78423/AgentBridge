import { doctor } from '../../core/doctor.js';
import { fixProject } from '../../core/fixer.js';

export async function executeFix(projectPath: string): Promise<void> {
  const { txId, fixes } = await fixProject(projectPath);

  if (fixes.length === 0) {
    // Nothing auto-fixable — surface what doctor still wants a human for.
    const reports = await doctor(projectPath);
    const remaining = reports.flatMap(r => r.problems.map(p => `${r.agent} → ${p.file}: ${p.message}`));
    if (remaining.length === 0) {
      console.log('\nNothing to fix — all detected agent configs are OK.');
      return;
    }
    console.log('\nNo safe automatic fixes. Problems needing a human decision:');
    for (const r of remaining) console.log(`  ✗ ${r}`);
    process.exit(1);
  }

  console.log(`\nFixed ${fixes.length} file(s):\n`);
  for (const f of fixes) console.log(`  ✓ ${f} — rewritten comment-free (comments are not valid in strict-JSON configs)`);

  console.log(`\nBackup: .agentbridge/backups/${txId}`);
  console.log(`\nRollback: agent-migrate rollback ${projectPath} ${txId}`);
  console.log('\nFix complete. Run "agent-migrate doctor" to see anything left for a human.');
}
