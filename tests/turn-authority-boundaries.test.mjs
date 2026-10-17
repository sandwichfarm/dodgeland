import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { loadSources } from './source-loader.mjs';
import { createTurnModelRecorder } from '../tools/release-coverage/turn-model-attribution.mjs';
import { capturePayload } from '../tools/release-coverage/collector.mjs';

const sources = await loadSources(['game', 'relay', 'race', 'market/catalog']);
after(() => sources.dispose());
const { Game, generateLane } = await sources.import('game');
const { createRelaySession, RelayCoordinator } = await sources.import('relay');
const { createRaceSession, RaceCoordinator } = await sources.import('race');
const { ITEM_CATALOG } = await sources.import('market/catalog');
const authority = { Game, ...await sources.import('session'), ...await sources.import('mode-rules') };
const config = process.env.DOWN_TO_DUCK_COVERAGE_CONFIG
  ? JSON.parse(await readFile(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG, 'utf8')) : null;
if (config && !config.modelAttribution) throw Error('Missing authority-boundary attribution');
const inventory = config ? JSON.parse(await readFile(config.inventoryPath, 'utf8')) : null;
const records = [];
after(async () => {
  if (!inventory) return;
  assert.equal(records.length, 4);
  await writeFile(config.modelAttribution.output, JSON.stringify({
    ...records.at(-1), payload: capturePayload(inventory, globalThis.__coverage__, records.at(-1).identity),
    intervals: records.flatMap(record => record.intervals),
  }));
});
const STEP = 1 / 120;
const seats = [
  { seat: 'p1', device: 'keyboard-a', characterId: 'butter' },
  { seat: 'p2', device: 'keyboard-b', characterId: 'pip' },
];
// Snapshot fields only; no production getter/resolver is called for a hit.
function state(game, session) {
  return structuredClone({ time: game.time, tick: game.world.simulationTick,
    frontier: game.world.frontier, wave: game.waveRow,
    lifecycle: session.lifecycle, archives: session.contributions,
    players: session.players.map(p => ({ seat: p.seat, id: p.participantId,
      character: p.characterId, device: p.device, state: p.state,
      participation: p.participation, lost: p.deviceLostAt,
      pose: [p.x, p.y, p.fromX, p.fromY, p.hop], health: p.health,
      hurt: p.hurtRemaining, earned: p.earnedDistance, completed: p.completedForwardTiles,
      recovery: p.recovery, stats: p.statistics, events: p.interactions,
      wallet: p.run.wallet, cards: p.run.cards, powers: p.run.powers,
      cosmetics: p.run.cosmetics, revision: p.run.revision, random: p.run.state })),
  });
}
function stable(game, session, attempt) {
  const before = state(game, session);
  assert.equal(attempt(), false);
  assert.deepEqual(state(game, session), before);
}

for (const mode of ['relay', 'race']) for (const base of ['arcade', 'stroll'])
test(`${mode}/${base}: damage, reconnect, recovery and teardown keep their owner authority`, () => {
  const factory = mode === 'relay' ? createRelaySession : createRaceSession;
  const Coordinator = mode === 'relay' ? RelayCoordinator : RaceCoordinator;
  const recorder = inventory ? createTurnModelRecorder({ mode, inventory, factory, Coordinator,
    authority, identity: { runId: config.runId, realmId: config.modelAttribution.realmId,
      jobId: config.jobId, artifactHash: config.browserBuilds.modules.artifactHash } }) : null;
  const create = () => {
    const game = Game.fromSeed(`ph3-00000071-pond-${base === 'arcade' ? 'a' : 's'}-n`, ITEM_CATALOG, 'butter');
    // Explicit safe component arena. No clock, progress, charge, lifecycle,
    // callback or mode definition is injected or replaced.
    for (let y = -8; y < 12; y++) game.rows.set(y, {
      ...generateLane(game.seed, y, game.home), kind: 'meadow', blocked: [],
      decorations: [], coin: null, coinActor: undefined, actors: undefined,
    });
    return game;
  };
  const acquired = recorder ? recorder.acquireFrom(create, base, { seats })
    : (() => { const game = create(); return { game, owner: factory(game, { seats }) }; })();
  const { game, owner } = acquired, session = owner.session, [p, other] = session.players;
  const interval = (id, action) => recorder ? recorder.interval(id, action) : action();
  const ticks = count => { for (let n = 0; n < count; n++) session.update(STEP); };
  const hit = { amount: .5, cause: 'fog', reason: 'Arranged nonfatal authority impact.' };
  const noDamage = (seat, request) => {
    const before = state(game, session);
    assert.deepEqual(session.damage(seat, request), { landed: 0, fatal: false });
    assert.deepEqual(state(game, session), before);
  };

  interval('living-owner-and-damage-validation', () => {
    // A correct closed-roster proposal must still be rejected in live play.
    stable(game, session, () => session.admit({ seat: 'p3', device: 'gamepad-3', characterId: 'sunny' }));
    stable(game, session, () => session.dispatch({ seat: 'p4', direction: 'forward' }));
    stable(game, session, () => session.declineRecovery('p4'));
    stable(game, session, () => session.declineRecovery('p1'));
    stable(game, session, () => session.recover({ kind: 'personal', ownerSeat: 'p1' }));
    for (const request of [null, undefined, { ...hit, amount: 0 }, { ...hit, amount: -1 },
      { ...hit, amount: NaN }, { ...hit, amount: Infinity }, { ...hit, cause: 'unknown' }]) noDamage('p1', request);
    noDamage('p4', hit);
    if (mode === 'relay') noDamage('p2', hit);
    assert.deepEqual(session.damage('p1', hit), { landed: .5, fatal: false });
    assert.equal(p.health, p.maxHealth - .5); assert.equal(other.health, other.maxHealth);
    assert.equal(p.statistics.deaths, 0); assert.equal(other.statistics.deaths, 0);
    noDamage('p1', hit); // Existing hurt interval rejects a repeated debit.
    game.pause(); noDamage('p1', hit); noDamage('p2', hit); game.resume();
    ticks(121); // Real session time exhausts hurt immunity; no timer assignment.
    assert.deepEqual(session.damage('p1', hit), { landed: .5, fatal: false });
    assert.equal(p.health, p.maxHealth - 1); assert.equal(other.health, other.maxHealth);
  });
  interval('stale-reconnect-identities', () => {
    assert.equal(session.deviceLost('p1'), true);
    stable(game, session, () => session.deviceLost('p1'));
    const token = session.deviceReclaimToken('p1'); assert.ok(token);
    noDamage('p1', hit);
    for (const patch of [
      { sessionId: 'different-session' }, { participantId: 'different-person' },
      { seat: 'p2' }, { device: 'gamepad-9' }, { generation: token.generation - 1 },
    ]) stable(game, session, () => session.reclaim('p1', p.device, { ...token, ...patch }));
    if (mode === 'relay') {
      stable(game, session, () => owner.reclaim('p1', other.device));
      stable(game, session, () => owner.reclaim('p4', 'gamepad-9'));
    } else {
      stable(game, session, () => owner.reclaim(token, other.device));
      stable(game, session, () => owner.reclaim(undefined, 'gamepad-9'));
      stable(game, session, () => owner.reclaim(token, 'invalid-device'));
    }
    assert.equal(session.offerReclaim('p1', p.device), true);
    stable(game, session, () => session.reclaim('p1', p.device, token));
    const current = session.deviceReclaimToken('p1'), recovery = p.recovery;
    const wallet = p.run.wallet, deaths = p.statistics.deaths, earned = p.earnedDistance;
    assert.equal(mode === 'relay' ? owner.reclaim('p1', p.device)
      : owner.reclaim(current, 'gamepad-9'), true);
    assert.equal(p.participation, 'active'); assert.equal(p.deviceLostAt, null);
    assert.equal(p.run.wallet, wallet); assert.equal(p.statistics.deaths, deaths);
    assert.equal(p.earnedDistance, earned); assert.equal(p.recovery.charge, recovery.charge);
    assert.equal(p.recovery.grantId, recovery.grantId); assert.equal(other.device, 'keyboard-b');
    stable(game, session, () => session.reclaim('p1', p.device, current));
    assert.equal(session.deviceReclaimToken('p1'), undefined);
  });
  interval('fatal-offer-rejects-foreign-recovery', () => {
    ticks(121);
    const otherBefore = state(game, session).players[1];
    assert.deepEqual(session.damage('p1', { amount: 3, cause: 'train', reason: 'Arranged fatal authority impact.' }), { landed: 2, fatal: true });
    assert.equal(p.participation, 'dead'); assert.equal(p.statistics.deaths, 1);
    assert.ok(p.recovery.offer); assert.deepEqual(state(game, session).players[1], otherBefore);
    noDamage('p1', hit);
    let debitCalls = 0;
    for (const kind of ['revival', 'flare']) stable(game, session, () => session.recover({
      kind, ownerSeat: 'p1', targetSeat: 'p2', debit: () => { debitCalls++; return true; },
    }));
    assert.equal(debitCalls, 0);
    stable(game, session, () => session.recover({ kind: 'personal', ownerSeat: 'p4' }));
    stable(game, session, () => session.declineRecovery('p2'));
    assert.equal(session.recover({ kind: 'personal', ownerSeat: 'p1' }), true);
    assert.equal(p.health, p.maxHealth); assert.equal(p.recovery.charge, 'spent');
    assert.equal(p.statistics.selfRevives, 1); assert.equal(other.statistics.selfRevives, 0);
    noDamage('p1', hit); // Personal recovery protection is independent of hurt immunity.
    stable(game, session, () => session.recover({ kind: 'personal', ownerSeat: 'p1' }));
    stable(game, session, () => session.declineRecovery('p1'));
  });
  interval('terminal-late-events', () => {
    if (mode === 'relay') owner.finish();
    else for (const player of session.players) {
      assert.equal(owner.command(owner.actionToken(player.seat), 'leave'), true);
      assert.equal(owner.command(owner.actionToken(player.seat), 'confirm'), true);
    }
    const result = owner.result, frozen = JSON.stringify(result);
    assert.ok(Object.isFrozen(result));
    stable(game, session, () => session.admit({ seat: 'p3', device: 'gamepad-3', characterId: 'sunny' }));
    stable(game, session, () => session.recover({ kind: 'personal', ownerSeat: 'p1' }));
    noDamage('p1', hit);
    assert.equal(session.completeResult(result), false);
    assert.strictEqual(owner.result, result); assert.equal(JSON.stringify(result), frozen);
  });
  if (recorder) records.push(recorder.finish());
  // Teardown ends canonical mode ownership. These checks remain whole-job
  // component/global evidence, deliberately outside the mode intervals.
  const result = owner.result, frozen = JSON.stringify(result);
  session.stop();
  const before = state(game, session); ticks(120);
  assert.equal(session.running, false); assert.deepEqual(state(game, session), before);
  stable(game, session, () => session.dispatch({ seat: 'p1', direction: 'forward' }));
  noDamage('p1', hit);
  assert.strictEqual(owner.result, result); assert.equal(JSON.stringify(result), frozen);
});
