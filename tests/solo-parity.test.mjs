import assert from 'node:assert/strict';
import test from 'node:test';
import { PINNED_BASELINE_SHA, extractPinnedBaseline } from './solo-baseline.mjs';
import { runDifferentialMatrix, runDifferentialScenario } from './solo-parity-snapshot.mjs';

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

test('seeded movement and timing matrix: all released identities reach accepted, rejected, side, and back production moves', async () => {
  const homes = ['pond', 'orchard', 'neon', 'dunes', 'frost', 'bloom', 'shuffle'];
  const travelers = ['butter', 'sunny', 'pip', 'petal', 'beep', 'rust', 'pebble'];
  const scenarios = [];
  for (const schema of [1, 2, 3]) for (const home of homes) for (const mode of ['arcade', 'stroll']) {
    for (const gentle of [false, true]) for (const seed of [0, 0xffffffff]) for (const characterId of travelers) {
      scenarios.push({
        name: `matrix schema${schema}/${home}/${mode}/${gentle ? 'gentle' : 'standard'}/${seed}/${characterId}`,
        seed: { schema, seed, home, mode, gentle }, characterId,
        tape: [{ kind: 'move', direction: 'forward' }, { kind: 'move', direction: 'forward' },
          { kind: 'step', count: 18 }, { kind: 'move', direction: 'left' }, { kind: 'step', count: 18 },
          { kind: 'move', direction: 'back' }, { kind: 'step', count: 18 }, { kind: 'move', direction: 'right' }],
      });
    }
  }
  const results = await runDifferentialMatrix(scenarios);
  assert.equal(results.length, 1176, 'the pinned matrix must retain every schema/home/mode/gentle/uint32/traveler combination');
  assert.equal(results.every(result => result.points === 60), true, 'every operation and 1/120 step is compared');
  assert.equal(results.every(result => result.results.some(point => point.result === true)), true, 'real accepted moves execute');
  assert.equal(results.every(result => result.results.some(point => point.result === false)), true, 'real rejected moves execute while hopping');
  assert.equal(results.some(result => result.final.game.mode === 'stroll' && result.final.game.time > 0), true, 'stored stroll mode advances world time through the real runner');
});

function hazardFixture(game, gameModule, kind) {
  const lane = { ...gameModule.generateLane(game.seed, 0, game.home, game.gentle), index: 0, kind,
    phase: 0, speed: kind === 'river' ? .5 : 0, spacing: 20, length: kind === 'river' ? 5 : 1.15,
    blocked: [], decorations: [], coin: null };
  game.rows.set(0, lane);
  game.state = 'playing';
  game.x = game.fromX = kind === 'road' ? .975 : 0;
  game.y = game.fromY = 0;
}

function retainedPullFixture(game) {
  const lane = game.rows.get(0);
  lane.coin = .55;
  lane.coinActor = undefined;
  game.state = 'playing';
}

test('focused movement, hazard, health, and time arenas execute production paths at every fixed step', async () => {
  const scenarios = [
    { name: 'traffic contact latch arena', seed: 19, setup: (game, module) => hazardFixture(game, module, 'road'),
      tape: [{ kind: 'move', direction: 'left' }, { kind: 'step', count: 24 }] },
    { name: 'river drift and safe landing arena', seed: 23, setup: (game, module) => hazardFixture(game, module, 'river'),
      tape: [{ kind: 'step', count: 24 }] },
    { name: 'stroll real versus world timing arena', seed: 29, mode: 'stroll',
      tape: [{ kind: 'move', direction: 'forward' }, { kind: 'step', count: 24 }] },
    { name: 'retained coin pull survives source-lane pruning arena', seed: 30, setup: retainedPullFixture,
      tape: [{ kind: 'step', count: 1 }, ...Array.from({ length: 11 }, () => [
        { kind: 'move', direction: 'forward' }, { kind: 'step', count: 18 },
      ]).flat()] },
    ...[
      ['butter', 'water'], ['sunny', 'traffic'], ['pip', 'mob'], ['petal', 'traffic'],
      ['beep', 'train'], ['rust', 'mob'], ['pebble', 'wave'],
    ].map(([characterId, cause]) => ({ name: `${characterId} innate power arena`, seed: 31, characterId,
      setup: game => { game.state = 'playing'; }, tape: [{ kind: 'call', method: 'end', args: ['planned danger', cause, characterId === 'petal' ? 'rear' : undefined] }, { kind: 'step', count: 12 }] })),
  ];
  const results = await runDifferentialMatrix(scenarios);
  assert.equal(results.every(result => result.points > 1), true, 'focused fixtures execute and compare bounded real fixed steps');
  assert.equal(Array.isArray(results[0].final.game.gameFuture.touchingCars), true, 'collision latch is included in the full private snapshot');
  assert.equal(results[1].final.game.state, 'playing', 'the river fixture rides a real platform before drift');
  let expectedStrollTime = 0;
  for (let tick = 0; tick < 24; tick += 1) expectedStrollTime += STEP * .58;
  assert.equal(results[2].final.game.time, expectedStrollTime, 'stroll world time retains the exact .58 scale and arithmetic grouping');
  assert.equal(results[3].final.game.rows.some(({ row }) => row === 0), false, 'source terrain prunes through normal forward movement');
  assert.equal(results[3].final.game.attractedCoins.some(({ row }) => row === 0), true, 'the retained pull remains fully compared after pruning');
  assert.equal(results.slice(4).every(result => result.final.callbacks.some(event => event.name === 'onPower')), true, 'every released innate power is driven through Game.end production logic');
});
