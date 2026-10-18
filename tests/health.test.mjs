import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';
const sources = await loadSources('game');
after(sources.dispose);
const { Game, HOP_TIME, MAX_HEALTH, HURT_RECOVERY, PLAYER_VEHICLE_RADIUS, vehicleBounds, sweptVehicleContact } = await sources.import('game');
const { WORLDS, TRAIN_BOUNDS } = await sources.import('content');
const step = 1 / 120;
function tick(g, duration) { for (let t = 0; t < duration - 1e-9; t += step) g.update(Math.min(step, duration - t)); }
function lane(g, row, kind = 'meadow', extra = {}) { const l = { ...g.rows.get(row), kind, blocked: [], decorations: [], coin: null, phase: 0, speed: 1, spacing: 20, length: 1.15, variant: 0, ...extra }; g.rows.set(row, l); return l; }
function arena(mode = 'arcade') { const g = new Game(1, 'pond', mode); g.state = 'playing'; for (const row of g.rows.keys()) lane(g, row); return g; }
function impact(face, direction = 1, length = 1.15, mode = 'arcade') {
  const g = arena(mode), events = []; g.onHurt = event => events.push(event);
  const road = lane(g, 0, 'road', { speed: direction, length });
  if (face === 'side') { g.y = g.fromY = -1; g.move('forward'); }
  else { g.x = g.fromX = (length / 2 + .4) * direction * (face === 'rear' ? -1 : 1); g.move((face === 'rear' ? direction : -direction) > 0 ? 'right' : 'left'); }
  return { g, road, events };
}
function advance(g, target) {
  while (g.maxY < target) { lane(g, g.y + 1); assert.equal(g.move('forward'), true); g.update(HOP_TIME); assert.equal(g.state, 'playing'); }
}

test('rear, side, and front contacts consume one, two, and three pluck in both directions and car lengths', () => {
  for (const mode of ['arcade', 'stroll']) for (const direction of [-1, 1]) for (const length of [1.15, 1.8]) for (const [face, amount] of [['rear', 1], ['side', 2], ['front', 3]]) {
    const { g, events } = impact(face, direction, length, mode); let deaths = 0; g.onEnd = () => deaths++;
    tick(g, HOP_TIME);
    assert.equal(g.health, 3 - amount, `${mode} ${direction} ${length} ${face}`);
    assert.equal(g.state, face === 'front' ? 'dead' : 'playing');
    assert.deepEqual(events, face === 'front' ? [] : [{ face, amount }]);
    assert.equal(deaths, face === 'front' ? 1 : 0);
    if (face === 'front') assert.equal(g.deathCause, 'traffic');
  }
});

test('collision uses the current hop ground point instead of its destination lane', () => {
  const { g, events } = impact('side');
  g.update(HOP_TIME * .2);
  assert.equal(g.health, MAX_HEALTH); assert.equal(events.length, 0);
  assert.ok(g.groundY < -.7, 'duck still has visible clearance from the car');
  tick(g, HOP_TIME * .5);
  assert.equal(g.health, 1); assert.equal(events[0].face, 'side'); assert.ok(g.hop > 0, 'collision interrupts airborne travel with recoil');
});

test('sweeps detect fast crossings and allow exact touching edges, corner misses and gaps', () => {
  const bounds = { minX: -.575, maxX: .575, minY: -.31, maxY: .31 };
  for (const direction of [-1, 1]) {
    assert.equal(sweptVehicleContact(direction * 2, 0, direction * -2, 0, bounds, direction).face, 'front');
    assert.equal(sweptVehicleContact(direction * -2, 0, direction * 2, 0, bounds, direction).face, 'rear');
    for (const y of [-.511, -.51, .51, .511]) assert.equal(sweptVehicleContact(-2, y, 2, y, bounds, direction), undefined, `parallel clearance at y ${y}`);
    assert.equal(sweptVehicleContact(-1.5, .51, -.8, .6, bounds, direction), undefined, 'near corner retains a gap');
  }
  const g = arena(); lane(g, 0, 'road', { phase: -2, speed: 30 });
  g.update(.14); assert.equal(g.deathCause, 'traffic', 'a car that passes completely through the duck in one step still hits');
});

test('vehicle core matches each world’s scaled chassis in both travel directions', () => {
  const g = arena();
  for (const world of WORLDS) for (let variant = 0; variant < world.vehicles.length; variant++) for (const speed of [-1, 1]) for (const length of [1.15, 1.8]) {
    const road = lane(g, 0, 'road', { world, variant, speed, length });
    const model = world.vehicles[variant], width = Math.max(...model.map(v => Math.abs(v.x) * 2 + v.w));
    const chassis = model.reduce((a, b) => a.w * a.d > b.w * b.d ? a : b), bounds = vehicleBounds(road);
    assert.ok(Math.abs(bounds.minX - (chassis.x * speed - chassis.w / 2) * length / width) < 1e-12);
    assert.ok(Math.abs(bounds.maxX - (chassis.x * speed + chassis.w / 2) * length / width) < 1e-12);
    assert.equal(bounds.maxY, .31); assert.equal(bounds.minY, -.31);
    assert.ok(PLAYER_VEHICLE_RADIUS < .25, 'bill and cosmetic turning do not enlarge the core');
  }
});

test('authored chassis offsets follow renderer row-minus-y coordinates and mirrored x', () => {
  const g = arena();
  const model = [{ x: .2, y: .15, z: .14, w: 1.2, d: .5, h: .32, color: '#abcdef' }];
  const world = { ...WORLDS[0], vehicles: [model] };
  for (const speed of [-1, 1]) {
    const bounds = vehicleBounds(lane(g, 0, 'road', { world, length: 1.6, speed }));
    assert.ok(Math.abs(bounds.minX - (.2 * speed - .6)) < 1e-12);
    assert.ok(Math.abs(bounds.maxX - (.2 * speed + .6)) < 1e-12);
    assert.equal(bounds.minY, -.4); assert.equal(bounds.maxY, .1);
  }
  // This offset chassis visibly reaches the duck before a centered chassis
  // would. Exercise actual movement so matching bounds also govern impacts.
  lane(g, 0, 'road', { world, length: 1.6, speed: 0 });
  g.y = g.fromY = -1; assert.equal(g.move('forward'), true);
  g.update(HOP_TIME / 2); assert.equal(g.health, 1);
});

test('one contact cannot drain repeatedly and separate impacts can hurt after recovery', () => {
  const { g, events } = impact('rear'); tick(g, .2);
  assert.equal(g.health, 2); assert.equal(events.length, 1);
  const road = g.rows.get(0); road.speed = 0; road.phase = g.x;
  // Keep the body overlapping a stationary car beyond the immunity timer.
  g.y = g.fromY = 0; g.hop = 0; tick(g, HURT_RECOVERY + .3);
  assert.equal(g.health, 2); assert.equal(events.length, 1, 'latched overlap is still the same contact');
  road.phase = 8; g.update(step); // Clear the first contact.
  road.phase = g.x + .975 - g.time; road.speed = 1;
  assert.equal(g.move('right'), true); tick(g, HOP_TIME);
  assert.equal(g.health, 1); assert.equal(events.length, 2);
  tick(g, HURT_RECOVERY + .2); road.phase = 8; g.update(step);
  road.phase = g.x + .975 - g.time; // car at x + .975 at current time
  assert.equal(g.move('right'), true); tick(g, HOP_TIME);
  assert.equal(g.health, 0); assert.equal(g.deathCause, 'traffic'); assert.equal(events.length, 2, 'fatal impact does not emit a surviving-hurt cue');
});

test('one moving car stays latched as its repeating lane phase wraps through zero', () => {
  const g = arena(), hits = []; g.onHurt = event => hits.push(event);
  lane(g, 0, 'road', { speed: .1, phase: -.1 });
  lane(g, -1, 'meadow', { blocked: [0] }); lane(g, 1, 'meadow', { blocked: [0] });
  g.x = g.fromX = .1; g.update(0);
  assert.equal(g.health, 1); assert.equal(g.hop, 0, 'no unsafe recoil into the blocked neighboring rows');
  tick(g, 3);
  assert.equal(g.hurtRemaining, 0); assert.equal(g.health, 1); assert.equal(hits.length, 1, 'wrapping visual lane offsets does not invent a second car contact');
});

test('recoil lands in a safe adjacent lane and does not select a river or solid scenery', () => {
  const { g } = impact('side'); tick(g, .25);
  assert.equal(g.y, -1); assert.equal(g.health, 1); assert.equal(g.hop, 0);
  assert.equal(g.rows.get(g.y).kind, 'meadow'); assert.equal(g.mobBlocked(g.x, g.y, PLAYER_VEHICLE_RADIUS), false);
  const blocked = arena(); lane(blocked, 0, 'road', { speed: 0 }); lane(blocked, -1, 'river'); lane(blocked, 1, 'meadow', { blocked: [0] });
  blocked.update(0);
  assert.equal(blocked.health, 1); assert.equal(blocked.y, 0, 'boxed-in impact never forces a lethal landing');
  assert.equal(blocked.hop, 0); assert.equal(blocked.state, 'playing');
});

test('hurt recovery freezes on pause, survives resume, and a new run restores full pluck', () => {
  const { g } = impact('rear'); tick(g, HOP_TIME);
  const frozen = [g.health, g.hurtRemaining, g.hop, g.time, g.groundX, g.groundY];
  g.pause(); tick(g, 10); assert.deepEqual([g.health, g.hurtRemaining, g.hop, g.time, g.groundX, g.groundY], frozen);
  g.resume(); tick(g, .05); assert.ok(g.hurtRemaining < frozen[1]);
  const fresh = new Game(1); assert.equal(fresh.health, MAX_HEALTH); assert.equal(fresh.maxHealth, MAX_HEALTH); assert.equal(fresh.hurtRemaining, 0);
});

test('100-point milestones regenerate exactly a half and cannot be farmed by backtracking', () => {
  const g = arena('stroll'), healed = []; g.health = 1; g.onHeal = amount => healed.push(amount);
  advance(g, 99); assert.equal(g.health, 1); assert.deepEqual(healed, []);
  advance(g, 100); assert.equal(g.health, 1.5); assert.deepEqual(healed, [.5]);
  lane(g, 99); g.move('back'); g.update(HOP_TIME); g.move('forward'); g.update(HOP_TIME);
  assert.equal(g.health, 1.5); assert.deepEqual(healed, [.5]);
  advance(g, 199); assert.equal(g.health, 1.5);
  advance(g, 200); assert.equal(g.health, 2); assert.deepEqual(healed, [.5, .5]);
});

test('regeneration clamps to capacity, consumes full-health milestones and accounts for skipped thresholds', () => {
  const full = arena('stroll'), healed = []; full.onHeal = amount => healed.push(amount);
  advance(full, 100); assert.equal(full.health, 3); assert.deepEqual(healed, []);
  full.health = 2; lane(full, 99); full.move('back'); full.update(HOP_TIME); full.move('forward'); full.update(HOP_TIME);
  assert.equal(full.health, 2); assert.deepEqual(healed, [], 'unused healing is never banked');
  advance(full, 200); assert.equal(full.health, 2.5); assert.deepEqual(healed, [.5]);
  advance(full, 300); assert.equal(full.health, 3); advance(full, 400); assert.equal(full.health, 3); assert.deepEqual(healed, [.5, .5]);
  const skipped = arena('stroll'); skipped.health = 1; skipped.y = skipped.fromY = skipped.maxY = 299; skipped.ensureRows(); lane(skipped, 300);
  skipped.move('forward'); assert.equal(skipped.health, 2.5, 'three newly reached milestones give 1.5 total');
});

test('train, water, wave, swept, trail and mob hazards remain fatal during car recovery', () => {
  const setups = {
    train(g) { lane(g, 0, 'rail', { period: 9, warning: 1.5, phase: 2.375, length: TRAIN_BOUNDS.maxX - TRAIN_BOUNDS.minX }); },
    water(g) { lane(g, 0, 'river', { phase: 5, length: 1 }); },
    wave(g) { g.waveRow = 0; },
    swept(g) { g.x = g.fromX = 5.51; lane(g, 0, 'river', { speed: 0, phase: 5.51, length: 3.5 }); },
    trail(g) { g.maxY = 8; },
    mob(g) { g.mobs.push({ id: 1, kind: 'slime', x: 0, y: 0, fromX: 0, fromY: 0, targetX: 0, targetY: 0, phase: 'rest', phaseLeft: 1, phaseDuration: 1 }); },
  };
  for (const [cause, setup] of Object.entries(setups)) {
    const g = arena(cause === 'trail' ? 'stroll' : 'arcade');
    if (cause === 'water' || cause === 'swept') g.setCharacter('sunny');
    g.hurtRemaining = .9; setup(g); let ends = 0; g.onEnd = () => ends++;
    g.update(step); assert.equal(g.deathCause, cause); assert.equal(g.health, 0); assert.equal(g.hurtRemaining, 0); assert.equal(ends, 1);
    g.update(10); assert.equal(ends, 1);
  }
});
