import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';

const directory = await mkdtemp(join(tmpdir(), 'down-to-duck-strict-gate-'));
after(() => rm(directory, { recursive: true, force: true }));
const gate = fileURLToPath(new URL('./strict-node-tests.mjs', import.meta.url));
// Each child is a separate CLI invocation, not a nested node:test run.
const environment = { ...process.env };
delete environment.NODE_TEST_CONTEXT;
for (const [name, source, succeeds, evidence] of [
  ['pass', "test('complete', () => {});", true, /# pass 1/],
  ['skip', "test.skip('missing evidence', () => {});", false, /# skipped 1/],
  ['todo', "test.todo('unfinished evidence');", false, /# todo 1/],
  ['failure', "test('broken', () => { throw new Error('expected fixture failure'); });", false, /# fail 1/],
  ['cancelled', "test('never completes', { timeout: 20 }, () => new Promise(() => {}));", false, /# cancelled 1/],
  ['empty', '', false, /requires explicit test file paths/],
]) {
  test(`strict phase gate ${succeeds ? 'accepts' : 'rejects'} a real ${name} test run`, async () => {
    const path = join(directory, `${name}.test.mjs`);
    await writeFile(path, `import test from 'node:test';\n${source}\n`);
    const result = spawnSync(process.execPath, name === 'empty' ? [gate] : [gate, path], { encoding: 'utf8', env: environment, timeout: 10_000 });
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(result.status === 0, succeeds, result.stdout + result.stderr);
    assert.match(result.stdout + result.stderr, evidence, 'each fixture reaches its intended runner outcome');
  });
}
