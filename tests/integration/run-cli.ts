import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { createRequire } from 'node:module';

const run = promisify(execFile);

// `npx` is a .cmd shim on Windows; Node refuses to spawn .cmd/.bat without a
// shell (CVE-2024-27980 hardening), which broke every CLI-spawning test there.
// Spawning tsx's real entry through the current node binary is exactly what
// `npx tsx` resolves to anyway, and is shell- and platform-independent.
// ponytail: entry path + repo cwd are hardcoded — pass them per-call when a
// second consumer needs something else.
const tsxCli = createRequire(import.meta.url).resolve('tsx/cli');

/** Spawns the real CLI. Never rejects: a non-zero exit is data, not failure. */
export async function runCli(
  args: string[],
  cwd = path.resolve('.'),
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await run(process.execPath, [tsxCli, 'src/cli/main.ts', ...args], { cwd });
    return { code: 0, stdout, stderr };
  } catch (e: unknown) {
    const err = e as { code: number; stdout: string; stderr: string };
    return { code: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}
