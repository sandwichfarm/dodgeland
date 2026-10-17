import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { loadSources } from './source-loader.mjs';
import { createTurnModelRecorder } from '../tools/release-coverage/turn-model-attribution.mjs';

const sources = await loadSources(['game', 'relay', 'race', 'market/catalog']);
after(() => sources.dispose());
const { Game } = await sources.import('game');
const { createRelaySession, RelayCoordinator } = await sources.import('relay');
const { createRaceSession, RaceCoordinator } = await sources.import('race');
const { ITEM_CATALOG } = await sources.import('market/catalog');
const authority = { Game, ...await sources.import('session'), ...await sources.import('mode-rules') };
const config = process.env.DOWN_TO_DUCK_COVERAGE_CONFIG
  ? JSON.parse(await readFile(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG, 'utf8')) : null;
if (config && !config.modelAttribution) throw Error('Missing setup-retry attribution');
const inventory = config ? JSON.parse(await readFile(config.inventoryPath, 'utf8')) : null;
const records = [];
after(async () => {
  if (!inventory) return;
  assert.equal(records.length, 4);
  await writeFile(config.modelAttribution.output, JSON.stringify({
    ...records.at(-1), intervals: records.flatMap(record => record.intervals),
  }));
});
const seats = [
  { seat: 'p1', device: 'keyboard-a', characterId: 'butter' },
  { seat: 'p2', device: 'keyboard-b', characterId: 'pip' },
];

function snapshot(game) {
  const player = game.player, run = game.run;
  return structuredClone({ state: game.state, character: game.characterId,
    world: { seed: game.world.seed, code: game.seedCode, time: game.world.time,
      tick: game.world.simulationTick, frontier: game.world.frontier,
      active: game.world.sessionActive, rows: [...game.world.rows], mobs: game.mobs },
    player: { device: player.device, participant: player.participantId,
      session: player.session?.id, recovery: player.recovery, participation: player.participation,
      x: player.x, y: player.y, fromX: player.fromX, fromY: player.fromY,
      hop: player.hop, health: player.health, earned: player.earnedDistance,
      completed: player.completedForwardTiles, statistics: player.statistics },
    run: { alive: run.alive, wallet: run.wallet, cards: run.cards, powers: run.powers,
      cosmetics: run.cosmetics, effects: run.effects, market: run.market,
      pending: run.pendingPack, revision: run.revision, random: run.state, sequence: run.sequence },
  });
}

function rejectedAttempts(mode) {
  const settings = mode === 'relay' ? 'tilesPerLeg' : 'finishTiles';
  const attempts = [0, -1, 1.5, NaN, Infinity, '', '00', ' 5', true, {}, []]
    .map(value => ({ proposal: { seats, [settings]: value }, error: RangeError }));
  attempts.push({ proposal: { seats, [settings]: mode === 'relay' ? 1000 : 10000 }, error: RangeError });
  const roster = [
    [], [seats[0]],
    [...seats, { seat: 'p3', device: 'gamepad-2', characterId: 'sunny' },
      { seat: 'p4', device: 'gamepad-3', characterId: 'petal' },
      { seat: 'p5', device: 'gamepad-4', characterId: 'beep' }],
    [seats[1], { seat: 'p3', device: 'gamepad-2', characterId: 'sunny' }],
    [seats[0], { ...seats[1], device: seats[0].device }],
    [seats[0], { ...seats[1], characterId: seats[0].characterId }],
    [seats[0], { ...seats[1], disconnected: true }],
    [seats[0], { ...seats[1], device: 'unsupported-device' }],
    [seats[0], { ...seats[1], characterId: 'unknown-traveler' }],
    [seats[0], { ...seats[1], seat: 'p9' }],
    [seats[0], { ...seats[1], seat: 'p1' }],
  ];
  attempts.push(...roster.map(value => ({ proposal: { seats: value }, error: TypeError })));
  if (mode === 'race') {
    attempts.push(...[29, 3601, Number.MAX_SAFE_INTEGER + 1].map(value => ({
      proposal: { seats, activeSeconds: value }, error: RangeError,
    })));
    attempts.push(...[null, [], { seats, unknownSetting: true }, { seats: null },
      { seats: [seats[0], { ...seats[1], device: 3 }] },
      { seats: [seats[0], { ...seats[1], characterId: null }] },
      { seats: [seats[0], { ...seats[1], disconnected: 'false' }] },
      { seats: [seats[0], { ...seats[1], unknownField: true }] },
    ].map(proposal => ({ proposal, error: TypeError })));
  }
  return attempts;
}

for (const mode of ['relay', 'race']) for (const base of ['arcade', 'stroll'])
test(`${mode}/${base}: rejected setup and failed placement preserve the course for corrected acquisition`, () => {
  const factory = mode === 'relay' ? createRelaySession : createRaceSession;
  const Coordinator = mode === 'relay' ? RelayCoordinator : RaceCoordinator;
  const recorder = inventory ? createTurnModelRecorder({ mode, inventory, factory, Coordinator,
    authority, identity: { runId: config.runId, realmId: config.modelAttribution.realmId,
      jobId: config.jobId, artifactHash: config.browserBuilds.modules.artifactHash } }) : null;
  let game;
  // Acquisition includes actual failed factory attempts, correction, and the
  // final valid factory on this same Game. Pure validator calls are not used.
  const create = () => {
    game = Game.fromSeed(`ph3-00000071-pond-${base === 'arcade' ? 'a' : 's'}-n`, ITEM_CATALOG, 'butter');
    const world = game.world, player = game.player, rows = world.rows, rng = game.mobDirector.rng;
    const before = snapshot(game);
    for (const { proposal, error } of rejectedAttempts(mode)) {
      assert.throws(() => factory(game, proposal), error);
      assert.deepEqual(snapshot(game), before);
      assert.strictEqual(game.world, world); assert.strictEqual(game.player, player);
      assert.strictEqual(world.rows, rows); assert.strictEqual(game.mobDirector.rng, rng);
    }
    // An explicit component fixture leaves the primary's cell free but no
    // distinct secondary cell. Actual staging must restore character/device.
    const row = rows.get(0), blocked = row.blocked;
    row.blocked = Array.from({ length: 11 }, (_, index) => index - 5).filter(x => x !== 0);
    try {
      const blockedBefore = snapshot(game);
      assert.throws(() => factory(game, { seats: [
        { seat: 'p1', device: 'gamepad-8', characterId: 'sunny' }, seats[1],
      ] }), /No safe distinct session seat/);
      assert.deepEqual(snapshot(game), blockedBefore);
      assert.strictEqual(game.world, world); assert.strictEqual(game.player, player);
      assert.strictEqual(world.rows, rows); assert.strictEqual(game.mobDirector.rng, rng);
    } finally { row.blocked = blocked; }
    assert.deepEqual(snapshot(game), before);
    return game;
  };
  const acquired = recorder ? recorder.acquireFrom(create, base, { seats })
    : (() => { const value = create(); return { game: value, owner: factory(value, { seats }) }; })();
  const owner = acquired.owner, session = owner.session;
  const interval = (id, action) => recorder ? recorder.interval(id, action) : action();
  assert.strictEqual(acquired.game, game); assert.strictEqual(session.world, game.world);
  assert.equal(session.players.length, 2); assert.equal(game.state, 'playing');
  if (mode === 'relay') assert.equal(owner.setup.tilesPerLeg, 50);
  else assert.deepEqual(owner.descriptor.settings, { finishTiles: 500, activeSeconds: 180 });
  interval('late-setup-rejected-and-first-hop', () => {
    const before = snapshot(game), players = [...session.players], id = session.id;
    assert.throws(() => factory(game, { seats }), /fresh ready course/);
    assert.deepEqual(snapshot(game), before); assert.deepEqual(session.players, players);
    assert.strictEqual(owner.session, session); assert.equal(session.id, id);
    assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), true);
    for (let tick = 0; tick < 120 && session.players[0].hop > 0; tick++) session.update(1 / 120);
    assert.equal(session.players[0].completedForwardTiles, 1);
    assert.equal(session.players[0].earnedDistance, 1);
    assert.equal(session.players[1].completedForwardTiles, 0);
    assert.equal(session.players[1].earnedDistance, 0);
    assert.equal(owner.result, undefined);
  });
  interval('frozen-terminal', () => {
    if (mode === 'relay') owner.finish();
    else for (const player of session.players) {
      assert.equal(owner.command(owner.actionToken(player.seat), 'leave'), true);
      assert.equal(owner.command(owner.actionToken(player.seat), 'confirm'), true);
    }
    const result = owner.result, before = JSON.stringify(result);
    assert.ok(Object.isFrozen(result));
    assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), false);
    session.update(1 / 120); assert.strictEqual(owner.result, result);
    assert.equal(JSON.stringify(result), before);
  });
  if (recorder) records.push(recorder.finish());
});
