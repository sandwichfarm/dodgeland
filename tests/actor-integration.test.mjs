import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const source = await loadSources(['game', 'market/catalog']);
after(source.dispose);
const { Game, HOP_TIME, PLAYER_VEHICLE_RADIUS, laneActors, laneDirection, vehicleBounds, platformBounds, platformSupports, coinPosition } = await source.import('game');
const { generateSeedLane } = await source.import('levels/index');
const { ITEM_CATALOG } = await source.import('market/catalog');
const run = { schema: 2, seed: 31, home: 'orchard', mode: 'stroll', gentle: false };
const close = (actual, expected, note = '') => assert.ok(Math.abs(actual - expected) < 1e-8, `${note}: ${actual} != ${expected}`);
const tick = (game, duration) => { for (let elapsed = 0; elapsed < duration - 1e-10; elapsed += 1 / 120) game.update(Math.min(1 / 120, duration - elapsed)); };

function arena(fixture) {
  const game = new Game(run, undefined, undefined, undefined, ITEM_CATALOG);
  for (const [index, original] of game.rows) game.rows.set(index, { ...original, kind: 'meadow', actors: undefined, blocked: [], decorations: [], coin: null });
  game.state = 'playing';
  if (fixture) { game.time = fixture.time; game.rows.set(0, { ...structuredClone(fixture.lane), index: 0, coin: null, coinActor: undefined }); }
  return game;
}
function buy(game, id) {
  if (!game.run.market) game.run.advanceScore(100);
  assert.equal(game.openMarket(), true);
  const item = game.run.catalog.get(id), offer = { id: `fixture-${id}-${game.run.revision}`, itemId: id, price: item.price, sold: false };
  game.run.market.offers.push(offer); game.run.creditCoins(item.price);
  const result = game.run.buy(offer.id); assert.equal(result.ok, true, result.message);
  game.closeMarket(); return result.cards?.[0];
}
function findActor(kind, direction, condition = () => true) {
  for (let row = 150; row < 700; row++) {
    const lane = generateSeedLane(run, row);
    if (!lane.actors || laneDirection(lane) !== direction || (kind === 'platform') !== (lane.kind === 'river')) continue;
    for (let time = 0; time < 40; time += .125) {
      const actor = laneActors(lane, time).find(actor => actor.kind === kind && Math.abs(actor.x) < 1.6 && condition(actor, lane, time));
      if (actor) return { lane, time, actor };
    }
  }
  throw new Error(`Missing ${direction} ${kind} fixture`);
}
function stationary(game) {
  const lane = game.lane;
  lane.direction = laneDirection(lane); lane.phase += game.time * lane.speed; lane.speed = 0;
  return lane;
}

test('actual Game contacts use the long truck body, while a visible gap beside that body remains safe', () => {
  for (const direction of [-1, 1]) {
    const fixture = findActor('truck', direction);
    for (const contact of [true, false]) {
      const game = arena(fixture), lane = stationary(game);
      const actor = laneActors(lane, game.time).find(actor => actor.id === fixture.actor.id);
      const bounds = vehicleBounds(lane, actor), oldBounds = vehicleBounds(lane), events = [];
      assert.ok(bounds.maxX > oldBounds.maxX + .3, 'fixture extends beyond the uniform old lane body');
      game.onHurt = event => events.push(event);
      game.x = game.fromX = actor.x + (contact ? (bounds.maxX + oldBounds.maxX) / 2 : bounds.maxX + .001) + PLAYER_VEHICLE_RADIUS;
      game.y = game.fromY = -1;
      assert.equal(game.move('forward'), true); tick(game, HOP_TIME);
      assert.equal(game.health, contact ? 1 : 3);
      assert.deepEqual(events, contact ? [{ face: 'side', amount: 2 }] : []);
      assert.equal(game.state, 'playing');
    }
  }
});

test('accelerating sports cars produce contextual front, side and rear contacts in both directions', () => {
  for (const direction of [-1, 1]) for (const face of ['front', 'side', 'rear']) {
    const fixture = findActor('sports', direction, actor => actor.accelerating && Math.abs(actor.speed) < 5);
    const game = arena(fixture), lane = game.lane, actor = laneActors(lane, game.time).find(value => value.id === fixture.actor.id);
    const bounds = vehicleBounds(lane, actor), events = []; game.onHurt = event => events.push(event);
    const later = laneActors(lane, game.time + .04, game.time).find(value => value.id === actor.id);
    assert.ok(Math.abs(later.speed) > Math.abs(actor.speed));
    close(later.previousX, actor.x, 'sweep begins at the actual accelerating trajectory');
    assert.ok(Math.abs(later.x - later.previousX - later.speed * .04) > .0001, 'fixture distinguishes nonlinear travel from end-speed extrapolation');
    if (face === 'side') {
      game.x = game.fromX = later.x; game.y = game.fromY = -1;
      assert.equal(game.move('forward'), true);
    } else {
      game.x = game.fromX = actor.x + direction * (face === 'front' ? 1 : -1) * (actor.length / 2 + PLAYER_VEHICLE_RADIUS + .14);
      const toward = direction * (face === 'rear' ? 1 : -1);
      assert.equal(game.move(toward > 0 ? 'right' : 'left'), true);
    }
    tick(game, HOP_TIME);
    const amount = face === 'front' ? 3 : face === 'side' ? 2 : 1;
    assert.equal(game.health, 3 - amount, `${direction} ${face}`);
    assert.equal(game.state, face === 'front' ? 'dead' : 'playing');
    assert.deepEqual(events, face === 'front' ? [] : [{ face, amount }]);
    if (face === 'front') assert.equal(game.deathCause, 'traffic');
    assert.ok(bounds.maxX > 0);
  }
});

test('variable platforms support their exact visible edges and carry an edge rider without drowning', () => {
  let sizes = new Set();
  for (const direction of [-1, 1]) {
    const fixture = findActor('platform', direction), lane = fixture.lane;
    for (const time of [0, 3.4, 17.1]) for (const actor of laneActors(lane, time).filter(actor => Math.abs(actor.x) < 7)) {
      const bounds = platformBounds(lane, actor); sizes.add(actor.length);
      for (const edge of [bounds.minX, bounds.maxX]) assert.equal(platformSupports(lane, actor.x + edge, time), true);
      assert.equal(platformSupports(lane, actor.x + bounds.minX - .00001, time), false);
      assert.equal(platformSupports(lane, actor.x + bounds.maxX + .00001, time), false);
    }
    for (const side of [-1, 1]) {
      const game = arena(fixture), actor = laneActors(game.lane, game.time).find(actor => actor.id === fixture.actor.id);
      const offset = side * (actor.length / 2 - .00001);
      game.x = game.fromX = actor.x + offset;
      assert.equal(platformSupports(game.lane, game.x, game.time), true);
      tick(game, .4);
      assert.equal(game.state, 'playing', 'duck near either end stays on its moving platform');
      const after = laneActors(game.lane, game.time).find(value => value.id === actor.id);
      close(game.x - after.x, offset, 'relative rider offset');
      assert.equal(platformSupports(game.lane, game.x, game.time), true);
    }
  }
  assert.ok(sizes.size >= 8, 'the proof covers many differently sized actors');
});

test('live speed cards and timed freeze rebase every actor without moving the sports acceleration point', () => {
  for (const direction of [-1, 1]) {
    const fixture = findActor('sports', direction, actor => actor.accelerating);
    const game = arena(), road = structuredClone(fixture.lane), water = structuredClone(findActor('platform', -direction).lane);
    road.index = 2; water.index = 3; game.rows.set(2, road); game.rows.set(3, water); game.time = fixture.time;
    const snapshot = lane => laneActors(lane, game.time).map(({ id, x, length, kind }) => ({ id, x, length, kind }));
    const compare = (lane, expected) => {
      const actual = snapshot(lane); assert.deepEqual(actual.map(actor => actor.id), expected.map(actor => actor.id));
      actual.forEach((actor, index) => { close(actor.x, expected[index].x); assert.equal(actor.length, expected[index].length); });
    };
    const originalRoad = snapshot(road), originalWater = snapshot(water), baseSpeed = road.speed;
    const speedCard = buy(game, 'traffic-speed'); buy(game, 'river-speed');
    compare(road, originalRoad); compare(water, originalWater);
    const sports = laneActors(road, game.time).find(actor => actor.id === fixture.actor.id);
    assert.equal(sports.accelerating, true);
    assert.ok(Math.abs(road.speed) < Math.abs(baseSpeed));
    buy(game, 'power-freeze');
    assert.equal(road.speed, 0); assert.equal(laneDirection(road), direction);
    compare(road, originalRoad);
    assert.ok(laneActors(road, game.time).every(actor => actor.speed === 0));
    tick(game, .25); compare(road, originalRoad);
    const freeze = game.run.powers.find(power => power.itemId === 'power-freeze');
    freeze.remaining = .0001;
    // Expiry is processed before clock advance. A zero-duration reconciliation
    // after removing the expired power isolates the exact continuity boundary.
    game.run.tick(.0001); const beforeResume = snapshot(road); game.syncEffects();
    compare(road, beforeResume); assert.equal(laneDirection(road), direction);
    assert.ok(laneActors(road, game.time).find(actor => actor.id === fixture.actor.id).accelerating);
    const resumed = laneActors(road, game.time).find(actor => actor.id === fixture.actor.id);
    tick(game, .01);
    assert.ok(direction * (laneActors(road, game.time).find(actor => actor.id === resumed.id).x - resumed.x) > 0);
    const beforeSell = snapshot(road);
    assert.equal(game.openMarket(), true); assert.equal(game.run.sell(speedCard.id).ok, true); game.closeMarket();
    compare(road, beforeSell); close(road.speed, baseSpeed);
    assert.equal(game.state, 'playing');
  }
});

test('Wide Gaps and Longboats alter future individual actors and retain already generated rows', () => {
  const game = arena(); game.maxY = 200; game.ensureRows();
  const old = [...game.rows.values()].find(lane => lane.actors && lane.kind === 'river'), saved = structuredClone(old);
  buy(game, 'traffic-spacing'); buy(game, 'platform-length');
  assert.deepEqual(old, saved);
  let roads = 0, rivers = 0;
  for (let row = 250; row < 430; row++) {
    game.maxY = row; game.ensureRows();
    const actual = game.rows.get(row), baseline = generateSeedLane(run, row);
    if (!actual.actors) continue;
    assert.deepEqual(actual.actors.slots.map(actor => actor.kind), baseline.actors.slots.map(actor => actor.kind));
    actual.actors.slots.forEach((actor, index) => {
      const base = baseline.actors.slots[index];
      if (actual.kind === 'road') {
        close(actor.length, base.length); close(actor.gap, base.gap * game.run.effects.trafficSpacing); roads++;
      } else {
        close(actor.length, base.length * game.run.effects.platformLength); close(actor.gap, base.gap); rivers++;
      }
    });
    assert.ok(actual.actors.span > baseline.actors.span, 'new spawn/support schedules account for the larger individual geometry');
  }
  assert.ok(roads > 100 && rivers > 100);
});

test('River Riches binds real variable platforms and every visible reward remains supported over repeated cycles', () => {
  const game = arena(); buy(game, 'river-coins');
  const lanes = [];
  for (let row = 200; row < 550 && lanes.length < 20; row++) {
    game.maxY = row; game.ensureRows();
    const lane = game.rows.get(row);
    if (lane.kind === 'river' && lane.actors && lane.coin !== null && lane.coinActor !== null) lanes.push(lane);
  }
  assert.equal(lanes.length, 20);
  let checked = 0;
  for (const lane of lanes) for (let time = 0; time < 70; time += .37) {
    const coin = coinPosition(lane, time);
    if (!coin) continue;
    assert.equal(platformSupports(lane, coin.x, time), true, `row ${lane.index}, t ${time}`);
    assert.ok(laneActors(lane, time).some(actor => Math.abs(actor.x - coin.x) < 1e-8), 'reward is centered on one physical platform');
    checked++;
  }
  assert.ok(checked > 2000);
});
