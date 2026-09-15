import { doctor } from '../../core/doctor.js';

export async function executeDoctor(projectPath: string): Promise<void> {
  const reports = await doctor(projectPath);

  if (reports.length === 0) {
    console.log(`\nNo coding-agent configs detected in ${projectPath} — nothing to check.`);
    return;
  }

  console.log(`\nDoctor: ${projectPath}\n`);

  let errors = 0;
  let warnings = 0;
  for (const report of reports) {
    console.log(`━━ ${report.agent} ━━`);
    if (report.problems.length === 0) {
      console.log('  ✓ config OK');
    }
    for (const p of report.problems) {
      console.log(`  ${p.severity === 'error' ? '✗' : '~'} ${p.file ? `${p.file}: ` : ''}${p.message}`);
      if (p.severity === 'error') errors++;
      else warnings++;
    }
    console.log('');
  }

  console.log(`${reports.length} agent(s) checked: ${errors} error(s), ${warnings} warning(s).`);
  if (errors > 0) {
    console.log('Fix the errors above — migrate may skip or mangle these configs.');
    process.exit(1);
  }
}
