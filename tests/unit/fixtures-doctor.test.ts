import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { doctor } from '../../src/core/doctor.js';

/**
 * Guards the repo's own config fixtures: any fixture that stops satisfying
 * an agent's documented schema (malformed JSON, wrong MCP key shape, transport
 * tag against policy) fails the build — since `npm test` runs in CI, no
 * workflow changes are needed to enforce it.
 */
describe('doctor over test fixtures', () => {
  it('every fixture passes doctor (fixture config regressions fail the build)', async () => {
    const fixturesDir = path.resolve('tests/fixtures');
    const dirs = (await fs.readdir(fixturesDir, { withFileTypes: true }))
      .filter(d => d.isDirectory())
      .map(d => d.name);
    expect(dirs.length, 'expected fixtures to exist').toBeGreaterThan(0);

    for (const name of dirs) {
      const report = await doctor(path.join(fixturesDir, name));
      const problems = report.flatMap(r =>
        r.problems.map(p => `${r.agent}: ${p.file}${p.line ? `:${p.line}` : ''}: ${p.message}`)
      );
      expect(problems, `fixture ${name} has config problems`).toEqual([]);
    }
  });
});
