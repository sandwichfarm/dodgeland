import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { loadSources } from './source-loader.mjs';
import { createTurnModelRecorder } from '../tools/release-coverage/turn-model-attribution.mjs';

const sources = await loadSources(['game', 'relay', 'race', 'actors', 'market/catalog']);
after(() => sources.dispose());
const { Game, generateLane, coinPosition, laneActors, platformSupports } = await sources.import('game');
const { createActorPattern } = await sources.import('actors');
const { createRelaySession, RelayCoordinator } = await sources.import('relay');
const { createRaceSession, RaceCoordinator } = await sources.import('race');
const { ITEM_CATALOG } = await sources.import('market/catalog');
const authority = { Game, ...await sources.import('session'), ...await sources.import('mode-rules') };
const config = process.env.DOWN_TO_DUCK_COVERAGE_CONFIG
  ? JSON.parse(await readFile(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG, 'utf8')) : null;
if (config && !config.modelAttribution) throw Error('Missing platform-reward attribution');
const inventory = config ? JSON.parse(await readFile(config.inventoryPath, 'utf8')) : null;
const records = [];
after(async () => {
  if (!inventory) return;
  assert.equal(records.length, 16);
  await writeFile(config.modelAttribution.output, JSON.stringify({
    ...records.at(-1), intervals: records.flatMap(record => record.intervals),
  }));
});
const STEP = 1 / 120;
const seats = [
  { seat: 'p1', device: 'keyboard-a', characterId: 'butter' },
  { seat: 'p2', device: 'keyboard-b', characterId: 'sunny' },
];
function row(game, y, values = {}) {
  const value = { ...generateLane(game.seed, y, game.home), kind: 'meadow', blocked: [],
    decorations: [], coin: null, coinActor: undefined, coinDenomination: undefined,
    actors: undefined, phase: 0, speed: 0, spacing: 4, length: 3, variant: 0, ...values };
  game.rows.set(y, value); return value;
}
function pattern() {
  return createActorPattern('platforms', [
    { kind: 'platform', length: 2.5, variant: 0, speedFactor: 1, gap: 1.75 },
    { kind: 'platform', length: 4, variant: 1, speedFactor: 1, gap: 2 },
  ], 3);
}
for (const mode of ['relay', 'race']) for (const base of ['arcade', 'stroll'])
for (const recipe of ['legacy', 'varied']) for (const direction of [-1, 1])
test(`${mode}/${base}/${recipe}/${direction}: moving rewards stay on platforms and pay one owner once`, () => {
  const factory = mode === 'relay' ? createRelaySession : createRaceSession;
  const Coordinator = mode === 'relay' ? RelayCoordinator : RaceCoordinator;
  const recorder = inventory ? createTurnModelRecorder({ mode, inventory, factory, Coordinator,
    authority, identity: { runId: config.runId, realmId: config.modelAttribution.realmId,
      jobId: config.jobId, artifactHash: config.browserBuilds.modules.artifactHash } }) : null;
  const create = () => {
    const game = Game.fromSeed(`ph3-00000071-pond-${base === 'arcade' ? 'a' : 's'}-n`, ITEM_CATALOG, 'butter');
    // Terrain/reward component fixtures only. Mode rules, clocks, poses,
    // inventories, charge, progress and transaction callbacks remain real.
    for (let y = -8; y < 30; y++) row(game, y);
    row(game, 1, { kind: 'river', coin: 0, coinActor: null,
      coinDenomination: recipe === 'legacy' ? 'coin' : 'huge-sack',
      phase: direction * .1, speed: direction * .12,
      actors: recipe === 'varied' ? pattern() : undefined });
    row(game, 4, { kind: 'river', coin: 0, coinActor: recipe === 'legacy' ? -3 * direction : -3,
      speed: direction * 2, actors: recipe === 'varied' ? pattern() : undefined });
    return game;
  };
  const acquired = recorder ? recorder.acquireFrom(create, base, { seats })
    : (() => { const game = create(); return { game, owner: factory(game, { seats }) }; })();
  const { game, owner } = acquired, session = owner.session, [p, other] = session.players;
  const reward = game.rows.get(1), distant = game.rows.get(4), payments = [];
  p.onCoin = value => payments.push(value);
  const interval = (id, action) => recorder ? recorder.interval(id, action) : action();
  const ticks = count => { for (let n = 0; n < count; n++) session.update(STEP); };
  const supported = lane => {
    const point = coinPosition(lane, game.time);
    if (!point) return null;
    assert.equal(point.y, lane.index);
    assert.equal(platformSupports(lane, point.x, game.time), true);
    assert.ok(laneActors(lane, game.time).some(actor => Math.abs(actor.x - point.x) < 1e-8));
    return point;
  };
  interval('binding-visibility-and-pause', () => {
    assert.equal(coinPosition(distant, game.time), null, 'a platform reward outside the render field stays hidden');
    assert.equal(p.run.wallet, 0); assert.equal(other.run.wallet, 0);
    let visible = 0;
    const approachTicks = Math.ceil(2.4 / (STEP * game.rules.simulation.worldTimeScale));
    for (let n = 0; n < approachTicks; n++) {
      ticks(1);
      assert.notEqual(reward.coinActor, null, 'the approach binds the reward to a physical platform');
      assert.ok(supported(reward));
      if (supported(distant)) visible++;
      assert.equal(p.run.wallet, 0); assert.equal(other.run.wallet, 0);
    }
    assert.ok(visible > 0, 'real world time carries the distant reward into view');
    const before = [game.time, supported(reward), supported(distant), reward.coinActor, distant.coinActor];
    game.pause(); ticks(120);
    assert.deepEqual([game.time, supported(reward), supported(distant), reward.coinActor, distant.coinActor], before);
    assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), false);
    game.resume();
  });
  interval('actual-landing-and-single-payment', () => {
    assert.equal(p.run.cards.length, 0); assert.equal(p.run.powers.length, 0);
    assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), true);
    for (let n = 0; n < 120 && (p.hop > 0 || reward.coin !== null); n++) ticks(1);
    const value = recipe === 'legacy' ? 1 : 25;
    assert.equal(reward.coin, null); assert.equal(reward.coinPull, undefined);
    assert.equal(p.run.wallet, value); assert.equal(other.run.wallet, 0);
    assert.deepEqual(payments, [value]);
    assert.equal(p.earnedDistance, 1); assert.equal(p.completedForwardTiles, 1);
    assert.equal(other.earnedDistance, 0); assert.equal(other.completedForwardTiles, 0);
    assert.equal(p.state, 'playing'); assert.equal(p.statistics.innateUses, 0);
    const landedX = p.x, beforeTime = game.time;
    ticks(30);
    assert.ok(Math.abs(p.x - landedX - reward.speed * (game.time - beforeTime)) < 1e-8,
      'collecting the reward does not stop physical platform carry');
    assert.equal(p.run.wallet, value); assert.deepEqual(payments, [value]);
    assert.equal(distant.coin, 0, 'the distant reward remains unclaimed');
    assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), true);
    for (let n = 0; n < 120 && p.hop > 0; n++) ticks(1);
    assert.equal(p.y, 2); assert.equal(p.completedForwardTiles, 2);
    assert.equal(p.state, 'playing'); assert.equal(p.statistics.deaths, 0);
    assert.equal(other.statistics.deaths, 0); assert.deepEqual(payments, [value]);
  });
  interval('immutable-terminal-reward', () => {
    if (mode === 'relay') owner.finish();
    else for (const player of session.players) {
      assert.equal(owner.command(owner.actionToken(player.seat), 'leave'), true);
      assert.equal(owner.command(owner.actionToken(player.seat), 'confirm'), true);
    }
    const result = owner.result, before = JSON.stringify(result); assert.ok(Object.isFrozen(result));
    assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), false);
    ticks(1); assert.strictEqual(owner.result, result); assert.equal(JSON.stringify(result), before);
    assert.deepEqual(payments, [recipe === 'legacy' ? 1 : 25]);
  });
  if (recorder) records.push(recorder.finish());
});
