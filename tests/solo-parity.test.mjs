import assert from 'node:assert/strict';
import test from 'node:test';
import { PINNED_BASELINE_SHA, extractPinnedBaseline } from './solo-baseline.mjs';
import { runDifferentialScenario } from './solo-parity-snapshot.mjs';

const STEP = 1 / 120;

function arcadeTracer() {
  return [
    { kind: 'move', direction: 'forward' },
    { kind: 'step', count: 18 },
    { kind: 'move', direction: 'left' },
    { kind: 'step', count: 18 },
    { kind: 'move', direction: 'back' },
    { kind: 'step', count: 18 },
    { kind: 'move', direction: 'right' },
    { kind: 'step', count: 18 },
  ];
}

test('provenance: extracts the exact immutable a310a81 baseline', async () => {
  await using baseline = await extractPinnedBaseline();
  assert.equal(baseline.sha, PINNED_BASELINE_SHA);
  assert.match(baseline.sourceDirectory, /src$/);
});

test('Arcade tracer: compares independent pinned and working engines at every command and fixed step', async () => {
  const result = await runDifferentialScenario({
    name: 'Arcade tracer',
    seed: 0x10203040,
    mode: 'arcade',
    tape: arcadeTracer(),
    fixedStep: STEP,
  });
  assert.equal(result.points > 0, true);
  assert.equal(result.baselineSha, PINNED_BASELINE_SHA);
});

test('intentional drift: one-sided callback perturbation fails through the ordinary trace comparator', async () => {
  await assert.rejects(
    () => runDifferentialScenario({
      name: 'Arcade intentional callback drift',
      seed: 0x10203040,
      mode: 'arcade',
      tape: arcadeTracer(),
      fixedStep: STEP,
      perturbCurrent: { command: 0, step: 0, callback: 'onCoin' },
    }),
    error => /Arcade intentional callback drift.*command 0.*step 0.*callbacks\[0\]/s.test(error.message),
  );
});
