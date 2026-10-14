import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const source = await loadSources(['game', 'market/catalog']);
after(source.dispose);
const { Game, generateLane, HOP_TIME } = await source.import('game');
const { ITEM_CATALOG } = await source.import('market/catalog');
const looks = ITEM_CATALOG.filter(item => item.kind === 'cosmetic');

function arena(mode = 'stroll') {
  const game = new Game(71, 'pond', mode, false, ITEM_CATALOG);
  for (const lane of game.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
  game.state = 'playing'; return game;
}
function buy(game, ids) {
  game.run.advanceScore(100); assert.equal(game.openMarket(), true); game.run.creditCoins(1000);
  for (const id of ids) {
    const item = game.run.catalog.get(id);
    game.run.market.offers.push({ id: `spill-${id}`, itemId: id, price: item.price, sold: false });
    assert.equal(game.run.buy(`spill-${id}`).ok, true, id);
  }
  game.closeMarket();
}

test('death snapshots the unspent wallet and every look before cleanup and the end callback', () => {
  const game = arena(); buy(game, [...looks.map(item => item.id), 'magnet']);
  game.run.wallet = 17; game.coins = 238;
  assert.ok(game.run.equippedCosmetics.length < looks.length, 'fixture includes unequipped looks');
  game.x = 1; game.fromX = 0; game.hop = HOP_TIME / 2;
  const beforeRows = JSON.stringify([...game.rows]), origin = { x: game.groundX, y: game.groundY };
  let callback;
  game.onEnd = () => { callback = { alive: game.run.alive, wallet: game.run.wallet, cards: game.run.cards.length,
    looks: game.run.cosmetics.length, equipped: game.run.equippedCosmetics.length, spill: game.deathSpill }; };
  game.end('Head-on collision', 'traffic', 'front');
  assert.equal(game.state, 'dead'); assert.equal(game.health, 0); assert.equal(game.deathCause, 'traffic');
  assert.deepEqual({ ...callback, spill: null }, { alive: false, wallet: 0, cards: 0, looks: 0, equipped: 0, spill: null });
  assert.equal(callback.spill, game.deathSpill);
  assert.equal(game.deathSpill.wallet, 17, 'lifetime/run coins are not spilled after spending');
  assert.equal(game.deathSpill.drops.filter(drop => drop.kind === 'coin').length, 17);
  assert.deepEqual(game.deathSpill.cosmetics, looks);
  assert.deepEqual(game.deathSpill.drops.filter(drop => drop.kind === 'cosmetic').map(drop => drop.item), looks);
  for (const drop of game.deathSpill.drops) assert.deepEqual({ x: drop.originX, y: drop.originY }, origin);
  assert.equal(JSON.stringify([...game.rows]), beforeRows, 'death leaves seeded terrain untouched');
});

test('only confirmed death spills belongings: shields, innate rescue and nonfatal hits keep them', () => {
  const shielded = arena(); buy(shielded, ['power-shield']);
  const wallet = shielded.run.wallet;
  shielded.end('Water', 'water'); assert.equal(shielded.state, 'playing'); assert.equal(shielded.deathSpill, null);
  assert.equal(shielded.run.wallet, wallet);
  const duck = arena(); duck.run.creditCoins(13); duck.end('Water', 'water');
  assert.ok(duck.powerRescue); assert.equal(duck.state, 'playing'); assert.equal(duck.deathSpill, null); assert.equal(duck.run.wallet, 13);
  const hurt = arena(); hurt.run.creditCoins(5);
  hurt.rows.set(0, { ...generateLane(hurt.seed, 0, hurt.home), kind: 'road', phase: 0, speed: 0, spacing: 20, length: 1.15, blocked: [], decorations: [], coin: null });
  hurt.y = hurt.fromY = -1; assert.equal(hurt.move('forward'), true);
  for (let tick = 0; tick < 30; tick++) hurt.update(1 / 120);
  assert.equal(hurt.health, 1); assert.equal(hurt.state, 'playing'); assert.equal(hurt.deathSpill, null); assert.equal(hurt.run.wallet, 5);
});

test('actual fatal river, traffic, train and wave contacts produce exactly one spill', () => {
  for (const cause of ['water', 'traffic', 'train', 'wave']) {
    const game = arena(cause === 'wave' ? 'arcade' : 'stroll'); game.setCharacter('sunny'); game.run.creditCoins(4);
    // Sunny has no protection against these water/train/wave cases; Butter has no road power.
    if (cause === 'traffic') game.setCharacter('butter');
    let ended = 0; game.onEnd = () => ended++;
    if (cause === 'water') game.rows.set(0, { ...generateLane(game.seed, 0, game.home), kind: 'river', phase: 10, speed: 0, spacing: 20, length: 1, blocked: [], coin: null });
    if (cause === 'traffic') {
      game.rows.set(0, { ...generateLane(game.seed, 0, game.home), kind: 'road', phase: 0, speed: 0, spacing: 20, length: 1.15, blocked: [], coin: null });
      game.x = game.fromX = .975; assert.equal(game.move('left'), true);
    }
    if (cause === 'train') game.rows.set(0, { ...generateLane(game.seed, 0, game.home), kind: 'rail', phase: 2.375, period: 9, warning: 1.5, speed: 1, blocked: [], coin: null });
    if (cause === 'wave') game.waveRow = game.groundY;
    for (let step = 0; step < 30 && game.state === 'playing'; step++) game.update(1 / 120);
    assert.equal(game.state, 'dead', cause); assert.equal(game.deathCause, cause); assert.equal(ended, 1);
    const spill = game.deathSpill; assert.equal(spill.wallet, 4);
    game.end('Repeated contact', cause); game.update(10);
    assert.equal(game.deathSpill, spill); assert.equal(ended, 1);
  }
});

test('the explicit visual clock cannot advance the dead world, score, market, terrain or seed stream', () => {
  const game = arena(); game.run.creditCoins(9); game.end('Traffic', 'traffic');
  const before = { time: game.time, score: game.maxY, wave: game.waveRow, seed: game.seedCode,
    rows: JSON.stringify([...game.rows]), wallet: game.run.wallet, coins: game.coins, revision: game.run.revision };
  game.update(30); assert.equal(game.deathSpill.age, 0, 'simulation updates cannot bypass the visible/focused visual clock');
  for (const dt of [-1, NaN, Infinity, 0]) game.advanceDeathVisuals(dt);
  assert.equal(game.deathSpill.age, 0);
  game.advanceDeathVisuals(.25); assert.equal(game.deathSpill.age, .25);
  game.advanceDeathVisuals(50); assert.equal(game.deathSpill.age, 3, 'visual clock caps settled work');
  assert.deepEqual({ time: game.time, score: game.maxY, wave: game.waveRow, seed: game.seedCode,
    rows: JSON.stringify([...game.rows]), wallet: game.run.wallet, coins: game.coins, revision: game.run.revision }, before);
  assert.equal(game.move('forward'), false); assert.equal(game.openMarket(), false);
  const retry = Game.fromSeed(game.seedCode, ITEM_CATALOG);
  assert.equal(retry.deathSpill, null); assert.equal(retry.run.wallet, 0); assert.deepEqual(retry.run.cosmetics, []);
  retry.advanceDeathVisuals(3); assert.equal(retry.deathSpill, null);
});

test('empty runs die cleanly without invented coins or cosmetics', () => {
  const game = arena(); game.end('Traffic', 'traffic');
  assert.equal(game.deathSpill.wallet, 0); assert.deepEqual(game.deathSpill.cosmetics, []); assert.deepEqual(game.deathSpill.drops, []);
});
