import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { loadSources } from './source-loader.mjs';
import { createTurnModelRecorder } from '../tools/release-coverage/turn-model-attribution.mjs';

const sources = await loadSources(['game', 'relay', 'race', 'market/catalog']);
after(() => sources.dispose());
const { Game, generateLane, vehicleBounds } = await sources.import('game');
const { createRelaySession, RelayCoordinator } = await sources.import('relay');
const { createRaceSession, RaceCoordinator } = await sources.import('race');
const { ITEM_CATALOG } = await sources.import('market/catalog');
const authority = { Game, ...await sources.import('session'), ...await sources.import('mode-rules') };
const config = process.env.DOWN_TO_DUCK_COVERAGE_CONFIG
  ? JSON.parse(await readFile(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG, 'utf8')) : null;
if (config && !config.modelAttribution) throw Error('Missing character-rescue attribution');
const inventory = config ? JSON.parse(await readFile(config.inventoryPath, 'utf8')) : null;
const records = [];
after(async () => {
  if (!inventory) return;
  assert.equal(records.length, 19);
  await writeFile(config.modelAttribution.output, JSON.stringify({
    ...records.at(-1), intervals: records.flatMap(record => record.intervals),
  }));
});
const cases = [
  { character: 'butter', encounter: 'water', cause: 'water' },
  { character: 'butter', encounter: 'water-no-exit', cause: 'water', dies: true },
  { character: 'sunny', encounter: 'front', cause: 'traffic' },
  { character: 'petal', encounter: 'front', cause: 'traffic', dies: true },
  { character: 'petal', encounter: 'rear', cause: 'traffic', health: .5 },
  { character: 'petal', encounter: 'side', cause: 'traffic', health: .5 },
  { character: 'beep', encounter: 'train', cause: 'train' },
  { character: 'pip', encounter: 'mob', cause: 'mob' },
  { character: 'rust', encounter: 'mob', cause: 'mob' },
];
function meadow(game, y) {
  game.rows.set(y, { ...generateLane(game.seed, y, game.home), kind: 'meadow',
    blocked: [], decorations: [], coin: null, coinActor: undefined, actors: undefined });
}
function pose(p, x, y) { p.x = p.fromX = x; p.y = p.fromY = y; p.hop = 0; }
function resources(p) {
  return structuredClone({ health: p.health, wallet: p.run.wallet, cards: p.run.cards,
    cosmetics: p.run.cosmetics, deaths: p.statistics.deaths, innate: p.statistics.innateUses,
    selfRevives: p.statistics.selfRevives, charge: p.recovery.charge, grant: p.recovery.grantId,
    earned: p.earnedDistance, completed: p.completedForwardTiles, powerReadyAt: p.powerReadyAt });
}
for (const mode of ['relay', 'race']) for (const item of mode === 'relay'
  ? [...cases, { character: 'pebble', encounter: 'wave', cause: 'wave' }] : cases)
test(`${mode}: ${item.character} resolves its actual ${item.encounter} encounter without another owner's credit`, () => {
  const factory = mode === 'relay' ? createRelaySession : createRaceSession;
  const Coordinator = mode === 'relay' ? RelayCoordinator : RaceCoordinator;
  const recorder = inventory ? createTurnModelRecorder({ mode, inventory, factory, Coordinator,
    authority, identity: { runId: config.runId, realmId: config.modelAttribution.realmId,
      jobId: config.jobId, artifactHash: config.browserBuilds.modules.artifactHash } }) : null;
  const create = () => {
    const game = Game.fromSeed('ph3-00000071-pond-a-n', ITEM_CATALOG, 'butter');
    for (let y = -8; y < 15; y++) meadow(game, y);
    return game;
  };
  const proposal = { seats: [
    { seat: 'p1', device: 'keyboard-a', characterId: item.character },
    { seat: 'p2', device: 'keyboard-b', characterId: item.character === 'butter' ? 'pip' : 'butter' },
  ] };
  const acquired = recorder ? recorder.acquireFrom(create, 'arcade', proposal)
    : (() => { const game = create(); return { game, owner: factory(game, proposal) }; })();
  const { game, owner } = acquired, session = owner.session, [p, other] = session.players;
  const interval = (id, action) => recorder ? recorder.interval(id, action) : action();
  // Explicit component contact/health fixtures,not progress,clock,charge or AI
  // callbacks. All contacts and rescues resolve through real LocalSession ticks.
  pose(other, 4, 2); p.health = item.health ?? p.maxHealth;
  if (item.encounter === 'water-no-exit') {
    for (const lane of game.rows.values()) if (lane.index >= -8 && lane.index < 15)
      Object.assign(lane, { kind: 'river', phase: 10, speed: 0, spacing: 20, length: 1 });
    // A supported teammate log is not a land cell for an innate bounce. It
    // remains a valid anchor for the distinct personal revival planner.
    Object.assign(game.rows.get(2), { phase: 4, length: 2 });
  }
  const row = game.rows.get(0);
  if (['front', 'rear', 'side'].includes(item.encounter)) {
    Object.assign(row, { kind: 'road', direction: 1, phase: 0, speed: 0, spacing: 20, length: 1.15 });
    const bounds = vehicleBounds(row);
    pose(p, item.encounter === 'front' ? bounds.maxX + .1 : item.encounter === 'rear' ? bounds.minX - .1 : 0,
      item.encounter === 'side' ? -1 : 0);
  } else if (item.encounter === 'water') Object.assign(row, { kind: 'river', phase: 10, speed: 0, spacing: 20, length: 1 });
  else if (item.encounter === 'train') Object.assign(row, { kind: 'rail', direction: 1, phase: 2.375, speed: 1, period: 9, warning: 1.5 });
  else if (item.encounter === 'mob') game.mobs.push({ id: 900, kind: 'slime',
    x: 0, y: 0, fromX: 0, fromY: 0, targetX: 0, targetY: 0,
    phase: 'rest', phaseLeft: 10, phaseDuration: 10 });
  else if (item.encounter === 'wave') game.waveRow = .001;
  const untouched = resources(other);
  interval('actual-contact-and-matching-power', () => {
    if (item.encounter === 'side') assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), true);
    for (let n = 0; n < 120 && p.state !== 'dead' && !p.powerRescue; n++) session.update(1 / 120);
    if (item.dies) {
      assert.equal(p.state, 'dead'); assert.equal(p.deathCause, item.cause);
      assert.equal(p.statistics.deaths, 1); assert.equal(p.statistics.innateUses, 0);
      assert.ok(p.recovery.offer); assert.equal(p.powerReadyAt, 0);
      if (item.encounter === 'water-no-exit' && mode === 'relay') {
        // Relay's bench is not a live recovery anchor. With no safe cell,
        // reject without spending;an explicitly restored bank permits retry.
        const before = resources(p);
        assert.equal(session.recover({ kind: 'personal', ownerSeat: 'p1' }), false);
        assert.deepEqual(resources(p), before); meadow(game, 0);
      }
      assert.equal(session.recover({ kind: 'personal', ownerSeat: 'p1' }), true);
      assert.equal(p.statistics.selfRevives, 1); assert.equal(p.recovery.charge, 'spent');
    } else {
      assert.equal(p.state, 'playing'); assert.ok(p.powerRescue, `${item.character}/${item.encounter}`);
      assert.equal(p.statistics.deaths, 0); assert.equal(p.statistics.innateUses, 1);
      assert.equal(p.interactions.filter(e => e.kind === 'innate' && e.cause === item.cause).length, 1);
      assert.equal(p.powerReadyAt, 100); assert.equal(p.recovery.charge, 'available');
      assert.equal(p.recovery.personalHighWater, 0); assert.equal(p.completedForwardTiles, 0);
      if (item.character === 'petal') assert.equal(p.health, 1);
      if (item.character === 'rust') assert.equal(p.y, 0, 'fox feint chooses lateral separation');
      for (let n = 0; n < 120 && p.powerRescue; n++) session.update(1 / 120);
      assert.equal(p.powerRescue, null); assert.equal(p.state, 'playing');
      assert.equal(p.statistics.innateUses, 1); assert.equal(p.statistics.deaths, 0);
      assert.equal(p.recovery.charge, 'available'); assert.equal(p.completedForwardTiles, 0);
      assert.equal(p.earnedDistance, 0); assert.equal(p.run.wallet, 0);
    }
    assert.deepEqual(resources(other), untouched);
  });
  interval('frozen-character-result', () => {
    if (mode === 'relay') owner.finish();
    else for (const player of session.players) {
      assert.equal(owner.command(owner.actionToken(player.seat), 'leave'), true);
      assert.equal(owner.command(owner.actionToken(player.seat), 'confirm'), true);
    }
    assert.ok(Object.isFrozen(owner.result)); const result = JSON.stringify(owner.result);
    assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), false);
    session.update(1 / 120); assert.equal(JSON.stringify(owner.result), result);
    assert.deepEqual(resources(other), untouched);
  });
  if (recorder) records.push(recorder.finish());
});
