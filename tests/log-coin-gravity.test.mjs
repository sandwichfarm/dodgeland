import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const source = await loadSources(['game', 'actors', 'coin-denominations', 'content']);
after(source.dispose);
const { Game, coinPosition, platformSupports } = await source.import('game');
const { createActorPattern } = await source.import('actors');
const { COIN_DENOMINATIONS } = await source.import('coin-denominations');
const { WORLDS } = await source.import('content');
const STEP = 1 / 60;

function advance(game, seconds) {
  const count = Math.ceil(seconds / STEP);
  for (let tick = 0; tick < count; tick++) game.update(seconds / count);
}

function hop(game, direction) {
  assert.equal(game.move(direction), true);
  while (game.hop > 0 && game.state === 'playing') game.update(Math.min(STEP, game.hop));
  assert.equal(game.state, 'playing');
  assert.equal(game.hop, 0);
}

function riverBank({ mode = 'arcade', direction = 1, schema = 3, world = WORLDS[0], variant = 0, denomination = 'coin' } = {}) {
  const game = new Game({ schema, seed: 23, home: world.id, mode, gentle: false });
  // A safe, finite test course: the duck starts on a real moving platform and
  // the only reward stays at a fixed integer position on its next bank.
  for (const [index, lane] of game.rows) game.rows.set(index, {
    ...lane, kind: 'meadow', world, blocked: [], decorations: [], speed: 0,
    coin: null, coinActor: undefined, coinDenomination: undefined, actors: undefined,
  });
  const river = game.rows.get(0);
  Object.assign(river, { kind: 'river', speed: direction, phase: 0, spacing: 20, length: 4, variant });
  if (schema >= 2) river.actors = createActorPattern('platforms', [
    { kind: 'platform', length: 4, variant, speedFactor: 1, gap: 16 },
  ], 0);
  const reward = game.rows.get(1);
  Object.assign(reward, { coin: 0, coinDenomination: denomination });
  const events = [];
  game.onCoin = value => events.push(value);
  game.state = 'playing';
  assert.equal(platformSupports(river, game.x, game.time), true);
  return { game, reward, river, events };
}

function rideAndLand(fixture, offset, direction) {
  const { game, reward, river } = fixture;
  const clockRate = game.mode === 'stroll' ? .58 : 1;
  advance(game, offset / clockRate);
  const driftedX = direction * offset;
  assert.ok(Math.abs(game.x - driftedX) < 1e-9, 'the moving platform produces the fractional position');
  assert.equal(platformSupports(river, game.x, game.time), true);
  assert.deepEqual(coinPosition(reward, game.time), { x: 0, y: 1 }, 'the bank coin stays in place');
  hop(game, 'forward');
  assert.ok(Math.abs(game.x - driftedX) < 1e-9, 'leaving the log must not snap the personal grid');
  return driftedX;
}

test('a cardless duck can pull in a bank coin after landing exactly half a tile off its grid', () => {
  const fixture = riverBank(), { game, reward, events } = fixture;
  rideAndLand(fixture, .5, 1);
  const landedX = game.x, start = coinPosition(reward, game.time);
  assert.ok(reward.coinPull, 'baseline gravity starts visible attraction without any cards');
  assert.equal(game.coins, 0, 'a separated coin must travel before paying');
  assert.deepEqual(game.run.cards, []);
  assert.deepEqual(game.run.powers, []);
  game.update(STEP);
  const following = coinPosition(reward, game.time);
  assert.ok(following.x > start.x && following.x < landedX, 'the coin moves toward the duck before contact');
  assert.equal(game.coins, 0);
  advance(game, .8);
  assert.equal(game.coins, 1, 'a half-tile log offset must not make the coin unreachable');
  assert.equal(game.run.wallet, 1);
  assert.deepEqual(events, [1]);
  assert.equal(reward.coin, null);
  assert.equal(game.x, landedX, 'attraction moves the coin, not the duck');
});

function collectAfterDrift(options, offset, value = 1) {
  const fixture = riverBank(options), { game, reward, events } = fixture;
  const direction = options.direction;
  const label = `${options.mode}, drift ${direction * offset}, schema ${options.schema ?? 3}, ${options.world?.id ?? 'pond'}/${options.variant ?? 0}, ${options.denomination ?? 'coin'}`;
  assert.deepEqual(game.run.cards, []);
  assert.deepEqual(game.run.powers, []);
  assert.ok(game.run.effects.coinRadius > 0, 'gravity is available without a card');
  rideAndLand(fixture, offset, direction);
  // Every personal grid is a translation of the integer columns. Its nearest
  // position to any column is at most half a tile away. Approach the unchanged
  // x=0 coin using a normal sideways hop when the log carried us further away.
  if (offset > .5) hop(game, direction > 0 ? 'left' : 'right');
  const personalX = game.x;
  assert.ok(Math.abs(personalX) <= .5 + 1e-9, `nearest personal-grid position: ${label}`);
  advance(game, .8);
  assert.equal(game.state, 'playing', label);
  assert.equal(reward.coin, null, `coin must be reachable: ${label}`);
  assert.equal(reward.coinPull, undefined, label);
  assert.equal(game.attractedCoins.size, 0, label);
  assert.equal(game.coins, value, label);
  assert.equal(game.run.wallet, value, label);
  assert.deepEqual(events, [value], `one pickup must pay exactly once: ${label}`);
  assert.equal(game.x, personalX, `collection must preserve the fractional grid: ${label}`);
  hop(game, 'forward');
  advance(game, .3);
  assert.equal(game.x, personalX, `later hops must preserve the fractional grid: ${label}`);
  assert.equal(game.groundX, personalX, label);
  assert.equal(game.run.wallet, value, label);
  assert.deepEqual(events, [value], `later updates must not repeat payment: ${label}`);
}

test('bank coins remain reachable across the entire log-drift interval, in either direction and mode', () => {
  // Dense coverage of one complete repeating unit, plus both sides of its
  // worst-case half-tile gap and its zero/full-tile boundaries. The explicit
  // half-tile case above covers the maximum separation for every translation.
  const offsets = [...new Set([
    ...Array.from({ length: 257 }, (_, index) => index / 256),
    1e-9, .5 - 1e-9, .5 + 1e-9, 1 - 1e-9,
  ])].sort((a, b) => a - b);
  for (const mode of ['arcade', 'stroll']) for (const direction of [-1, 1]) {
    for (const offset of offsets) collectAfterDrift({ mode, direction }, offset);
  }
});

test('worst-case log drift remains collectible on every platform model and supported seed schema', () => {
  for (const schema of [1, 2, 3]) for (const world of WORLDS) {
    for (let variant = 0; variant < world.platforms.length; variant++) {
      for (const mode of ['arcade', 'stroll']) for (const direction of [-1, 1]) {
        collectAfterDrift({ schema, world, variant, mode, direction }, .5);
      }
    }
  }
});

test('every coin denomination pays its correct value once after a half-tile log landing', () => {
  for (const denomination of COIN_DENOMINATIONS) {
    for (const mode of ['arcade', 'stroll']) for (const direction of [-1, 1]) {
      collectAfterDrift({ mode, direction, denomination: denomination.id }, .5, denomination.value);
    }
  }
});
