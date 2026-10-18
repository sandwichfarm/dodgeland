import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { loadSources } from './source-loader.mjs';
import { createTurnModelRecorder } from '../tools/release-coverage/turn-model-attribution.mjs';

const sources = await loadSources(['game', 'relay', 'race', 'market/catalog']);
after(() => sources.dispose());
const { Game, generateLane } = await sources.import('game');
const { createRelaySession, RelayCoordinator } = await sources.import('relay');
const { createRaceSession, RaceCoordinator } = await sources.import('race');
const { ITEM_CATALOG } = await sources.import('market/catalog');
const authority = { Game, ...await sources.import('session'), ...await sources.import('mode-rules') };
const config = process.env.DOWN_TO_DUCK_COVERAGE_CONFIG
  ? JSON.parse(await readFile(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG, 'utf8')) : null;
if (config && !config.modelAttribution) throw Error('Missing log-coin attribution');
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
const offsets = [-.5, -.499999, -.49, -.4, -.375, -.25, -.125, -.01, -1e-8,
  0, 1e-8, .01, .125, .25, .375, .4, .49, .499999, .5];
const seats = [
  { seat: 'p1', device: 'keyboard-a', characterId: 'butter' },
  { seat: 'p2', device: 'keyboard-b', characterId: 'sunny' },
];
function row(game, y, values = {}) {
  const lane = { ...generateLane(game.seed, y, game.home), kind: 'meadow', blocked: [], decorations: [],
    actors: undefined, coin: null, coinActor: undefined, phase: 0, speed: 0, spacing: 4, length: 3,
    variant: 0, ...values };
  game.rows.set(y, lane); return lane;
}
function river(game, y, speed = 0, center = 0) {
  return row(game, y, { kind: 'river', speed, phase: center - game.time * speed });
}
for (const mode of ['relay', 'race']) for (const base of ['arcade', 'stroll'])
test(`${mode}/${base}: real log carry preserves fractional grids and captures every boundary coin`, () => {
  const factory = mode === 'relay' ? createRelaySession : createRaceSession;
  const Coordinator = mode === 'relay' ? RelayCoordinator : RaceCoordinator;
  const recorder = inventory ? createTurnModelRecorder({ mode, inventory, factory, Coordinator,
    authority, identity: { runId: config.runId, realmId: config.modelAttribution.realmId,
      jobId: config.jobId, artifactHash: config.browserBuilds.modules.artifactHash } }) : null;
  const create = () => {
    const game = Game.fromSeed(`ph3-00000071-pond-${base === 'arcade' ? 'a' : 's'}-n`, ITEM_CATALOG, 'butter');
    // Explicit alternating crossing fixture. Ordinary three-tile logs repeat
    // four tiles apart; no pose,progress,clock,gravity or callback is injected.
    for (let y = -8; y < 50; y++) row(game, y);
    river(game, 1); return game;
  };
  const acquired = recorder ? recorder.acquireFrom(create, base, { seats })
    : (() => { const game = create(); return { game, owner: factory(game, { seats }) }; })();
  const { game, owner } = acquired, session = owner.session, [p, other] = session.players;
  const interval = (id, action) => recorder ? recorder.interval(id, action) : action();
  const tick = () => session.update(STEP);
  function hop(direction, together = true) {
    assert.equal(session.dispatch({ seat: 'p1', direction }), true);
    if (mode === 'race' && together) assert.equal(session.dispatch({ seat: 'p2', direction }), true);
    for (let n = 0; n < 120 && session.players.some(player => player.hop > 0); n++) tick();
    assert.ok(session.players.every(player => player.hop === 0));
  }
  interval('actual-spacing-and-first-log', () => {
    if (mode === 'race') for (let i = 0; i < 5; i++) {
      assert.equal(session.dispatch({ seat: 'p2', direction: 'right' }), true);
      for (let n = 0; n < 120 && other.hop > 0; n++) tick();
    }
    assert.equal(p.x, 0); if (mode === 'race') assert.equal(other.x, 4);
    hop('forward'); assert.equal(p.y, 1); assert.equal(p.earnedDistance, 1);
    assert.equal(p.run.wallet, 0); assert.equal(other.run.wallet, 0);
  });
  for (const [index, target] of offsets.entries()) {
    const y = p.y, speed = (target - p.groundX) / (12 * STEP * game.rules.simulation.worldTimeScale);
    river(game, y, speed, p.groundX);
    const coin = row(game, y + 1, { coin: 0, coinDenomination: 'coin' });
    interval(`log-grid-${index}`, () => {
      assert.equal(p.run.cards.length, 0); assert.equal(p.run.powers.length, 0);
      assert.equal(p.run.effects.coinRadius, game.rules.economy.baseCoinGravity);
      assert.ok(p.run.effects.coinRadius > 0);
      const before = p.run.wallet, otherWallet = other.run.wallet, earned = p.earnedDistance,
        completed = p.completedForwardTiles, otherEarned = other.earnedDistance;
      for (let n = 0; n < 12; n++) tick();
      assert.ok(Math.abs(p.groundX - target) < 1e-8, `actual log carried to ${target}, got ${p.groundX}`);
      assert.equal(p.earnedDistance, earned); assert.equal(p.completedForwardTiles, completed);
      const carriedX = p.groundX;
      hop('forward');
      for (let n = 0; n < 120 && coin.coin !== null; n++) tick();
      assert.equal(coin.coin, null, `coin at grid center must be captured from carried x=${carriedX}`);
      assert.equal(p.run.wallet, before + 1); assert.equal(other.run.wallet, otherWallet);
      assert.ok(Math.abs(p.groundX - carriedX) < 1e-8, 'landing never normalizes the traveler grid');
      assert.equal(p.earnedDistance, earned + 1); assert.equal(p.completedForwardTiles, completed + 1);
      assert.equal(other.earnedDistance, otherEarned + (mode === 'race' ? 1 : 0));
      assert.equal(p.state, 'playing'); assert.equal(other.state, 'playing');
      assert.equal(p.statistics.deaths, 0); assert.equal(other.statistics.deaths, 0);
      assert.equal(p.statistics.innateUses, 0); assert.equal(other.statistics.innateUses, 0);
      river(game, p.y + 1, 0, p.groundX); hop('forward');
      assert.ok(Math.abs(p.groundX - carriedX) < 1e-8);
      assert.equal(p.run.wallet, before + 1); assert.equal(other.run.wallet, otherWallet);
    });
  }
  interval('immutable-fractional-run-result', () => {
    assert.equal(p.run.wallet, offsets.length); assert.equal(other.run.wallet, 0);
    assert.equal(p.completedForwardTiles, 1 + offsets.length * 2);
    if (mode === 'relay') owner.finish();
    else for (const player of session.players) {
      assert.equal(owner.command(owner.actionToken(player.seat), 'leave'), true);
      assert.equal(owner.command(owner.actionToken(player.seat), 'confirm'), true);
    }
    const result = owner.result, before = JSON.stringify(result); assert.ok(Object.isFrozen(result));
    assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), false);
    tick(); assert.strictEqual(owner.result, result); assert.equal(JSON.stringify(result), before);
  });
  if (recorder) records.push(recorder.finish());
});
