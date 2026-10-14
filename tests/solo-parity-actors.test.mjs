import assert from 'node:assert/strict';
import test from 'node:test';
import { runDifferentialMatrix, runDifferentialScenario } from './solo-parity-snapshot.mjs';

const STEP = 1 / 120;

function resultAt(scenario, command, step = 0) {
  const point = scenario.results.find(candidate => candidate.command === command && candidate.step === step);
  assert.ok(point, `${scenario.baselineSha}: command ${command}/${step} was compared`);
  return point.result;
}

function stageSchemaTwoActors(score) {
  return game => {
    game.state = 'playing';
    game.x = game.fromX = 0;
    game.y = game.fromY = game.maxY = score;
    game.time = 7;
    game.waveRow = -100;
    game.ensureRows();
    const traffic = [...game.rows.values()].filter(lane => lane.index >= score && lane.kind === 'road' && lane.actors);
    const platforms = [...game.rows.values()].filter(lane => lane.index >= score && lane.kind === 'river' && lane.actors);
    assert.ok(traffic.length > 0, `schema 2 at ${score} generates a real traffic actor lane`);
    assert.ok(platforms.length > 0, `schema 2 at ${score} generates a real platform actor lane`);
  };
}

function trafficAt(result, score) {
  const lane = result.final.game.rows.find(entry => entry.row >= score && entry.lane.kind === 'road' && entry.lane.actors?.slots?.length);
  assert.ok(lane, `actor progression ${score} retained a road pattern`);
  return lane.lane.actors;
}

function platformsAt(result, score) {
  const lane = result.final.game.rows.find(entry => entry.row >= score && entry.lane.kind === 'river' && entry.lane.actors?.slots?.length);
  assert.ok(lane, `actor progression ${score} retained a river platform pattern`);
  return lane.lane.actors;
}

test('differential actors: schema-two progression reaches real cars, trucks, sports, sizing, and speed tiers at 50/100/150/400', async () => {
  const scores = [50, 100, 150, 400];
  const results = await runDifferentialMatrix(scores.map(score => ({
    name: `actors schema-two progression at ${score}`,
    seed: { schema: 2, seed: 0, home: 'pond', mode: 'arcade', gentle: false },
    setup: stageSchemaTwoActors(score),
    fixedStep: STEP,
    keepTrace: true,
    tape: [{ kind: 'step', count: 24 }],
  })));

  const [at50, at100, at150, at400] = results.map((result, index) => trafficAt(result, scores[index]));
  const platforms = results.map((result, index) => platformsAt(result, scores[index]));
  assert.ok(at50.slots.every(actor => actor.kind === 'car'), '50 uses the real early all-car traffic pattern');
  assert.ok(at100.slots.some(actor => actor.kind === 'truck'), '100 introduces slow trucks');
  const trucks = at100.slots.filter(actor => actor.kind === 'truck'), cars = at100.slots.filter(actor => actor.kind === 'car');
  assert.ok(Math.max(...trucks.map(actor => actor.speedFactor)) < Math.min(...cars.map(actor => actor.speedFactor)), 'the introduced truck is materially slower than the contemporaneous cars');
  assert.ok(at150.slots.some(actor => actor.kind === 'sports' && actor.boost > actor.speedFactor), '150 introduces accelerated sports cars');
  assert.ok(at400.slots.some(actor => actor.kind === 'sports') && at400.slots.some(actor => actor.kind === 'truck'), '400 retains mixed high-tier species');
  assert.ok(Math.max(...at100.slots.map(actor => actor.length)) > Math.max(...at50.slots.map(actor => actor.length)), 'truck sizing exceeds the early car body');
  assert.ok(at400.slots.some(actor => actor.speedFactor !== 1 || actor.boost > actor.speedFactor), '400 retains the generated high-tier speed variation');
  assert.ok(platforms.every(pattern => new Set(pattern.slots.map(actor => actor.length)).size > 1), 'each scored tier reaches real varied log/platform lengths');
  assert.equal(results.every(result => result.points === 25), true, 'initial state and every fixed 1/120 update were compared');
});

function stageSportsThreshold(game, _gameModule, _catalog, actors) {
  game.state = 'playing';
  game.x = game.fromX = 0;
  game.y = game.fromY = game.maxY = 150;
  game.time = 0;
  game.waveRow = -100;
  game.ensureRows();
  const lane = game.rows.get(150);
  lane.kind = 'road'; lane.speed = 1; lane.phase = 0; lane.direction = 1; lane.blocked = []; lane.coin = null;
  lane.actors = actors.createActorPattern('traffic', [
    { kind: 'sports', variant: 0, length: 1.2, speedFactor: 1, boost: 2, gap: 2.5 },
  ], 3);
  assert.equal(lane.actors.slots[0].boost / lane.actors.slots[0].speedFactor, 2, 'controlled real pattern has a sports acceleration window');
}

test('differential actors: a real sports actor enters its accelerating state after the one-third crossing threshold', async () => {
  const scenario = await runDifferentialScenario({
    name: 'actors sports acceleration after one-third crossing',
    seed: { schema: 2, seed: 19, home: 'pond', mode: 'arcade', gentle: false },
    setup: stageSportsThreshold,
    fixedStep: STEP,
    keepTrace: true,
    tape: [{ kind: 'step', count: 960 }],
  });
  const accelerated = scenario.trace.flatMap(point => point.game.rows)
    .flatMap(entry => entry.lane.actorSamples ?? [])
    .filter(actor => actor.kind === 'sports' && actor.accelerating);
  assert.ok(accelerated.length > 0, 'Game snapshots reach the actual sports acceleration segment after the crossing threshold');
  assert.ok(accelerated.every(actor => actor.speed > 1), 'accelerating samples expose a live speed above their base lane speed');
  assert.equal(scenario.points, 961, 'all 960 fixed steps use the ordinary baseline/current comparator');
});

function stageLiveRebase(game, _gameModule, _catalog, actors) {
  game.state = 'playing';
  game.x = game.fromX = 0;
  game.y = game.fromY = game.maxY = 200;
  game.time = 11.25;
  game.waveRow = -100;
  game.ensureRows();
  const road = game.rows.get(200), river = game.rows.get(201);
  Object.assign(road, { kind: 'road', speed: 1.5, phase: .4, direction: 1, blocked: [], coin: null,
    actors: actors.createActorPattern('traffic', [{ kind: 'truck', variant: 0, length: 3, speedFactor: .6, gap: 3 }], 4) });
  Object.assign(river, { kind: 'river', speed: -1.25, phase: -.3, direction: -1, blocked: [], coin: null,
    actors: actors.createActorPattern('platforms', [{ kind: 'platform', variant: 0, length: 3.4, speedFactor: 1, gap: 1.1 }], 4) });
  game.syncEffects();
}

function changeLiveSpeeds(trafficSpeed, riverSpeed, label) {
  return {
    kind: 'fixture',
    apply(game) {
      const road = game.rows.get(200), river = game.rows.get(201);
      const before = [road, river].map(lane => ({ index: lane.index, actors: lane.actors ? lane.actors.slots.length : 0, sample: game.time }));
      const beforePositions = [road, river].map(lane => lane.actors ? lane.actors.slots.length : 0);
      game.run.effects.trafficSpeed = trafficSpeed;
      game.run.effects.riverSpeed = riverSpeed;
      game.syncEffects();
      const after = [road, river].map(lane => ({ index: lane.index, speed: lane.speed, motion: game.laneSpeeds.get(lane) }));
      assert.deepEqual(beforePositions, [1, 1], `${label} operates on retained live actor lanes`);
      assert.equal(after[0].motion.base, 1.5, `${label} retains the road base speed`);
      assert.equal(after[1].motion.base, -1.25, `${label} retains the river base speed`);
      return { label, before, after };
    },
  };
}

test('differential actors: Game.syncEffects rebases, freezes, and releases live actors without losing lane base/applied state', async () => {
  const scenario = await runDifferentialScenario({
    name: 'actors live speed rebase freeze and release',
    seed: { schema: 2, seed: 23, home: 'pond', mode: 'arcade', gentle: false },
    setup: stageLiveRebase,
    fixedStep: STEP,
    keepTrace: true,
    tape: [
      { kind: 'step', count: 12 },
      changeLiveSpeeds(.6, .8, 'slow'), { kind: 'step', count: 12 },
      changeLiveSpeeds(0, 0, 'freeze'), { kind: 'step', count: 12 },
      changeLiveSpeeds(1, 1, 'release'), { kind: 'step', count: 12 },
    ],
  });
  for (const [command, expected] of [[1, [1.5 * .6, -1.25 * .8]], [3, [0, 0]], [5, [1.5, -1.25]]]) {
    assert.deepEqual(resultAt(scenario, command).after.map(entry => entry.motion.applied), expected, `the ${resultAt(scenario, command).label} command preserves exact applied speeds`);
  }
  const frozen = scenario.trace.find(point => point.game.gameFuture.laneSpeeds.some(entry => entry.speed?.applied === 0));
  assert.ok(frozen, 'the full semantic adapter records a retained frozen lane state');
  const roadXs = point => point.game.rows.find(entry => entry.row === 200).lane.actorSamples.map(actor => actor.x);
  const beforeSlow = roadXs(scenario.trace[12]), afterSlow = roadXs(scenario.trace[13]);
  assert.ok(beforeSlow.every((x, index) => Math.abs(x - afterSlow[index]) < 1e-9), 'the slow rebase preserves actual actor positions at its live time');
  const frozenXs = scenario.trace.slice(26, 39).map(roadXs);
  assert.ok(frozenXs.every(xs => JSON.stringify(xs) === JSON.stringify(frozenXs[0])), 'the frozen real actor positions remain fixed across production updates');
  assert.equal(scenario.points, 52, 'each live rebase operation and every fixed step compare actor positions and lane speeds');
});

function stageMobArena(score, { blocked = false } = {}) {
  return game => {
    game.state = 'playing';
    game.x = game.fromX = 0;
    game.y = game.fromY = game.maxY = score;
    game.time = 45;
    game.waveRow = score - 20;
    game.ensureRows();
    for (const lane of game.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
    if (blocked) for (let row = score - 2; row <= score; row += 1) game.rows.get(row).blocked = [-5, -4, -3, -2, 2, 3, 4, 5];
  };
}

function injectMob(kind, x, y, phase = 'spawning', extra = {}) {
  return {
    kind: 'fixture',
    apply(game) {
      const mob = { id: 91, kind, x, y, fromX: x, fromY: y, targetX: x, targetY: y,
        phase, phaseLeft: phase === 'spawning' ? .01 : .01, phaseDuration: phase === 'spawning' ? .01 : .01, ...extra };
      game.mobs.length = 0;
      game.mobs.push(mob);
      assert.equal(game.mobs[0].kind, kind, `controlled ${kind} enters MobDirector through Game.update`);
      return { kind, phase: mob.phase, at: [mob.x, mob.y] };
    },
  };
}

function readyNextEncounter(score) {
  return {
    kind: 'fixture',
    apply(game) {
      game.mobs.length = 0;
      game.x = game.fromX = 0;
      game.y = game.fromY = game.maxY = score;
      game.waveRow = score - 20;
      game.ensureRows();
      for (const lane of game.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
      game.time = Math.max(game.time, game.mobDirector.nextSpawn);
      assert.ok(game.maxY - game.mobDirector.lastSpawnScore >= 24, `progress gate opens at ${score}`);
      return { score, time: game.time, nextSpawn: game.mobDirector.nextSpawn, lastSpawnScore: game.mobDirector.lastSpawnScore };
    },
  };
}

test('differential mobs: score/time/progress/cap/retry gates reach deterministic 160/320/480 production arrivals and Stroll remains disabled', async () => {
  const [blocked, progression, stroll] = await runDifferentialMatrix([
    { name: 'mobs retry gate at 160', seed: 7, setup: stageMobArena(160, { blocked: true }), fixedStep: STEP,
      tape: [{ kind: 'step', count: 1 }, { kind: 'fixture', apply(game) { for (const lane of game.rows.values()) lane.blocked = []; return game.mobDirector.retryAt; } }, { kind: 'step', count: 72 }] },
    { name: 'mobs 160 slime then 320 crab then 480 wasp production cadence', seed: 11, setup: stageMobArena(160), fixedStep: STEP, keepTrace: true,
      tape: [{ kind: 'step', count: 1 }, readyNextEncounter(320), { kind: 'step', count: 1 }, readyNextEncounter(480), { kind: 'step', count: 1 }] },
    { name: 'mobs Stroll director disabled', seed: 17, mode: 'stroll', setup: stageMobArena(480), fixedStep: STEP, tape: [{ kind: 'step', count: 240 }] },
  ]);
  assert.equal(blocked.final.game.mobs.actors.length, 1, 'retry gate delays but later permits the same production debut');
  assert.deepEqual(progression.final.callbacks.filter(event => event.name === 'onMobSpawn').map(event => event.payload.kind), ['slime', 'crab', 'wasp'], '160/320/480 unlocks preserve the ordered production species introductions');
  assert.deepEqual(progression.final.game.mobs.introduced.set, ['slime', 'crab', 'wasp'], 'MobDirector retains the ordered hidden introduction state');
  assert.equal(progression.final.game.mobs.actors[0].kind, 'wasp', 'the 480 cadence reaches the wasp after score, time, progress, and cap gates');
  assert.ok(progression.trace.some(point => point.game.mobs.nextSpawn > point.game.time), 'real spawn pacing schedules a future attempt instead of allowing immediate retries');
  assert.equal(stroll.final.game.mobs.actors.length, 0, 'stored stroll mode clears MobDirector population through production update');
});

test('differential mobs: slime walking plus crab/wasp windup, eased strike, recovery, and contact/death ordering remain exact', async () => {
  const scenarios = [
    { name: 'mob slime walking lifecycle', seed: 31, setup: stageMobArena(160), fixedStep: STEP, keepTrace: true,
      tape: [injectMob('slime', -3, 160), { kind: 'step', count: 180 }] },
    ...['crab', 'wasp'].map(kind => ({ name: `mob ${kind} windup strike recovery lifecycle`, seed: kind === 'crab' ? 37 : 41, setup: stageMobArena(kind === 'crab' ? 320 : 480), fixedStep: STEP, keepTrace: true,
      tape: [injectMob(kind, -1, kind === 'crab' ? 320 : 480, 'rest'), { kind: 'step', count: 480 }] })),
  ];
  const [slime, crab, wasp] = await runDifferentialMatrix(scenarios);
  assert.ok(slime.trace.some(point => point.game.mobs.actors.some(mob => mob.phase === 'walking')), 'slime reaches a real walking phase');
  for (const scenario of [crab, wasp]) {
    const phases = new Set(scenario.trace.flatMap(point => point.game.mobs.actors.map(mob => mob.phase)));
    assert.ok(phases.has('windup') && phases.has('moving') && phases.has('rest'), `${scenario.final.game.mobs.actors[0].kind} reaches windup, strike motion, and recovery`);
    assert.ok(scenario.final.callbacks.some(event => event.name === 'onMobAttack'), 'windup invokes the ordered production attack callback');
  }
  const easedProgress = scenario => scenario.trace.flatMap(point => point.game.mobs.actors)
    .filter(mob => mob.phase === 'moving' && mob.phaseDuration > 0 && Math.abs(mob.targetX - mob.fromX) > 0)
    .map(mob => ({ time: 1 - mob.phaseLeft / mob.phaseDuration, position: (mob.x - mob.fromX) / (mob.targetX - mob.fromX) }))
    .find(sample => sample.time > .1 && sample.time < .4);
  const crabEase = easedProgress(crab), waspEase = easedProgress(wasp);
  assert.ok(crabEase.position > crabEase.time, 'crab strike uses its aggressive ease-out rather than linear motion');
  assert.ok(waspEase.position < waspEase.time, 'wasp strike uses its delayed ease-in rather than linear motion');
  assert.equal(crab.final.game.state, 'dead', 'crab contact orders terminal death through Game.end');
  assert.equal(wasp.final.game.state, 'dead', 'wasp contact orders terminal death through Game.end');
});
