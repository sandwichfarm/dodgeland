import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { loadSources } from './source-loader.mjs';
import { turnReuseAttribution } from './turn-reuse-attribution.mjs';

const sources = await loadSources(['game', 'race', 'market/catalog']);
const { Game } = await sources.import('game');
const { createRaceSession, RaceCoordinator } = await sources.import('race');
const { ITEM_CATALOG } = await sources.import('market/catalog');
const authority = { Game, ...await sources.import('session'), ...await sources.import('mode-rules') };
const reuse = await turnReuseAttribution({ mode: 'race', factory: createRaceSession,
  Coordinator: RaceCoordinator, authority, lifetimes: 4 });
after(async () => { await reuse.finish(); await sources.dispose(); });

const tick = session => session.update(1 / 120);
function hop(session, seat) {
  assert.equal(session.dispatch({ seat, direction: 'forward' }), true);
  const player = session.players.find(p => p.seat === seat);
  for (let n = 0; n < 120 && player.hop > 0; n++) tick(session);
  assert.equal(player.hop, 0);
}
const personal = p => structuredClone({ wallet: p.run.wallet, cards: p.run.cards,
  cosmetics: p.run.cosmetics, health: p.health, earned: p.earnedDistance,
  completed: p.completedForwardTiles, recovery: p.recovery, deaths: p.statistics.deaths });

for (const base of ['arcade', 'stroll']) for (const blockedReturn of [false, true])
test(`Race/${base}: disconnect clears leave intent; ${blockedReturn ? 'unsafe return waits' : 'replacement lease stays current'}`, () => {
  const game = new Game(113, 'pond', base, false, ITEM_CATALOG, 'butter');
  // Safe approach and bounded obstacle changes are explicit terrain fixtures.
  // Device ownership, motion, leave state and safe-return search remain real.
  for (const row of game.rows.values()) Object.assign(row, {
    kind: 'meadow', blocked: [], decorations: [], coin: null, actors: undefined,
  });
  const witness = reuse.lifetime(), race = witness.acquire(game, { seats: [
    { seat: 'p1', device: 'gamepad-0', characterId: 'butter' },
    { seat: 'p2', device: 'gamepad-1', characterId: 'sunny' },
  ] }), session = race.session, [first, second] = session.players;
  first.run.creditCoins(19); second.run.creditCoins(23);
  witness.interval('leave-intent-disconnect', () => {
    for (let n = 0; n < 4; n++) hop(session, 'p1');
    assert.equal(race.command(race.actionToken('p1'), 'confirm'), false);
    assert.equal(race.command(race.actionToken('p2'), 'leave'), true);
    assert.equal(race.confirmingLeave, 'p2');
    assert.equal(race.command(race.actionToken('p1'), 'cancel'), false,
      'another player cannot dismiss this racer’s confirmation');
    const pending = race.actionToken('p2'), before = personal(second);
    assert.equal(session.deviceLost('p2'), true);
    assert.equal(race.confirmingLeave, undefined, 'controller loss clears stale leave intent');
    assert.equal(race.command(pending, 'confirm'), false);
    assert.equal(race.status('p2'), 'disconnected-grace');
    assert.equal(session.dispatch({ seat: 'p2', direction: 'forward' }), false);
    assert.deepEqual(personal(second), before);
    const time = game.time; hop(session, 'p1');
    assert.ok(game.time > time, 'the connected racer keeps playing');
    assert.equal(first.completedForwardTiles, 5);
  });
  witness.interval('versioned-safe-reclaim', () => {
    const before = personal(second), ground = { x: second.groundX, y: second.groundY };
    const originalToken = race.reclaimToken('p2'); assert.ok(originalToken);
    assert.equal(session.offerReclaim('p2', ''), false);
    assert.equal(session.offerReclaim('p2', 'gamepad-9'), false,
      'a replacement needs the coordinator’s authorized transaction');
    assert.equal(session.offerReclaim('p2', second.device), true);
    assert.equal(race.reclaim(originalToken, 'gamepad-9'), false,
      'a lifecycle change invalidates the earlier lease');
    const token = race.reclaimToken('p2'); assert.ok(token);
    assert.equal(race.reclaim(token, first.device), false,
      'another active player keeps exclusive ownership of its device');
    if (blockedReturn) {
      for (let y = Math.floor(ground.y) - 2; y <= Math.floor(ground.y); y++) {
        const row = game.rows.get(y); assert.ok(row);
        row.blocked = Array.from({ length: 13 }, (_, n) => n - 6);
      }
      assert.equal(race.reclaim(token, 'gamepad-9'), false,
        'no safe cell means wait instead of placing into an obstacle');
      assert.equal(second.device, 'gamepad-1');
      assert.equal(second.participation, 'device-lost');
      assert.deepEqual({ x: second.groundX, y: second.groundY }, ground);
      assert.deepEqual(personal(second), before);
      game.rows.get(Math.floor(ground.y)).blocked = [];
    }
    assert.equal(race.reclaim(token, 'gamepad-9'), true);
    assert.equal(second.device, 'gamepad-9'); assert.equal(second.participation, 'active');
    assert.equal(race.reclaimToken('p2'), undefined);
    assert.equal(race.reclaim(token, 'gamepad-8'), false);
    const reclaimed = personal(second);
    assert.deepEqual(reclaimed.recovery.aliases,
      [...new Set([...before.recovery.aliases, 'device:gamepad-9'])].sort(),
      'the replacement joins recovery provenance without granting another charge');
    assert.deepEqual({ ...reclaimed, recovery: { ...reclaimed.recovery, aliases: before.recovery.aliases } }, before);
    assert.ok(second.groundY <= ground.y); assert.equal(second.hop, 0);
    assert.equal(race.confirmingLeave, undefined);
    assert.equal(race.command(race.actionToken('p2'), 'confirm'), false,
      'reconnection cannot accept the discarded leave confirmation');
    assert.equal(race.command(race.actionToken('p2'), 'leave'), true);
    assert.equal(race.command(race.actionToken('p2'), 'cancel'), true);
    assert.equal(second.participation, 'active');
    hop(session, 'p2'); assert.equal(second.completedForwardTiles, before.completed + 1);
    assert.equal(first.run.wallet, 19); assert.equal(second.run.wallet, 23);
    assert.equal(session.result, undefined);
  });
  witness.finish();
});
