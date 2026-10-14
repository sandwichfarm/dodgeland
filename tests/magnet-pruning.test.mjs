import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const source = await loadSources(['game', 'render', 'market/items/magnet']);
after(source.dispose);
const { Game, coinPosition } = await source.import('game');
const { Renderer } = await source.import('render');
const { default: magnet } = await source.import('market/items/magnet');
const STEP = 1 / 120;

function clearGround(game) {
  for (const lane of game.rows.values()) {
    Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], speed: 0 });
    if (!lane.coinPull) lane.coin = null;
  }
}
function arena(mode = 'arcade') {
  const game = new Game(23, 'pond', mode, false, [magnet]);
  game.y = game.fromY = game.maxY = 10; game.ensureRows(); clearGround(game);
  game.state = 'playing'; game.run.advanceScore(100); assert.equal(game.openMarket(), true);
  game.run.creditCoins(magnet.price);
  game.run.market.offers.push({ id: 'fixture-magnet', itemId: magnet.id, price: magnet.price, sold: false });
  assert.equal(game.run.buy('fixture-magnet').ok, true);
  game.closeMarket(); game.run.market = null;
  return game;
}
function hop(game) {
  assert.equal(game.move('forward'), true); clearGround(game);
  for (let tick = 0; tick < 17; tick++) game.update(STEP);
  assert.equal(game.state, 'playing'); assert.equal(game.hop, 0);
}
function drawnCoins(game) {
  const context = { clearRect() {}, fillRect() {}, save() {}, restore() {} };
  const renderer = new Renderer({ getContext: () => context });
  renderer.width = 900; renderer.height = 600; renderer.scale = 40; renderer.reduced = true;
  renderer.lane = renderer.model = renderer.turnedModel = renderer.shadow = renderer.wave = () => {};
  const coins = [];
  renderer.cube = (voxel, x, y) => { if (voxel.color === '#f1cd64') coins.push({ x, y }); };
  renderer.draw(game, 'butter', 0);
  return coins;
}

test('a captured coin outlives its pruned source row, remains drawn, and pays exactly once on arrival', () => {
  const game = arena(), reward = game.rows.get(9);
  reward.coin = 0; let payouts = 0; game.onCoin = () => payouts++;
  game.update(0);
  assert.equal(game.attractedCoins.get(9), reward);
  assert.deepEqual(drawnCoins(game), [coinPosition(reward, game.time)], 'source row and attraction registry do not duplicate drawing');
  for (let index = 0; index < 10; index++) hop(game);
  assert.equal(game.maxY, 20); assert.equal(game.rows.has(9), false); assert.equal(game.rows.size, 39);
  assert.equal(game.attractedCoins.get(9), reward, 'pruning terrain does not discard a still-visible reward');
  assert.ok(reward.coinPull.y > game.maxY - 10);
  assert.equal(game.coins, 0); assert.equal(payouts, 0);
  const before = coinPosition(reward, game.time);
  assert.deepEqual(drawnCoins(game), [before], 'the actual renderer finds the reward without its original terrain');
  game.update(STEP);
  const after = coinPosition(reward, game.time);
  assert.ok(after.y > before.y, 'a detached reward keeps approaching the duck');
  assert.deepEqual(drawnCoins(game), [after]);
  for (let tick = 0; tick < 240; tick++) game.update(STEP);
  assert.equal(game.coins, 1); assert.equal(payouts, 1);
  assert.equal(game.attractedCoins.size, 0); assert.equal(reward.coin, null); assert.equal(reward.coinPull, undefined);
  assert.deepEqual(drawnCoins(game), []);
});

test('Stroll discards only rewards that physically leave the retained trail and bounds sustained capture memory', () => {
  const game = arena('stroll'), original = game.rows.get(9);
  original.coin = 0; game.update(0);
  let peak = game.attractedCoins.size, retainedAfterSourcePruned = false;
  for (let index = 0; index < 120; index++) {
    // Attract one real authored reward per row while continuously outrunning it.
    game.lane.coin = 1; game.update(0);
    hop(game);
    peak = Math.max(peak, game.attractedCoins.size);
    assert.equal(game.rows.size, 39);
    for (const reward of game.attractedCoins.values()) assert.ok(reward.coinPull.y >= game.maxY - 10, 'cleanup uses the reward position');
    if (!game.rows.has(9) && game.attractedCoins.has(9)) retainedAfterSourcePruned = true;
  }
  assert.equal(retainedAfterSourcePruned, true);
  assert.equal(game.attractedCoins.has(9), false, 'the first reward eventually leaves the trail and is released');
  assert.equal(original.coin, null); assert.equal(original.coinPull, undefined);
  assert.ok(peak < 40, `capturing across 120 rows retained at most ${peak} rewards`);
  assert.equal(game.coins, 0, 'offscreen cleanup never invents a collection');
  const remaining = game.attractedCoins.size;
  assert.ok(remaining > 0);
  for (let tick = 0; tick < 600; tick++) game.update(STEP);
  assert.equal(game.attractedCoins.size, 0);
  assert.equal(game.coins, remaining, 'remaining nearby rewards can still arrive when the duck stops');
});
