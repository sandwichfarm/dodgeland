import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'mode-rules', 'market/catalog']);
after(() => sources.dispose());
const { Game, HOP_TIME, MAX_HEALTH, WAVE_TRAIL } = await sources.import('game');
const {
  composeModeDefinition, soloModeDefinition, SOLO_ARCADE_MODE, SOLO_STROLL_MODE,
} = await sources.import('mode-rules');
const { ITEM_CATALOG } = await sources.import('market/catalog');
const { mobPacing } = await sources.import('mobs');

function customRules(overrides = {}) {
  return composeModeDefinition({
    id: 'test-fast-lanes',
    simulation: { worldTimeScale: .5, fixedStep: 1 / 60 },
    movement: { hopDuration: .28 },
    health: { maxHealth: 4, rearDamage: .5, sideDamage: 1, frontDamage: 2, hurtRecovery: .25, regenerationInterval: 2, regenerationAmount: 1 },
    pursuit: { strategy: 'wave', grace: 0, speed: .4, waveTrail: 9, trailingLimit: 9, warningSeconds: 3 },
    retention: { rowsBehind: 10, rowsAhead: 28, pickupBindingAhead: 8, captureDistance: .5, pullCompletionDistance: .2 },
    pursuers: { enabled: false, introductionThresholds: [160, 320, 480] },
    presentation: { pursuitVisible: false },
    lifecycle: { onStart: () => {}, onProgress: () => {}, onPause: () => {}, onResume: () => {}, onTerminal: () => {} },
    ...overrides,
  });
}

test('solo definitions are frozen, preserve released identities, and clone nested caller input', () => {
  assert.equal(SOLO_ARCADE_MODE.id, 'arcade');
  assert.equal(SOLO_STROLL_MODE.id, 'stroll');
  assert.equal(soloModeDefinition('stroll'), SOLO_STROLL_MODE);
  const source = { id: 'copied', simulation: { worldTimeScale: .5 }, pursuers: { introductionThresholds: [12, 24, 48] }, lifecycle: { onStart: () => {} } };
  const definition = composeModeDefinition(source);
  source.simulation.worldTimeScale = 9;
  source.pursuers.introductionThresholds.push(96);
  assert.equal(definition.rules.simulation.worldTimeScale, .5);
  assert.deepEqual(definition.rules.pursuers.introductionThresholds, [12, 24, 48]);
  assert.throws(() => { definition.rules.simulation.worldTimeScale = 1; }, TypeError);
  assert.throws(() => { definition.rules.pursuers.introductionThresholds.push(640); }, TypeError);
  assert.equal(Object.isFrozen(definition), true);
  assert.equal(Object.isFrozen(definition.rules.health), true);
});

test('composer rejects invalid numeric, policy, retention, and fixed-world inputs by field', () => {
  const invalid = [
    [{ simulation: { worldTimeScale: Infinity } }, /simulation\.worldTimeScale/],
    [{ simulation: { worldTimeScale: NaN } }, /simulation\.worldTimeScale/],
    [{ simulation: { fixedStep: 1e-9 } }, /simulation\.fixedStep/],
    [{ movement: { hopDuration: 0 } }, /movement\.hopDuration/],
    [{ health: { maxHealth: 2, frontDamage: 3 } }, /health\.frontDamage/],
    [{ pursuit: { strategy: 'wave', grace: -1 } }, /pursuit\.grace/],
    [{ retention: { rowsBehind: 9 } }, /retention\.rowsBehind/],
    [{ retention: { rowsAhead: 1e6 } }, /retention\.rowsAhead/],
    [{ pursuers: { enabled: 'yes' } }, /pursuers\.enabled/],
    [{ pursuers: { firstSpawnTime: -1 } }, /pursuers\.firstSpawnTime/],
    [{ pursuers: { minimumSpawnInterval: 19 } }, /pursuers\.minimumSpawnInterval/],
    [{ pursuers: { populationCap: 5 } }, /pursuers\.populationCap/],
    [{ economy: { inventoryCapacity: 7, inventoryLimit: 6 } }, /economy\.inventoryCapacity/],
    [{ economy: { baseCoinGravity: 1.5 } }, /economy\.baseCoinGravity/],
    [{ pursuit: { trailingLimit: 11 } }, /pursuit\.trailingLimit/],
    [{ movement: { halfWidth: 4 } }, /movement\.halfWidth/],
    [{ simulation: { impossible: 1 } }, /simulation\.impossible/],
    [{ madeUp: true }, /madeUp/],
  ];
  for (const [input, message] of invalid) assert.throws(() => composeModeDefinition(input), message);
});

test('authoring rejects malformed definitions and incompatible policies without altering playable defaults', () => {
  const defaults = composeModeDefinition();
  const before = JSON.stringify(defaults.rules);
  assert.equal(defaults.id, 'custom');
  const invalid = [
    ...[null, 'arcade', []].map(input => [input, /definition/]),
    ...[null, 1, []].map(input => [{ simulation: input }, /simulation/]),
    ...[12, 'Mixed Case'].map(id => [{ id }, /id/]),
    [{ pursuit: { strategy: 'unknown' } }, /pursuit\.strategy/],
    [{ pursuit: { strategy: 'trail' }, presentation: { pursuitVisible: true } }, /presentation\.pursuitVisible/],
    [{ retention: { rowsAhead: 28, pickupBindingAhead: 29 } }, /retention\.pickupBindingAhead/],
    ...[null, [1, 2], [1, 2, 2], [0, 2, 3], [1, 2, 3.5]].map(introductionThresholds =>
      [{ pursuers: { introductionThresholds } }, /pursuers\.introductionThresholds/]),
    [{ presentation: { pursuitVisible: 'yes' } }, /presentation\.pursuitVisible/],
    ...['onStart', 'onProgress', 'onPause', 'onResume', 'onTerminal'].map(key =>
      [{ lifecycle: { [key]: true } }, new RegExp(`lifecycle\\.${key}`)]),
  ];
  for (const [input, message] of invalid) {
    const supplied = structuredClone(input);
    assert.throws(() => composeModeDefinition(input), message);
    assert.deepEqual(input, supplied, 'a rejected definition must not mutate caller input');
    assert.equal(JSON.stringify(defaults.rules), before, 'rejection must not alter existing rules');
  }
  const fresh = composeModeDefinition();
  assert.deepEqual(fresh.rules, defaults.rules);
  const game = new Game(7, 'pond', 'arcade', false, [], 'butter', { definition: fresh });
  assert.equal(game.move('forward'), true, 'valid defaults remain playable after invalid authoring attempts');
});

test('custom definitions drive game clocks, health, pursuit, movement, and lifecycle without changing seed identity', () => {
  const events = [];
  const definition = customRules({ lifecycle: {
    onStart: event => events.push(event.type), onProgress: event => events.push(event.type),
    onPause: event => events.push(event.type), onResume: event => events.push(event.type),
    onTerminal: event => events.push(event.type),
  } });
  const game = new Game(7, 'pond', 'arcade', false, [], 'butter', { definition });
  assert.equal(game.definition, definition);
  assert.equal(game.rules.movement.hopDuration, .28);
  assert.equal(game.maxHealth, 4); assert.equal(game.health, 4);
  assert.equal(game.seedCode.includes('-a-'), true, 'the released arcade identity remains encoded');
  assert.equal(game.move('forward'), true); assert.equal(game.hop, .28);
  game.update(.1); assert.equal(game.time, .05);
  assert.ok(events.includes('start')); assert.ok(events.includes('progress'));
  game.pause(); game.resume(); assert.ok(events.includes('pause')); assert.ok(events.includes('resume'));
  game.waveRow = -4; game.maxY = 0; game.update(1);
  assert.equal(game.waveRow, -3.8, 'the custom pursuit speed and world clock advance the real wave');
  const impact = new Game(11, 'pond', 'arcade', false, [], 'butter', { definition });
  impact.state = 'playing'; impact.waveRow = -100; impact.health = 1;
  impact.x = impact.fromX = -.975;
  Object.assign(impact.rows.get(0), { kind: 'road', blocked: [], decorations: [], coin: null, speed: 1, phase: 0, spacing: 20, length: 1.15 });
  assert.equal(impact.move('right'), true); impact.update(.28);
  assert.equal(impact.health, .5, 'the custom rear-contact damage reaches real collision handling');
  impact.maxY = 1; impact.y = impact.fromY = 1; impact.hop = 0; impact.rows.get(2).blocked = [];
  assert.equal(impact.move('forward'), true); assert.equal(impact.health, 1.5, 'the custom regeneration interval and amount apply');
  game.end('test terminal'); assert.ok(events.includes('terminal'));
});

test('custom retention bounds are reached by real row streaming without widening the generated course', () => {
  const definition = customRules({ retention: { rowsBehind: 11, rowsAhead: 30, pickupBindingAhead: 9, captureDistance: .6, pullCompletionDistance: .25 } });
  const game = new Game(8, 'pond', 'arcade', false, [], 'butter', { definition });
  game.maxY = 12; game.ensureRows();
  assert.equal(Math.min(...game.rows.keys()), 1);
  assert.equal(Math.max(...game.rows.keys()), 42);
  assert.equal(game.rules.movement.halfWidth, 5);
});

test('custom economy rules drive live invitations, capacity, and baseline coin capture', () => {
  const definition = customRules({ economy: {
    marketInterval: 7, marketWindowSeconds: 2, inventoryCapacity: 4, inventoryLimit: 4, baseCoinGravity: .4,
  } });
  const game = new Game(52, 'pond', 'arcade', false, ITEM_CATALOG, 'butter', { definition });
  game.state = 'playing';
  for (const lane of game.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
  assert.equal(game.run.cardCapacity, 4, 'the instance policy changes the actual hand bound');
  game.run.advanceScore(6); assert.equal(game.run.market, null);
  game.run.advanceScore(7); assert.equal(game.run.market.remaining, 2, 'the live market opens at the configured cadence');
  const reward = game.rows.get(0);
  reward.coin = .7;
  game.update(0);
  assert.equal(game.run.effects.coinRadius, .4);
  assert.ok(reward.coinPull, 'the non-default baseline reach captures a real separated coin');
  assert.equal(game.openMarket(), true);
  let offer = 0;
  const buy = id => {
    const item = ITEM_CATALOG.find(candidate => candidate.id === id);
    const stock = { id: `custom-${offer++}`, itemId: item.id, price: item.price, sold: false };
    game.run.market.offers.push(stock); game.run.creditCoins(item.price);
    return game.run.buy(stock.id);
  };
  const pocket = buy('extra-pocket'); assert.equal(pocket.ok, true);
  const firstMagnet = buy('magnet'); assert.equal(firstMagnet.ok, true);
  assert.equal(game.run.effects.coinRadius, 1.15, 'the card modifier adds to the configured base exactly once');
  assert.equal(game.run.sell(firstMagnet.cards[0].id).ok, true);
  assert.equal(game.run.effects.coinRadius, .4, 'selling restores this run’s configured baseline');
  assert.equal(buy('magnet').ok, true); assert.equal(buy('magnet').ok, true); assert.equal(buy('magnet').ok, true);
  assert.equal(game.run.cards.length, 4);
  assert.match(buy('magnet').message, /Hand full/, 'the configured hard limit caps an expanding slot card at four');
  game.closeMarket(); game.run.tick(2); assert.equal(game.run.market, null, 'the configured invitation window actually expires');
});

test('custom pursuer rules drive real unlocks, cadence, and population bounds', () => {
  const definition = customRules({ pursuers: {
    enabled: true, introductionThresholds: [5, 10, 15], firstSpawnTime: 0,
    minimumSpawnProgress: 1, spawnInterval: 3, minimumSpawnInterval: 2,
    intervalProgress: 5, populationCap: 3,
  } });
  assert.deepEqual(mobPacing(15, definition.rules.pursuers), { interval: 2, cap: 3 });
  const game = new Game(19, 'pond', 'arcade', false, [], 'butter', { definition });
  game.state = 'playing'; game.x = game.fromX = 0; game.y = game.fromY = game.maxY = 5; game.time = 0;
  game.ensureRows();
  for (const lane of game.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
  const spawned = []; game.onMobSpawn = mob => spawned.push(mob.kind);
  game.update(0); assert.deepEqual(spawned, ['slime'], 'the configured first active second and unlock are consumed');
  game.mobs.length = 0;
  game.y = game.fromY = game.maxY = 10; game.ensureRows(); game.time = 2.99;
  for (const lane of game.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
  game.update(0); assert.deepEqual(spawned, ['slime'], 'the configured spawn interval holds');
  game.time = 3; game.update(0); assert.deepEqual(spawned, ['slime', 'crab'], 'the next configured species unlocks once progress permits another encounter');
  game.y = game.fromY = game.maxY = 15; game.ensureRows(); game.time = 5;
  for (const lane of game.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
  game.update(0); assert.deepEqual(spawned, ['slime', 'crab', 'wasp']);
  game.y = game.fromY = game.maxY = 16; game.ensureRows(); game.time = 7;
  for (const lane of game.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
  game.update(0); assert.equal(game.mobs.length, 3, 'a non-default cap admits its third pursuer');
  const capped = spawned.length;
  // Keep the already-created bodies inside the director's visible rear bound;
  // this isolates cap policy from the independent stale-body cleanup rule.
  for (const mob of game.mobs) mob.y = mob.fromY = mob.targetY = 16;
  game.y = game.fromY = game.maxY = 17; game.ensureRows(); game.time = 99; game.update(0);
  assert.equal(game.mobs.length, 3); assert.equal(spawned.length, capped, 'the configured cap blocks a fourth pursuer after progress and time gates clear');
  const disabled = new Game(19, 'pond', 'arcade', false, [], 'butter', { definition: customRules({ pursuers: { enabled: false } }) });
  disabled.state = 'playing'; disabled.y = disabled.fromY = disabled.maxY = 1000; disabled.time = 1000; disabled.ensureRows();
  for (const lane of disabled.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
  disabled.update(0); assert.equal(disabled.mobs.length, 0, 'disabled pursuers cannot create an encounter');
});

test('legacy construction, constants, fromSeed, and baseline presets retain their exact public values', () => {
  const arcade = new Game(4); const stroll = new Game(4, 'pond', 'stroll');
  assert.equal(arcade.definition, SOLO_ARCADE_MODE); assert.equal(stroll.definition, SOLO_STROLL_MODE);
  assert.equal(arcade.rules.movement.hopDuration, HOP_TIME);
  assert.equal(arcade.rules.health.maxHealth, MAX_HEALTH);
  assert.equal(arcade.rules.pursuit.waveTrail, WAVE_TRAIL);
  assert.equal(Game.fromSeed(stroll.seedCode).definition, SOLO_STROLL_MODE);
  const forged = Object.freeze({ id: 'forged', rules: Object.freeze({}) });
  assert.throws(() => new Game(9, 'pond', 'arcade', false, [], 'butter', { definition: forged }), /validated immutable mode definition/);
});
