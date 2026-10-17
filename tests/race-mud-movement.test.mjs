import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { loadSources } from './source-loader.mjs';
import { createTurnModelRecorder } from '../tools/release-coverage/turn-model-attribution.mjs';

const sources = await loadSources(['game', 'race', 'market/catalog']);
after(() => sources.dispose());
const { Game } = await sources.import('game');
const { createRaceSession, RaceCoordinator } = await sources.import('race');
const { ITEM_CATALOG } = await sources.import('market/catalog');
const authority = { Game, ...await sources.import('session'), ...await sources.import('mode-rules') };
const config = process.env.DOWN_TO_DUCK_COVERAGE_CONFIG
  ? JSON.parse(await readFile(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG, 'utf8')) : null;
if (config && !config.modelAttribution) throw Error('Missing Race mud movement attribution');
const inventory = config ? JSON.parse(await readFile(config.inventoryPath, 'utf8')) : null;
const records = [];
after(async () => {
  if (!inventory) return;
  assert.equal(records.length, 4);
  await writeFile(config.modelAttribution.output, JSON.stringify({
    ...records.at(-1), intervals: records.flatMap(record => record.intervals),
  }));
});
const STEP = 1 / 120;
const seats = [
  { seat: 'p1', device: 'keyboard-a', characterId: 'butter' },
  { seat: 'p2', device: 'keyboard-b', characterId: 'sunny' },
];
for (const base of ['arcade', 'stroll']) for (const attackingSeat of ['p1', 'p2'])
test(`race/${base}/${attackingSeat}: purchased Mud Splash delays the opponent's next hop and freezes while paused`, () => {
  const recorder = inventory ? createTurnModelRecorder({ mode: 'race', inventory,
    factory: createRaceSession, Coordinator: RaceCoordinator, authority,
    identity: { runId: config.runId, realmId: config.modelAttribution.realmId,
      jobId: config.jobId, artifactHash: config.browserBuilds.modules.artifactHash } }) : null;
  const create = () => {
    const game = Game.fromSeed(`ph3-00000071-pond-${base === 'arcade' ? 'a' : 's'}-n`, ITEM_CATALOG, 'butter');
    // Safe component terrain only. Purchasing, item policy, motion, clocks,
    // progress and pause/resume remain owned by the real Race session.
    for (const lane of game.rows.values()) Object.assign(lane, {
      kind: 'meadow', blocked: [], decorations: [], coin: null,
      coinActor: undefined, coinPull: undefined, actors: undefined,
    });
    return game;
  };
  const acquired = recorder ? recorder.acquireFrom(create, base, { seats })
    : (() => { const game = create(); return { game, owner: createRaceSession(game, { seats }) }; })();
  const { game, owner } = acquired, session = owner.session;
  const attacker = session.players.find(p => p.seat === attackingSeat);
  const target = session.players.find(p => p !== attacker);
  const interval = (id, fn) => recorder ? recorder.interval(id, fn) : fn();
  const tick = () => session.update(STEP);
  const charge = () => session.consumableSnapshot().charges.find(p => p.seat === attacker.seat)['mud-splash'];
  let sequence = 0;
  function transact(kind, fields = {}) {
    const context = session.openCoOpMarket(attacker); assert.ok(context);
    return session.actCoOpMarket({ actionId: `mud-movement-${++sequence}`, kind,
      seat: attacker.seat, device: attacker.device, participantId: attacker.participantId,
      expectedOwnerGeneration: context.ownerGeneration, expectedInventoryGeneration: context.inventoryGeneration,
      expectedRunRevision: context.runRevision, expectedContextGeneration: context.contextGeneration, ...fields });
  }
  let wallet;
  interval('paid-tactical-purchase-and-real-use', () => {
    attacker.run.advanceScore(100); attacker.run.creditCoins(1000); // Explicit market eligibility/funds fixture.
    assert.equal(transact('open').ok, true);
    wallet = attacker.run.wallet;
    assert.equal(transact('buy-consumable', { itemId: 'mud-splash' }).ok, true);
    assert.equal(attacker.run.wallet, wallet - 30); assert.equal(charge(), 1);
    assert.equal(transact('close').ok, true);
    const plan = owner.items.plan(attacker.seat, 'mud-splash', target.seat); assert.equal(plan.ok, true);
    assert.equal(owner.items.commit(plan), true); assert.equal(charge(), 0);
    assert.equal(attacker.statistics.itemsUsed, 1); assert.equal(target.hopCooldown.multiplier, 1.35);
    assert.equal(attacker.hopCooldown.multiplier, 1);
    assert.equal(owner.items.commit(plan), false); assert.equal(attacker.statistics.itemsUsed, 1);
  });
  interval('actual-victim-hops-pause-and-active-expiry', () => {
    const health = target.health;
    assert.equal(session.dispatch({ seat: target.seat, direction: 'forward' }), true);
    assert.equal(target.groundY, 0); assert.equal(target.hop, game.rules.movement.hopDuration);
    for (let n = 0; n < 120 && target.hop > 0; n++) tick();
    assert.equal(target.hop, 0); assert.equal(target.groundY, 1);
    assert.equal(target.completedForwardTiles, 1); assert.equal(target.canHop, false);
    const progress = [target.x, target.y, target.earnedDistance, target.completedForwardTiles];
    assert.equal(session.dispatch({ seat: target.seat, direction: 'forward' }), false);
    assert.deepEqual([target.x, target.y, target.earnedDistance, target.completedForwardTiles], progress);
    game.pause();
    const frozen = structuredClone([game.time, owner.elapsed, target.hopCooldown, progress]);
    for (let n = 0; n < 300; n++) tick();
    assert.deepEqual([game.time, owner.elapsed, target.hopCooldown,
      [target.x, target.y, target.earnedDistance, target.completedForwardTiles]], frozen);
    assert.equal(session.dispatch({ seat: target.seat, direction: 'forward' }), false);
    game.resume();
    let waited = 0;
    while (!target.canHop && waited++ < 120) tick();
    assert.ok(waited > 0 && waited < 120); assert.equal(target.hopCooldown.multiplier, 1.35);
    assert.equal(session.dispatch({ seat: target.seat, direction: 'forward' }), true);
    for (let n = 0; n < 120 && target.hop > 0; n++) tick();
    assert.equal(target.groundY, 2); assert.equal(target.completedForwardTiles, 2);
    for (let n = 0; n < 600 && target.hopCooldown.multiplier !== 1; n++) tick();
    assert.equal(target.hopCooldown.multiplier, 1); assert.equal(target.canHop, true);
    assert.equal(attacker.completedForwardTiles, 0); assert.equal(attacker.earnedDistance, 0);
    assert.equal(attacker.run.wallet, wallet - 30); assert.equal(target.run.wallet, 0);
    assert.equal(target.health, health); assert.equal(target.statistics.deaths, 0);
    assert.equal(target.statistics.innateUses, 0); assert.equal(attacker.statistics.itemsUsed, 1);
  });
  interval('immutable-terminal', () => {
    for (const player of session.players) {
      assert.equal(owner.command(owner.actionToken(player.seat), 'leave'), true);
      assert.equal(owner.command(owner.actionToken(player.seat), 'confirm'), true);
    }
    const result = owner.result, frozen = JSON.stringify(result); assert.ok(Object.isFrozen(result));
    assert.equal(session.dispatch({ seat: target.seat, direction: 'forward' }), false);
    tick(); assert.strictEqual(owner.result, result); assert.equal(JSON.stringify(result), frozen);
  });
  if (recorder) records.push(recorder.finish());
});
