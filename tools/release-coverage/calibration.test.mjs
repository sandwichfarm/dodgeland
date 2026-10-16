import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { instrumentSources, reportCoverage } from './instrument.mjs';

const sources = {
  'exercised.ts': `// Comment; declarations must not become executable lines.
export interface ErasedContract { value: number }
export type ErasedLabel = 'yes' | 'no';
export function choose(value: number): string {
  if (value > 0) return 'positive';
  return 'nonpositive';
}
export function neverCalled(): string { return 'never'; }
`,
  'unexecuted.ts': `export function untouched(flag: boolean): string {
  return flag ? 'true-branch' : 'false-branch';
}
`,
};
for (const [label, calls, expected] of [
  ['positive', [1], { lines: [1, 4], functions: [1, 3], branches: [1, 4], statements: [2, 5] }],
  ['negative', [-1], { lines: [2, 4], functions: [1, 3], branches: [1, 4], statements: [2, 5] }],
  ['both', [1, -1], { lines: [2, 4], functions: [1, 3], branches: [2, 4], statements: [3, 5] }],
]) {
  test(`exact semantic Node calibration: ${label}`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'release-calibration-'));
    try {
      for (const [name, source] of Object.entries(sources)) await writeFile(join(root, name), source);
      const inventory = instrumentSources(sources, root);
      globalThis.__coverage__ = {};
      const module = await import(`data:text/javascript;base64,${Buffer.from(inventory['exercised.ts'].code).toString('base64')}`);
      for (const call of calls) assert.equal(module.choose(call), call > 0 ? 'positive' : 'nonpositive');
      const result = await reportCoverage(inventory, [globalThis.__coverage__], join(root, 'report'));
      for (const [metric, pair] of Object.entries(expected)) assert.deepEqual([result.summary[metric].covered, result.summary[metric].total], pair, metric);
      assert.deepEqual(result.files.sort(), ['exercised.ts', 'unexecuted.ts'].map(name => join(root, name)).sort());
      const untouched = result.map.fileCoverageFor(join(root, 'unexecuted.ts')).toSummary();
      assert.equal(untouched.functions.covered, 0); assert.equal(untouched.functions.total, 1);
      const lines = result.map.fileCoverageFor(join(root, 'exercised.ts')).getLineCoverage();
      assert.deepEqual(Object.keys(lines).map(Number), [5, 6, 8]);
      const json = JSON.parse(await readFile(join(root, 'report', 'coverage-final.json'), 'utf8'));
      assert.equal(Object.keys(json).length, 2);
      assert.match(await readFile(join(root, 'report', 'lcov.info'), 'utf8'), /BRF:2/);
      assert.match(await readFile(join(root, 'report', 'text.txt'), 'utf8'), /All files/);
    } finally { delete globalThis.__coverage__; await rm(root, { recursive: true, force: true }); }
  });
}
