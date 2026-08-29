import fs from 'node:fs/promises';
import path from 'node:path';
import { verifyMigration } from '../../core/verification/verify.js';
import { output, OutputFormat } from '../output/formatter.js';

export async function executeVerify(
  migrationDir: string,
  fmt: OutputFormat = 'human'
): Promise<void> {
  // Check if migration directory exists
  try {
    await fs.access(migrationDir);
  } catch {
    console.error(`Migration directory not found: ${migrationDir}`);
    process.exit(1);
  }

  // Read migration manifest if it exists
  let manifest: { files?: { path: string; expectedHash?: string }[]; resources?: unknown[] } = {};
  const manifestPath = path.join(migrationDir, 'migration-manifest.json');
  try {
    const content = await fs.readFile(manifestPath, 'utf-8');
    manifest = JSON.parse(content);
  } catch {
    // No manifest, verify what we can find
  }

  // Discover files in migration directory
  const files: { path: string; expectedHash?: string }[] = manifest.files || [];

  // If no manifest files, discover all files
  if (files.length === 0) {
    const discovered = await discoverFiles(migrationDir);
    files.push(...discovered);
  }

  // Run verification
  const report = await verifyMigration(
    path.basename(migrationDir),
    migrationDir,
    files,
    (manifest.resources || []) as any[]
  );

  if (fmt === 'json') {
    output({
      success: report.success,
      command: 'verify',
      data: report
    });
  } else {
    console.log(`\nVerification: ${report.migrationId}`);
    console.log(`  Time: ${report.verifiedAt}`);
    console.log('');

    // File results
    console.log('Files:');
    for (const file of report.files) {
      const icon = file.status === 'FAILED' ? '✗' : '✓';
      console.log(`  ${icon} ${path.relative(migrationDir, file.path)} - ${file.message}`);
    }

    // Resource results
    if (report.resources.length > 0) {
      console.log('\nResources:');
      for (const resource of report.resources) {
        const icon = resource.status === 'FAILED' ? '✗' : '✓';
        console.log(`  ${icon} ${resource.name} (${resource.type}) - ${resource.message}`);
      }
    }

    // Warnings
    if (report.warnings.length > 0) {
      console.log('\nWarnings:');
      for (const warning of report.warnings) {
        console.log(`  ⚠ ${warning}`);
      }
    }

    console.log(`\nResult: ${report.success ? 'PASSED' : 'FAILED'}`);
  }

  process.exit(report.success ? 0 : 1);
}

async function discoverFiles(dir: string): Promise<{ path: string }[]> {
  const files: { path: string }[] = [];

  async function walk(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        files.push({ path: fullPath });
      }
    }
  }

  await walk(dir);
  return files;
}
