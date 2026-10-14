import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const source = await loadSources(['game', 'coin-pull', 'market/catalog', 'render']);
after(source.dispose);
const { Game, HOP_TIME, generateLane, coinPosition, platformSurface } = await source.import('game');
const { advanceCoinPull } = await source.import('coin-pull');
const { ITEM_CATALOG } = await source.import('market/catalog');
const { Renderer } = await source.import('render');
const STEP = 1 / 120;

function lane(game, index, values = {}) {
  const value = { ...generateLane(game.seed, index, game.home), kind: 'meadow', blocked: [], decorations: [], coin: null, speed: 0, phase: 0, spacing: 20, length: 4, ...values };
  game.rows.set(index, value); return value;
}
function arena(magnet = true) {
  const game = new Game(23, 'pond', 'stroll', false, ITEM_CATALOG);
  for (const index of game.rows.keys()) lane(game, index);
  game.state = 'playing';
  if (magnet) {
    const item = game.run.catalog.get('magnet');
    game.run.advanceScore(100); assert.equal(game.openMarket(), true);
    const offer = { id: 'fixture-magnet', itemId: item.id, price: item.price, sold: false };
    game.run.market.offers.push(offer); game.run.creditCoins(item.price);
    assert.equal(game.run.buy(offer.id).ok, true); game.closeMarket(); game.run.market = null;
  }
  return game;
}
function settle(game, seconds = 2) {
  for (let step = 0; step < seconds / STEP; step++) game.update(STEP);
}
function zeroGravityArena() {
  const game = arena(false);
  // Explicitly exercise the supported zero-gravity contact behavior. Ordinary
  // cardless runs have a small base pull for their fractional landing grid.
  game.run.effects.coinRadius = 0;
  return game;
}

test('entering the magnet field captures a visible coin without immediately awarding it', () => {
  const game = arena(), reward = lane(game, 1, { coin: 0 }), events = [];
  game.onCoin = amount => events.push(amount);
  game.update(0);
  assert.equal(game.coins, 0); assert.equal(game.run.wallet, 0); assert.deepEqual(events, []);
  assert.notEqual(reward.coin, null); assert.deepEqual(coinPosition(reward, game.time), { x: 0, y: 1 });
  assert.equal(reward.coinPull.speed, 0, 'capture starts at rest');
  const ys = [];
  for (let step = 0; step < 4; step++) { game.update(STEP); ys.push(coinPosition(reward, game.time).y); }
  assert.ok(ys.every(y => y > .2 && y < 1));
  const distances = ys.slice(1).map((y, index) => ys[index] - y);
  assert.ok(distances[1] > distances[0] && distances[2] > distances[1], 'successive visible travel distances accelerate');
  assert.equal(game.coins, 0, 'travel through the field is not collection');
  settle(game);
  assert.equal(reward.coin, null); assert.equal(reward.coinPull, undefined); assert.equal(coinPosition(reward, game.time), null);
  assert.equal(game.coins, 1); assert.equal(game.run.wallet, 1); assert.deepEqual(events, [1]);
  settle(game); assert.deepEqual(events, [1], 'one reward creates one payment');
});

test('magnet range is bounded and direct contact still collects without the card', () => {
  const game = arena(), outside = lane(game, 1, { coin: 1 });
  settle(game, .4); assert.equal(outside.coinPull, undefined); assert.equal(outside.coin, 1); assert.equal(game.coins, 0);
  const plain = arena(false), direct = lane(plain, 0, { coin: 0 }), adjacent = lane(plain, 1, { coin: 0 });
  plain.update(0); assert.equal(direct.coin, null); assert.equal(plain.coins, 1);
  settle(plain); assert.equal(adjacent.coinPull, undefined); assert.equal(adjacent.coin, 0); assert.equal(plain.coins, 1);
});

test('zero gravity requires physical coin contact instead of a matching rounded tile', () => {
  for (const x of [-.49, -.4, .4, .49]) {
    const game = zeroGravityArena(), reward = lane(game, 0, { coin: 0 });
    game.x = game.fromX = x;
    assert.equal(game.run.effects.coinRadius, 0);
    settle(game, .3);
    assert.equal(game.coins, 0, `a visible gap at x=${x} cannot collect`);
    assert.equal(reward.coin, 0); assert.equal(reward.coinPull, undefined);
    game.x = game.fromX = Math.sign(x) * .25;
    game.update(0);
    assert.equal(game.coins, 1, 'moving the body into contact collects once');
    game.update(0); assert.equal(game.coins, 1);
  }
});

test('zero gravity uses the actual moving-platform coin position for manual contact', () => {
  const game = zeroGravityArena(), reward = lane(game, 0, { kind: 'river', coin: 0, coinActor: 0, phase: .45 });
  game.update(0);
  assert.equal(game.coins, 0, 'sharing a log does not collect a separated coin');
  assert.ok(Math.abs(coinPosition(reward, game.time).x - .45) < 1e-12);
  game.x = game.fromX = .25;
  game.update(0); assert.equal(game.coins, 1);
});

test('manual contact during an unsupported river approach cannot pay before drowning', () => {
  const game = zeroGravityArena(), reward = lane(game, 1, { kind: 'river', coin: 0, phase: 10, length: 2 });
  game.setCharacter('sunny'); // Keep this a fatal-water pickup test.
  assert.equal(game.move('forward'), true);
  game.update(HOP_TIME * .8);
  assert.equal(game.coins, 0, 'being close while approaching water is not a safe pickup');
  game.update(HOP_TIME);
  assert.equal(game.deathCause, 'water'); assert.equal(game.coins, 0); assert.equal(reward.coin, 0);
});

test('zero gravity lets a sideways hop touch a coin on the same moving platform', () => {
  for (const direction of [-1, 1]) {
    const game = zeroGravityArena(), reward = lane(game, 0, { kind: 'river', coin: 0, coinActor: 0, speed: direction });
    game.x = game.fromX = direction * .49;
    game.update(0); assert.equal(game.coins, 0);
    assert.equal(game.move(direction > 0 ? 'left' : 'right'), true);
    for (let step = 0; step < 8; step++) game.update(STEP);
    assert.ok(game.hop > 0, 'contact happens during the crossing, not at a rounded endpoint');
    assert.equal(game.state, 'playing'); assert.equal(game.coins, 1); assert.equal(reward.coin, null);
    settle(game, .2); assert.equal(game.coins, 1);
  }
});

test('selling the last gravity card preserves captured coins while new captures use the base range', () => {
  const game = arena(), reward = lane(game, 1, { coin: 0 });
  game.update(STEP);
  assert.ok(reward.coinPull.speed > 0);
  game.run.advanceScore(200); assert.equal(game.openMarket(), true);
  assert.equal(game.run.sell(game.run.cards[0].id).ok, true);
  game.closeMarket();
  assert.equal(game.run.effects.coinRadius, .1);
  const before = coinPosition(reward, game.time), outside = lane(game, 0, { coin: 1 });
  game.update(STEP);
  assert.ok(coinPosition(reward, game.time).y < before.y, 'base gravity keeps an already captured reward moving');
  assert.equal(game.coins, 0, 'selling cannot instantly award an in-flight coin');
  settle(game);
  assert.equal(game.coins, 1); assert.equal(reward.coin, null);
  assert.equal(outside.coin, 1); assert.equal(outside.coinPull, undefined, 'selling removes the card range for new captures');
});

test('expiring the last gravity power preserves in-flight coins and restores the base capture range', () => {
  const game = arena(false), reward = lane(game, 1, { coin: 0 });
  const power = game.run.catalog.get('power-coin-rush');
  game.run.advanceScore(100); assert.equal(game.openMarket(), true);
  game.run.market.offers.push({ id: 'fixture-gravity-power', itemId: power.id, price: power.price, sold: false });
  game.run.creditCoins(power.price); assert.equal(game.run.buy('fixture-gravity-power').ok, true);
  game.closeMarket();
  game.update(STEP); assert.ok(reward.coinPull.speed > 0);
  game.run.tick(power.duration - STEP - .001);
  const before = coinPosition(reward, game.time), outside = lane(game, 0, { coin: 1 });
  game.update(STEP);
  assert.equal(game.run.effects.coinRadius, .1);
  assert.ok(coinPosition(reward, game.time).y < before.y, 'base gravity keeps an already captured reward moving');
  assert.equal(game.coins, 0, 'expiration cannot instantly pay a distant reward');
  settle(game);
  assert.equal(game.coins, 1); assert.equal(reward.coin, null);
  assert.equal(outside.coin, 1); assert.equal(outside.coinPull, undefined, 'expiration removes power range for new captures');
});

test('attraction changes direction with a moving duck and strengthens near the target without overshooting', () => {
  const moving = { x: 1, y: 0, z: .2, speed: 0 };
  advanceCoinPull(moving, 0, 0, 0, STEP);
  assert.ok(moving.x < 1 && moving.x > 0); assert.ok(moving.z < .2 && moving.z > 0);
  const before = { ...moving };
  advanceCoinPull(moving, 1, 1, .4, STEP);
  assert.ok(moving.x > before.x && moving.y > before.y && moving.z > before.z, 'an already attracted coin follows the new target');
  assert.ok(moving.speed > before.speed);
  const near = { x: .3, y: 0, z: 0, speed: 0 }, far = { x: 1.2, y: 0, z: 0, speed: 0 };
  advanceCoinPull(near, 0, 0, 0, STEP); advanceCoinPull(far, 0, 0, 0, STEP);
  assert.ok(near.speed > far.speed, 'nearer targets exert greater attraction');
  advanceCoinPull(moving, .4, -.2, .15, 10);
  assert.ok(Math.abs(moving.x - .4) < 1e-12 && Math.abs(moving.y + .2) < 1e-12 && Math.abs(moving.z - .15) < 1e-12, 'large steps stop at the target');
  const stopped = { ...moving };
  for (const dt of [0, -1, NaN, Infinity]) advanceCoinPull(moving, 3, 4, 5, dt);
  assert.deepEqual(moving, stopped, 'invalid or stopped clocks cannot displace a coin');
});

test('coins already following the duck move through a hop but pay only on safe grounded contact', () => {
  const game = arena(), reward = lane(game, 0, { coin: 1 });
  game.update(0); assert.ok(reward.coinPull);
  assert.equal(game.move('forward'), true);
  // An in-flight reward reaches the interpolated player position while the
  // duck is still airborne; contact must wait for a safe completed hop.
  Object.assign(reward.coinPull, { x: 0, y: .5, z: 0, speed: 8 });
  game.update(HOP_TIME / 2);
  assert.equal(game.groundY, .5); assert.equal(game.hop, HOP_TIME / 2);
  assert.deepEqual(coinPosition(reward, game.time), { x: 0, y: .5 });
  assert.equal(game.coins, 0); assert.notEqual(reward.coin, null);
  game.update(HOP_TIME / 2);
  assert.equal(game.state, 'playing'); assert.equal(game.hop, 0);
  settle(game, .5); assert.equal(game.coins, 1); assert.equal(reward.coin, null);
});

test('a magnet reward never pays before a lethal water landing is resolved', () => {
  const game = arena(), reward = lane(game, 0, { coin: 1 }), events = [];
  game.setCharacter('sunny'); // Water Bounce is covered in the power suite.
  game.onCoin = amount => events.push(amount);
  game.update(0); lane(game, 1, { kind: 'river', phase: 10, length: 2 });
  assert.equal(game.move('forward'), true);
  Object.assign(reward.coinPull, { x: 0, y: 1, z: 0, speed: 8 });
  game.update(HOP_TIME);
  assert.equal(game.state, 'dead'); assert.equal(game.deathCause, 'water');
  assert.equal(game.coins, 0); assert.equal(game.run.wallet, 0); assert.deepEqual(events, []);
  const frozen = structuredClone(reward.coinPull); settle(game);
  assert.deepEqual(reward.coinPull, frozen); assert.deepEqual(events, []);
});

test('pause and an open market freeze attraction and resume without a jump or duplicate reward', () => {
  const game = arena(), reward = lane(game, 1, { coin: 0 });
  game.update(STEP);
  const snapshot = () => ({ time: game.time, coin: structuredClone(reward.coinPull), position: coinPosition(reward, game.time), coins: game.coins });
  game.pause(); const paused = snapshot(); game.update(100); assert.deepEqual(snapshot(), paused);
  game.resume(); game.update(STEP); assert.ok(reward.coinPull.y < paused.coin.y);
  game.run.advanceScore(200); assert.equal(game.openMarket(), true);
  const shopping = snapshot(); game.update(100); assert.deepEqual(snapshot(), shopping);
  game.closeMarket(); game.update(STEP);
  assert.ok(reward.coinPull.y < shopping.coin.y && reward.coinPull.y > .2);
  settle(game); assert.equal(game.coins, 1);
});

test('river rewards leave the moving platform continuously and lower toward the duck with matching render coordinates', () => {
  const game = arena(), reward = lane(game, 1, { kind: 'river', coin: 0, coinActor: 0, phase: .5, speed: 1.5 });
  const before = coinPosition(reward, game.time), later = coinPosition(reward, game.time + .1);
  assert.ok(later.x > before.x, 'uncaptured coin rides its moving platform');
  game.update(0);
  assert.deepEqual(coinPosition(reward, game.time), before, 'capture cannot teleport the reward');
  assert.equal(reward.coinPull.z, platformSurface(reward));
  game.update(STEP);
  const point = coinPosition(reward, game.time);
  assert.ok(point.x < before.x && point.y < before.y, 'captured reward leaves the platform and follows the duck');
  assert.ok(reward.coinPull.z > 0 && reward.coinPull.z < platformSurface(reward), 'platform height interpolates instead of snapping to the ground');

  // Record world-space draw calls from the actual Renderer. Canvas raster work
  // is irrelevant here: the contract is that drawing and collection use one point.
  const context = { clearRect() {}, fillRect() {}, save() {}, restore() {} };
  const renderer = new Renderer({ getContext: () => context });
  renderer.width = 900; renderer.height = 600; renderer.scale = 40; renderer.reduced = true;
  renderer.lane = () => {}; renderer.model = () => {}; renderer.turnedModel = () => {};
  const cubes = [], shadows = [];
  renderer.cube = (voxel, x, y, lift) => { cubes.push({ color: voxel.color, x, y, lift }); };
  renderer.shadow = (x, y, radius, lift) => { if (radius === .3) shadows.push({ x, y, lift }); };
  renderer.draw(game, 'butter', 0);
  const expected = { ...point, lift: reward.coinPull.z };
  assert.deepEqual(shadows, [expected]);
  assert.deepEqual(cubes.filter(cube => cube.color === '#f1cd64' || cube.color === '#fff1a1').map(({ color, ...position }) => position), [expected, expected]);
});

test('identical seed, card and fixed player inputs reproduce the full attraction trajectory and reward timing', () => {
  function run() {
    const game = arena(); lane(game, 0, { coin: 1 }); lane(game, 1, { coin: 0 });
    const trace = [], paid = []; game.onCoin = value => paid.push({ value, time: game.time });
    for (let tick = 0; tick < 160; tick++) {
      if (tick === 8) assert.equal(game.move('right'), true);
      if (tick === 32) assert.equal(game.move('forward'), true);
      if (tick === 64) assert.equal(game.move('left'), true);
      game.update(STEP);
      trace.push({ x: game.groundX, y: game.groundY, coins: game.coins, rewards: [0, 1].map(row => ({ point: coinPosition(game.rows.get(row), game.time), pull: structuredClone(game.rows.get(row).coinPull) })) });
    }
    assert.equal(game.coins, 2); assert.equal(paid.length, 2);
    assert.ok(trace.some(frame => frame.rewards.some(reward => reward.pull?.speed > 0)));
    return { seed: game.seedCode, trace, paid };
  }
  assert.deepEqual(run(), run());
});
