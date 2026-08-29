import { migratePipeline } from '../../core/pipeline.js';

export async function executeMigrate(source: string, target: string, projectPath: string, dryRun = false): Promise<void> {
  try {
    await migratePipeline(source, target, projectPath, dryRun);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}
