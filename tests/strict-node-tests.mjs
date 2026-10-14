// Node treats skipped/TODO tests as a successful process. Phase gates require
// completed behavioral evidence, so check its final TAP totals as well.
import { spawnSync } from 'node:child_process';

const files = process.argv.slice(2);
if (!files.length || files.some(file => file.startsWith('-'))) {
  console.error('Strict test gate requires explicit test file paths.');
  process.exit(2);
}
const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...files], {
  encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error || result.signal || result.status !== 0) {
  console.error('Strict test gate: runner failed.', result.error?.message ?? result.signal ?? result.status);
  process.exit(1);
}
const totals = Object.fromEntries(['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo'].map(name => {
  const matches = [...result.stdout.matchAll(new RegExp(`^# ${name} (\\d+)\\r?$`, 'gm'))];
  return [name, matches.length === 1 ? Number(matches[0][1]) : NaN];
}));
if (!Object.values(totals).every(Number.isSafeInteger) || totals.tests <= 0 || totals.pass !== totals.tests
    || totals.fail || totals.cancelled || totals.skipped || totals.todo) {
  console.error('Strict test gate requires nonempty, complete evidence with no failures, cancellations, skips, or TODOs.', totals);
  process.exit(1);
}
