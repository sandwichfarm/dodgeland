import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';
const sources = await loadSources('game');
after(sources.dispose);
const { Game, HOP_TIME } = await sources.import('game');
const { MOB_TYPES, MOB_SPAWN_GRACE, MOB_FIRST_SPAWN_TIME, MOB_MIN_SPAWN_PROGRESS, PLAYER_MOB_RADIUS, mobDefinition, mobTuning, mobPacing, mobMotionProgress, sweptMobContact } = await sources.import('mobs');
function arena(score = 0, seed = 8, mode = 'arcade') {
  const g = new Game(seed, 'pond', mode); g.x = g.fromX = 0; g.y = g.fromY = g.maxY = score;
  g.time = score >= 160 ? MOB_FIRST_SPAWN_TIME : 0;
  g.ensureRows(); clearRows(g); g.state = 'playing'; return g;
}
function clearRows(g) { for (const [index, row] of g.rows) g.rows.set(index, { ...row, kind: 'meadow', blocked: [], decorations: [], coin: null }); }
function place(g, score) { g.x = g.fromX = 0; g.y = g.fromY = g.maxY = score; g.ensureRows(); clearRows(g); }
function mob(kind, x, y, extra = {}) { return { id: 100, kind, x, y, fromX: x, fromY: y, targetX: x, targetY: y, phase: 'rest', phaseLeft: 1, phaseDuration: 1, ...extra }; }
function tick(g, duration, step = 1 / 120) { for (let elapsed = 0; elapsed < duration - 1e-9; elapsed += step) g.update(Math.min(step, duration - elapsed)); }
function changeLane(g, index, kind, extra = {}) { const row = { ...g.rows.get(index), kind, blocked: [], coin: null, phase: 0, speed: 0, spacing: 6, length: 1.15, ...extra }; g.rows.set(index, row); return row; }

test('species unlock much later and first arrival needs 45 active seconds as well as score', () => {
  for (const [score, kind] of [[0, null], [159, null], [160, 'slime'], [319, 'slime'], [320, 'slime'], [479, 'slime'], [480, 'slime'], [1000000, 'slime']]) {
    const g = arena(score); const spawned = []; g.onMobSpawn = m => spawned.push(m.kind); g.update(0);
    assert.deepEqual(spawned, kind ? [kind] : [], `score ${score}`);
  }
  const fast = arena(600); fast.time = MOB_FIRST_SPAWN_TIME - .01; fast.update(0); assert.equal(fast.mobs.length, 0);
  fast.time = MOB_FIRST_SPAWN_TIME; fast.update(0); assert.equal(fast.mobs.length, 1);
  const low = arena(159); low.time = 1000; low.update(0); assert.equal(low.mobs.length, 0);
  const fastRun = arena(480); fastRun.update(0); assert.equal(fastRun.mobs[0].kind, 'slime', 'a fast run still gets the gentle introduction first');
  for (const kind of ['crab', 'wasp']) {
    place(fastRun, fastRun.maxY + MOB_MIN_SPAWN_PROGRESS); fastRun.time += 18; fastRun.update(0);
    assert.equal(fastRun.mobs[0].kind, kind, 'later introductions wait their turn and the normal cadence');
  }
});

test('walking stays slow while distinct close attacks ramp gently and cap', () => {
  for (const definition of MOB_TYPES) {
    const early = mobTuning(definition.id, definition.unlock), later = mobTuning(definition.id, definition.unlock + 160), cap = mobTuning(definition.id, definition.unlock + 320);
    assert.ok(early.walkSpeed < later.walkSpeed && later.walkSpeed < cap.walkSpeed);
    assert.ok(cap.walkSpeed <= 1.15);
    if (definition.id === 'slime') assert.equal(early.range, 0, 'slime has no strike');
    else {
      assert.ok(early.speed < later.speed && later.speed < cap.speed);
      assert.ok(early.windup > later.windup && later.windup > cap.windup);
      assert.ok(early.recovery > later.recovery && later.recovery > cap.recovery);
      assert.ok(cap.windup >= .95 && cap.recovery >= 1.7);
    }
    assert.deepEqual(mobTuning(definition.id, 1e12), cap);
    assert.deepEqual(mobTuning(definition.id, -100), early);
  }
  assert.deepEqual(mobPacing(160), { interval: 18, cap: 1 });
  assert.deepEqual(mobPacing(480), { interval: 16, cap: 2 });
  assert.deepEqual(mobPacing(1000000), { interval: 14, cap: 2 });
});

test('spawns wait for a meadow landing with camera-safe space and full harmless grace', () => {
  const g = arena(160); g.move('right'); g.update(HOP_TIME / 2); assert.equal(g.mobs.length, 0);
  g.update(HOP_TIME / 2); assert.equal(g.mobs.length, 1);
  const born = g.mobs[0];
  assert.ok(Math.hypot(born.x - g.groundX, born.y - g.groundY) >= 2.5);
  assert.ok(born.y <= g.groundY && born.y >= g.groundY - 2 && born.y > g.waveRow + .55);
  assert.ok(Math.hypot(born.x - g.groundX, born.y - g.groundY) <= 3.5);
  assert.equal(g.rows.get(born.y).kind, 'meadow'); assert.equal(g.mobBlocked(born.x, born.y, mobDefinition(born.kind).radius), false);
  assert.equal(born.phase, 'spawning'); assert.equal(born.phaseLeft, 1.8);
  born.x = born.fromX = born.targetX = g.x; born.y = born.fromY = born.targetY = g.y;
  tick(g, MOB_SPAWN_GRACE - .01); assert.equal(g.state, 'playing');
  tick(g, .03); assert.equal(g.deathCause, 'mob', 'stationary contact becomes active after grace without a zero-duration loop');
  for (const terrain of ['road', 'rail', 'river']) {
    const waiting = arena(160); changeLane(waiting, 160, terrain, { phase: 3, length: 1, warning: 1.5, period: 10 });
    waiting.update(0); assert.equal(waiting.mobs.length, 0, `no debut onto ${terrain}`);
  }
});

test('crowded spawn regions defer without unsafe fallback or callback spam', () => {
  const g = arena(160); let events = 0; g.onMobSpawn = () => events++;
  for (let row = 158; row <= 160; row++) changeLane(g, row, 'meadow', { blocked: [-5, -4, -3, -2, 2, 3, 4, 5] });
  tick(g, 1); assert.equal(g.mobs.length, 0); assert.equal(events, 0);
  clearRows(g); tick(g, .6); assert.equal(g.mobs.length, 1); assert.equal(events, 1);
});

test('slimes walk continuously without attack callbacks, warning phases or recovery gaps', () => {
  const g = arena(); let attacks = 0; g.onMobAttack = () => attacks++;
  const m = mob('slime', -3, 0, { phase: 'spawning', phaseLeft: .01, phaseDuration: .01 }); g.mobs.push(m);
  g.update(.01); assert.equal(m.phase, 'walking'); assert.equal(m.targetX, -2.5);
  let previous = m.x;
  for (let i = 0; i < 120; i++) {
    g.update(1 / 120); assert.equal(m.phase, 'walking'); assert.ok(m.x > previous); previous = m.x;
    assert.equal(m.y, 0); assert.equal(g.state, 'playing');
  }
  assert.ok(Math.abs(m.x - (-3 + mobTuning('slime', 0).walkSpeed)) < 1e-9);
  assert.equal(attacks, 0);
  assert.ok(g.move('forward')); g.update(HOP_TIME / 2); assert.ok(m.x > previous, 'pursuit continues during duck hops');
});

test('crabs and wasps walk from afar, then lock nearby attacks that a sidestep can dodge', () => {
  for (const kind of ['crab', 'wasp']) {
    const far = arena(); let distantAttacks = 0; far.onMobAttack = () => distantAttacks++;
    const walker = mob(kind, -3, 0, { phaseLeft: .01 }); far.mobs.push(walker); far.update(.01);
    assert.equal(walker.phase, 'walking'); assert.equal(distantAttacks, 0); assert.ok(walker.targetX - walker.x <= .5);
    const g = arena(); let attacks = 0; g.onMobAttack = () => attacks++;
    const m = mob(kind, -1, 0, { phaseLeft: .01 }); g.mobs.push(m);
    g.update(.01); assert.equal(m.phase, 'windup'); assert.equal(attacks, 1);
    assert.equal(m.targetX, 0); assert.equal(m.targetY, 0);
    g.move('forward'); const committed = [m.targetX, m.targetY]; tick(g, HOP_TIME);
    assert.deepEqual([m.targetX, m.targetY], committed);
    tick(g, m.phaseLeft + .01); assert.equal(m.phase, 'moving');
    tick(g, m.phaseLeft + .001); assert.equal(m.phase, 'rest');
    assert.ok(Math.abs(m.x) < 1e-9 && m.y === 0, 'strike reaches the marked target');
    assert.equal(g.state, 'playing'); assert.equal(attacks, 1);
    const position = [m.x, m.y], rest = m.phaseLeft;
    tick(g, rest - .01); assert.equal(m.phase, 'rest'); assert.deepEqual([m.x, m.y], position); assert.equal(attacks, 1);
    tick(g, .02); assert.equal(attacks, 2, 'another nearby strike starts only after the whole recovery');
  }
});

test('crab ease-out and wasp ease-in-out drive actual movement, while walking remains linear', () => {
  assert.equal(mobMotionProgress('crab', 'moving', .25), .578125);
  assert.equal(mobMotionProgress('wasp', 'moving', .25), .0625);
  for (const kind of ['slime', 'crab', 'wasp']) assert.equal(mobMotionProgress(kind, 'walking', .25), .25);
  for (const kind of ['crab', 'wasp']) {
    const g = arena(); const m = mob(kind, -3, -2, { targetX: -2, phase: 'moving', phaseLeft: 1, phaseDuration: 1 }); g.mobs.push(m);
    g.update(.25); assert.ok(Math.abs(m.x - (-3 + mobMotionProgress(kind, 'moving', .25))) < 1e-9);
  }
});

test('ground walkers route around scenery, stay on river banks and respect world bounds', () => {
  for (const kind of ['slime', 'crab']) {
    const g = arena(); changeLane(g, 0, 'meadow', { blocked: [-1] });
    const m = mob(kind, -2, 0, { phaseLeft: .01 }); g.mobs.push(m);
    tick(g, 1.2); assert.ok(Math.abs(m.y) >= .7, `${kind} walks around the blocked cell`);
    assert.equal(g.mobBlocked(m.x, m.y, mobDefinition(kind).radius), false); assert.equal(g.state, 'playing');
    const river = arena(); river.y = river.fromY = river.maxY = 2;
    changeLane(river, 1, 'river'); const bank = mob(kind, 0, 0, { phaseLeft: .01 }); river.mobs.push(bank);
    tick(river, 2); assert.equal(bank.y, 0, `${kind} stays on its bank`);
  }
  const g = arena(); g.y = g.fromY = g.maxY = 2; changeLane(g, 1, 'river');
  const wasp = mob('wasp', 0, 0, { phaseLeft: .01 }); g.mobs.push(wasp);
  g.update(.01); assert.equal(wasp.phase, 'walking'); assert.equal(wasp.targetY, .5); tick(g, 2.15); assert.ok(wasp.y > .5);
  assert.equal(g.mobBlocked(5.01, 0, .2), true); assert.equal(g.mobBlocked(-5.01, 0, .2), true);
});

test('traffic and trains remove ground mobs, while flying wasps survive', () => {
  for (const kind of ['slime', 'crab', 'wasp']) for (const hazard of ['road', 'rail']) {
    const g = arena(); changeLane(g, -2, hazard, hazard === 'rail' ? { speed: 1, period: 9, warning: 1.5, phase: 2.375 } : {});
    g.mobs.push(mob(kind, 0, -2)); g.update(0);
    assert.equal(g.mobs.length, kind === 'wasp' ? 1 : 0, `${kind}, ${hazard}`); assert.equal(g.state, 'playing');
  }
  const g = arena(); changeLane(g, -2, 'road', { speed: 12, phase: -1, spacing: 20 });
  g.mobs.push(mob('crab', 0, -2)); g.update(.2); assert.equal(g.mobs.length, 0, 'relative vehicle sweep catches contact between endpoints');
});

test('forgiving body cores allow near misses and eased strike contacts cannot tunnel', () => {
  for (const kind of ['slime', 'crab', 'wasp']) for (const [clearance, hit] of [[.015, false], [-.015, true]]) {
    const g = arena(); const distance = PLAYER_MOB_RADIUS + mobDefinition(kind).radius + clearance;
    g.mobs.push(mob(kind, distance, 0)); let cause; g.onEnd = () => { cause = g.deathCause; }; g.update(0);
    assert.equal(g.state, hit ? 'dead' : 'playing', `${kind}, clearance ${clearance}`);
    if (hit) { assert.equal(cause, 'mob'); assert.match(g.reason, new RegExp(mobDefinition(kind).name)); assert.ok(g.reason.includes(mobDefinition(kind).hint)); }
  }
  assert.equal(sweptMobContact(-1, 0, 1, 0, 1, 0, -1, 0, .4), true);
  assert.equal(sweptMobContact(-1, .401, 1, .401, 1, 0, -1, 0, .4), false);
  for (const kind of ['crab', 'wasp']) {
    const g = arena(); g.mobs.push(mob(kind, 1, 0, { fromX: 1, targetX: -1, phase: 'moving', phaseDuration: HOP_TIME, phaseLeft: HOP_TIME }));
    g.move('right'); g.update(HOP_TIME); assert.equal(g.deathCause, 'mob', 'full crossing cannot tunnel with easing');
  }
});

test('contact follows interpolated hops and river carry before collision', () => {
  const g = arena(); g.mobs.push(mob('slime', 1.05, 0)); g.move('right');
  g.update(HOP_TIME / 4); assert.equal(g.state, 'playing', 'destination does not collide before body arrives');
  g.update(HOP_TIME / 2); assert.equal(g.deathCause, 'mob'); assert.ok(g.hop > 0);
  const river = arena(); changeLane(river, 0, 'river', { speed: 1, length: 3.5 });
  river.mobs.push(mob('wasp', .45, 0)); river.update(.1);
  assert.ok(Math.abs(river.x - .1) < 1e-9); assert.equal(river.deathCause, 'mob');
});

test('pause freezes phases and arrival clocks, retry resets them, and Stroll stays mob-free', () => {
  const g = arena(160); g.update(0); tick(g, .3); g.pause();
  const snapshot = JSON.stringify(g.mobs), time = g.time; tick(g, 30); assert.equal(JSON.stringify(g.mobs), snapshot); assert.equal(g.time, time);
  g.resume(); tick(g, .1); assert.notEqual(JSON.stringify(g.mobs), snapshot);
  assert.equal(new Game(8).mobs.length, 0);
  const fresh = arena(160); fresh.update(0); assert.equal(fresh.mobs[0].id, 1);
  const stroll = arena(999, 8, 'stroll'); let calls = 0; stroll.onMobSpawn = () => calls++; tick(stroll, 30); assert.equal(stroll.mobs.length, 0); assert.equal(calls, 0);
});

test('the wave and bounded trailing window remove abandoned mobs', () => {
  const g = arena(20); g.mobs.push(mob('slime', 4, 13), mob('wasp', 3, 14.1), mob('crab', 3, 17));
  g.update(0); assert.deepEqual(g.mobs.map(m => m.kind), ['crab']);
  g.mobs.push(mob('wasp', 4, 40)); g.update(0); assert.equal(g.mobs.length, 1);
});

test('spawn cadence is deterministic, progress gated, bounded and never bypassed by a debut', () => {
  const g = arena(160); g.update(0); assert.equal(g.mobs[0].kind, 'slime');
  const firstTime = g.time;
  place(g, 320); g.time = firstTime + 2; g.update(0); assert.equal(g.mobs.length, 0, 'unlock cannot bypass 18-second cadence');
  g.time = firstTime + 17.99; g.update(0); assert.equal(g.mobs.length, 0);
  g.time = firstTime + 18; g.update(0); assert.equal(g.mobs[0].kind, 'crab');
  g.mobs.length = 0; g.time += 100; g.update(0); assert.equal(g.mobs.length, 0, 'camping never starts another encounter');
  place(g, 320 + MOB_MIN_SPAWN_PROGRESS - 1); g.update(0); assert.equal(g.mobs.length, 0);
  place(g, 320 + MOB_MIN_SPAWN_PROGRESS); g.update(0); assert.equal(g.mobs.length, 1);
  const run = seed => {
    const game = arena(160, seed); const events = []; let max = 0;
    game.onMobSpawn = m => events.push([game.time, game.maxY, m.kind, m.x, m.y]);
    for (let step = 0; step < 30000; step++) {
      if (step % 40 === 0) place(game, game.maxY + 1);
      game.update(1 / 120); assert.equal(game.state, 'playing'); max = Math.max(max, game.mobs.length);
      assert.ok(game.mobs.length <= mobPacing(game.maxY).cap); assert.ok(game.rows.size <= 39);
      for (const m of game.mobs) { assert.ok(m.y > game.waveRow); assert.ok([m.x, m.y, m.phaseLeft, m.phaseDuration].every(Number.isFinite)); }
    }
    assert.ok(events.length >= 12 && events.length <= 18); assert.ok(max >= 1 && max <= 2);
    assert.deepEqual(new Set(events.map(event => event[2])), new Set(['slime', 'crab', 'wasp']));
    for (let i = 1; i < events.length; i++) {
      assert.ok(events[i][0] - events[i - 1][0] >= mobPacing(events[i - 1][1]).interval - 1e-9);
      assert.ok(events[i][1] - events[i - 1][1] >= MOB_MIN_SPAWN_PROGRESS);
    }
    return events;
  };
  assert.deepEqual(run(987), run(987)); assert.notDeepEqual(run(988), run(987));
});

test('population stays at one below wasp unlock and at two for late runs', () => {
  for (const [score, cap] of [[160, 1], [320, 1], [480, 2], [1000000, 2]]) {
    const g = arena(score); let spawned = 0; g.onMobSpawn = () => spawned++;
    for (let attempt = 0; attempt < 4; attempt++) {
      g.time += 20;
      if (attempt) {
        for (const m of g.mobs) { m.y += MOB_MIN_SPAWN_PROGRESS; m.fromY += MOB_MIN_SPAWN_PROGRESS; m.targetY += MOB_MIN_SPAWN_PROGRESS; }
        place(g, g.maxY + MOB_MIN_SPAWN_PROGRESS);
      }
      g.update(0); assert.ok(g.mobs.length <= cap);
    }
    assert.equal(g.mobs.length, cap); assert.equal(spawned, cap);
  }
});

test('spawning preserves an escape, and distant pursuit plans short cardinal steps', () => {
  const trapped = arena(160);
  changeLane(trapped, 160, 'meadow', { blocked: [-1, 1] });
  changeLane(trapped, 159, 'meadow', { blocked: [0] }); changeLane(trapped, 161, 'meadow', { blocked: [0] });
  trapped.update(0); assert.equal(trapped.mobs.length, 0);
  changeLane(trapped, 161, 'meadow'); trapped.time += .5; trapped.update(0); assert.equal(trapped.mobs.length, 1);
  for (const kind of ['slime', 'crab', 'wasp']) {
    const g = arena(); const m = mob(kind, -3, -2, { phaseLeft: .01 }); g.mobs.push(m); g.update(.01);
    const dx = m.targetX - m.fromX, dy = m.targetY - m.fromY;
    assert.equal(m.phase, 'walking'); assert.ok(Math.abs(Math.hypot(dx, dy) - .5) < 1e-9);
    if (kind !== 'wasp') assert.ok(dx === 0 || dy === 0); else assert.ok(dx > 0 && dy > 0);
  }
});

test('urgent waves and market invitations suppress arrivals while existing pursuers keep walking', () => {
  const g = arena(160); g.waveRow = 158; g.update(0);
  assert.equal(g.warning, true); assert.equal(g.mobs.length, 0);
  place(g, 163); g.update(0); assert.equal(g.warning, false); assert.equal(g.mobs.length, 1);
  const market = arena(160); market.run.advanceScore(100); market.update(0); assert.equal(market.mobs.length, 0);
  const walker = mob('slime', -3, 160, { targetX: -2, phase: 'walking', phaseLeft: 1, phaseDuration: 1 }); market.mobs.push(walker);
  market.update(.1); assert.ok(walker.x > -3, 'invitation does not freeze existing pursuit');
  market.mobs.length = 0; market.run.tick(16); market.update(0); assert.equal(market.mobs.length, 1, 'expiry allows a deferred encounter');
});

test('backtracking never places a spawn below the camera’s visible rear rows', () => {
  for (let seed = 0; seed < 30; seed++) {
    const g = arena(160, seed); g.y = g.fromY = 158; g.waveRow = 154;
    assert.equal(g.warning, false); g.update(0);
    for (const m of g.mobs) { assert.ok(m.y >= g.maxY - 2); assert.ok(m.y <= g.groundY); }
    assert.equal(g.mobs.length, 1);
    const farther = arena(160, seed); farther.y = farther.fromY = 157; farther.waveRow = 154;
    farther.update(0); assert.equal(farther.mobs.length, 0);
  }
});
