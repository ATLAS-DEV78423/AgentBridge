import fs from 'node:fs/promises';
import path from 'node:path';
import { verifyMigration } from '../../core/verification/verify.js';
import { output, OutputFormat } from '../output/formatter.js';

export async function executeVerify(migrationDir: string, fmt: OutputFormat = 'human'): Promise<void> {
  try {
    await fs.access(migrationDir);
  } catch {
    console.error(`Migration directory not found: ${migrationDir}`);
    process.exit(1);
  }

  let manifest: { files?: { path: string; expectedHash?: string }[]; resources?: unknown[] } = {};
  try {
    manifest = JSON.parse(await fs.readFile(path.join(migrationDir, 'migration-manifest.json'), 'utf-8'));
  } catch { /* no manifest */ }

  const files = manifest.files || [];
  if (files.length === 0) {
    // No manifest — check only agent config files, not all files in directory
    const agentFiles = ['AGENTS.md', 'CLAUDE.md', 'opencode.json', 'opencode.jsonc'];
    for (const name of agentFiles) {
      const filePath = path.join(migrationDir, name);
      try {
        await fs.access(filePath);
        files.push({ path: name });
      } catch { /* not found, skip */ }
    }
  }

  const report = await verifyMigration(path.basename(migrationDir), migrationDir, files, (manifest.resources || []) as any[]);

  if (fmt === 'json') {
    output({ success: report.success, command: 'verify', data: report });
  } else {
    console.log(`\nVerification: ${report.migrationId}`);
    console.log(`  Time: ${report.verifiedAt}\n`);
    console.log('Files:');
    for (const file of report.files) {
      console.log(`  ${file.status === 'FAILED' ? '✗' : '✓'} ${path.relative(migrationDir, file.path)} - ${file.message}`);
    }
    if (report.resources.length > 0) {
      console.log('\nResources:');
      for (const r of report.resources) {
        console.log(`  ${r.status === 'FAILED' ? '✗' : '✓'} ${r.name} (${r.type}) - ${r.message}`);
      }
    }
    if (report.warnings.length > 0) {
      console.log('\nWarnings:');
      for (const w of report.warnings) console.log(`  ⚠ ${w}`);
    }
    console.log(`\nResult: ${report.success ? 'PASSED' : 'FAILED'}`);
  }

  process.exit(report.success ? 0 : 1);
}
