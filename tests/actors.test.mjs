import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['actors', 'levels/v1', 'levels/v2']);
after(sources.dispose);
const { progressiveActors, progressiveCoinPosition, applyActorEffects } = await sources.import('actors');
const { generateLane: generateV1 } = await sources.import('levels/v1');
const { generateLane: generateV2 } = await sources.import('levels/v2');
const sign = lane => Math.sign(lane.speed) || lane.direction || 1;
const lanes = (from, to, seed = 91, kind) => Array.from({ length: to - from }, (_, offset) => generateV2(seed, from + offset, 'shuffle')).filter(lane => !kind || lane.kind === kind);
const near = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} != ${expected}`);

test('schema 2 leaves the first fifty rows identical to the released warmup', () => {
  for (const seed of [0, 1, 67, 0x80000000, 0xffffffff]) for (const home of ['pond', 'orchard', 'frost', 'shuffle']) for (const gentle of [true, false]) {
    for (let index = -10; index < 50; index++) assert.deepEqual(generateV2(seed, index, home, gentle), generateV1(seed, index, home, gentle));
  }
});

test('50-row steps add mixed cars, slow trucks and then rare accelerating sports cars', () => {
  const stages = [50, 100, 150, 250, 500].map(start => lanes(start, start + 50, 18, 'road'));
  assert.ok(stages.every(stage => stage.length));
  const slots = stages.map(stage => stage.flatMap(lane => lane.actors.slots));
  assert.ok(slots[0].every(actor => actor.kind === 'car'));
  assert.ok(slots[1].some(actor => actor.kind === 'truck'));
  assert.ok(slots[1].every(actor => actor.kind !== 'sports'));
  assert.ok(slots.slice(2).every(stage => stage.some(actor => actor.kind === 'sports')));
  for (const stage of stages) for (const lane of stage) {
    assert.ok(new Set(lane.actors.slots.map(actor => actor.length)).size > 2);
    assert.ok(new Set(lane.actors.slots.map(actor => actor.speedFactor)).size > 2);
    assert.ok(new Set(lane.actors.slots.map(actor => actor.variant)).size > 1);
    for (const actor of lane.actors.slots) if (actor.kind === 'truck') {
      assert.ok(actor.speedFactor <= .66); assert.ok(actor.length >= 2.5);
    }
  }
});

test('sports cars remain rare at introduction and capped at later milestones', () => {
  for (const [start, expected] of [[150, .03], [300, .0525], [500, .06], [10000, .06]]) {
    let sports = 0, total = 0;
    for (let seed = 0; seed < 90; seed++) for (const lane of lanes(start, start + 50, seed, 'road')) {
      total += lane.actors.slots.length;
      sports += lane.actors.slots.filter(actor => actor.kind === 'sports').length;
      for (const actor of lane.actors.slots) if (actor.kind === 'sports') {
        assert.ok(actor.boost > actor.speedFactor);
        assert.ok(actor.boost * Math.abs(lane.speed) <= 7 + 1e-8);
      }
    }
    assert.ok(Math.abs(sports / total - expected) < .008, `${start}: ${sports}/${total}`);
  }
});

test('mixed traffic never overtakes or overlaps in either direction across repeated cycles', () => {
  let directions = new Set(), kinds = new Set();
  for (const lane of lanes(100, 450, 923, 'road')) {
    directions.add(sign(lane));
    for (const actor of lane.actors.slots) kinds.add(actor.kind);
    for (let clock = -lane.actors.span; clock <= lane.actors.span * 2; clock += .41) {
      const time = (clock - sign(lane) * lane.phase) / Math.abs(lane.speed);
      const actors = progressiveActors(lane, time);
      for (let index = 1; index < actors.length; index++) {
        const left = actors[index - 1], right = actors[index];
        assert.ok(right.x - left.x - (left.length + right.length) / 2 >= 2.15 - 1e-7, `row ${lane.index}, clock ${clock}, ids ${left.id}/${right.id}`);
      }
    }
  }
  assert.equal(directions.size, 2);
  assert.deepEqual([...kinds].sort(), ['car', 'sports', 'truck']);
});

test('sports acceleration starts continuously one third into the crossing in both directions', () => {
  const candidates = lanes(150, 800, 76, 'road').filter(lane => lane.actors.slots.some(actor => actor.kind === 'sports'));
  for (const direction of [-1, 1]) {
    const lane = candidates.find(lane => sign(lane) === direction);
    assert.ok(lane);
    const pattern = lane.actors, slot = pattern.slots.findIndex(actor => actor.kind === 'sports'), definition = pattern.slots[slot];
    const id = pattern.slots.length + slot;
    const clock = pattern.span + pattern.offsets[slot] + (13 - 5.5 + 11 / 3) / definition.speedFactor;
    const time = (clock - direction * lane.phase) / Math.abs(lane.speed);
    const actor = when => progressiveActors(lane, when).find(actor => actor.id === id);
    near(actor(time).x, direction * (-5.5 + 11 / 3));
    near(actor(time - .001).speed, lane.speed * definition.speedFactor);
    assert.ok(Math.abs(actor(time + .3).speed) > Math.abs(actor(time).speed));
    assert.equal(actor(time + .3).accelerating, true);
    assert.ok(Math.abs(actor(time + 1e-6).x - actor(time - 1e-6).x) < .0001);
    const frame = actor(time + .3), swept = progressiveActors(lane, time + .3, time + .284).find(actor => actor.id === id);
    near(frame.x, swept.x); near(swept.previousX, actor(time + .284).x);
    lane.direction = direction; lane.phase += (time + .3) * lane.speed; lane.speed = 0;
    const frozen = actor(time + .3);
    near(frozen.x, frame.x); assert.equal(frozen.speed, 0); assert.equal(frozen.accelerating, false);
  }
});

test('river size and gap variety grows gradually while lengths and gaps stay bounded', () => {
  for (const start of [50, 100, 200, 400, 10000]) for (const lane of lanes(start, start + 50, 21, 'river')) {
    const variety = Math.min(1, Math.floor(start / 50) / 8);
    assert.ok(lane.actors);
    assert.ok(new Set(lane.actors.slots.map(actor => actor.length)).size > 1);
    assert.ok(new Set(lane.actors.slots.map(actor => actor.gap)).size > 1);
    for (const actor of lane.actors.slots) {
      assert.ok(actor.length >= lane.length * (1 - .5 * variety));
      assert.ok(actor.length <= lane.length * (1 + .5 * variety));
      assert.ok(actor.gap >= .75 && actor.gap <= 2.6);
      assert.equal(actor.variant, lane.variant); assert.equal(actor.speedFactor, 1);
    }
    const actors = progressiveActors(lane, 19);
    for (let index = 1; index < actors.length; index++) {
      const gap = actors[index].x - actors[index - 1].x - (actors[index].length + actors[index - 1].length) / 2;
      assert.ok(gap >= .75 - 1e-8 && gap <= 2.6 + 1e-8);
    }
  }
});

test('platform coins remain on real seeded platforms through repeat boundaries', () => {
  for (const lane of lanes(200, 300, 32, 'river')) {
    const first = progressiveActors(lane, 0).reduce((nearest, actor) => Math.abs(actor.x) < Math.abs(nearest.x) ? actor : nearest);
    for (let time = 0; time <= 240; time += .37) {
      const x = progressiveCoinPosition(lane, time, first.id);
      if (x !== null) assert.ok(progressiveActors(lane, time).some(actor => Math.abs(actor.x - x) < 1e-7), `row ${lane.index} time ${time}`);
    }
  }
});

test('card effects preserve platform gaps and increase safe traffic headways', () => {
  for (const lane of lanes(150, 240, 23)) {
    if (!lane.actors) continue;
    const original = structuredClone(lane.actors);
    applyActorEffects(lane, { trafficSpacing: 1.5, platformLength: 1.3 });
    if (lane.kind === 'river') lane.actors.slots.forEach((actor, index) => {
      near(actor.length, original.slots[index].length * 1.3); near(actor.gap, original.slots[index].gap);
    });
    else {
      lane.actors.slots.forEach((actor, index) => near(actor.gap, original.slots[index].gap * 1.5));
      assert.ok(lane.actors.span > original.span);
    }
  }
});

test('phase rebasing preserves actor positions through slowdown, freeze and release', () => {
  for (const original of lanes(150, 280, 143).filter(lane => lane.actors)) {
    const lane = structuredClone(original), time = 17.31, expected = progressiveActors(lane, time);
    lane.direction = sign(lane);
    for (const speed of [original.speed * .8, 0, original.speed]) {
      lane.phase += time * (lane.speed - speed); lane.speed = speed;
      const actual = progressiveActors(lane, time);
      assert.deepEqual(actual.map(actor => actor.id), expected.map(actor => actor.id));
      actual.forEach((actor, index) => near(actor.x, expected[index].x));
      if (speed === 0) assert.deepEqual(progressiveActors(lane, time + 10).map(actor => actor.x), actual.map(actor => actor.x));
    }
  }
});

test('random-access generation and arbitrary time queries are deterministic', () => {
  const indices = [51, 103, 156, 213, 399, 503, 1005, 100005];
  const expected = indices.map(index => generateV2(0xfefeabba, index, 'shuffle'));
  for (const index of [...indices].reverse()) assert.deepEqual(generateV2(0xfefeabba, index, 'shuffle'), expected[indices.indexOf(index)]);
  for (const lane of expected) {
    const snapshot = JSON.stringify(lane);
    const before = progressiveActors(lane, 1700.3, 1700.28);
    progressiveActors(lane, 0); progressiveActors(lane, 1e6);
    assert.deepEqual(progressiveActors(lane, 1700.3, 1700.28), before);
    assert.equal(JSON.stringify(lane), snapshot);
  }
});
