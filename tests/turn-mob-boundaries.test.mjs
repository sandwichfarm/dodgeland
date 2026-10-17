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
if (config && !config.modelAttribution) throw Error('Missing mob-boundary attribution');
const inventory = config ? JSON.parse(await readFile(config.inventoryPath, 'utf8')) : null;
const records = [];
after(async () => {
  if (!inventory) return;
  assert.equal(records.length, 28);
  await writeFile(config.modelAttribution.output, JSON.stringify({
    ...records.at(-1), intervals: records.flatMap(record => record.intervals),
  }));
});
const seats = [
  { seat: 'p1', device: 'keyboard-a', characterId: 'butter' },
  { seat: 'p2', device: 'keyboard-b', characterId: 'sunny' },
];
const STEP = 1 / 120;
function meadow(game, y) {
  const row = { ...generateLane(game.seed, y, game.home), kind: 'meadow',
    blocked: [], decorations: [], coin: null, coinActor: undefined, actors: undefined };
  game.rows.set(y, row); return row;
}
function place(p, x, y) { p.x = p.fromX = x; p.y = p.fromY = y; p.hop = 0; }
function mob(kind, x, y, left = .001) {
  return { id: 900, kind, x, y, fromX: x, fromY: y, targetX: x, targetY: y,
    phase: 'rest', phaseLeft: left, phaseDuration: left };
}
function resources(p) {
  return structuredClone({ health: p.health, wallet: p.run.wallet, cards: p.run.cards,
    earned: p.earnedDistance, completed: p.completedForwardTiles,
    deaths: p.statistics.deaths, innate: p.statistics.innateUses,
    selfRevives: p.statistics.selfRevives, charge: p.recovery.charge, grant: p.recovery.grantId });
}
function create(mode, reverse = false) {
  const factory = mode === 'relay' ? createRelaySession : createRaceSession;
  const Coordinator = mode === 'relay' ? RelayCoordinator : RaceCoordinator;
  const recorder = inventory ? createTurnModelRecorder({ mode, inventory, factory, Coordinator,
    authority, identity: { runId: config.runId, realmId: config.modelAttribution.realmId,
      jobId: config.jobId, artifactHash: config.browserBuilds.modules.artifactHash } }) : null;
  const createGame = () => {
    const game = Game.fromSeed('ph3-00000071-pond-a-n', ITEM_CATALOG, 'butter');
    for (let y = -8; y < 16; y++) meadow(game, y);
    return game;
  };
  const proposal = { seats: reverse ? [...seats].reverse() : seats };
  const acquired = recorder ? recorder.acquireFrom(createGame, 'arcade', proposal)
    : (() => { const game = createGame(); return { game, owner: factory(game, proposal) }; })();
  const { game, owner } = acquired, session = owner.session;
  return { game, owner, session,
    interval: (id, action) => recorder ? recorder.interval(id, action) : action(),
    ticks: count => { for (let n = 0; n < count; n++) session.update(STEP); },
    finish() {
      const result = owner.result; assert.ok(result); assert.ok(Object.isFrozen(result));
      if (recorder) records.push(recorder.finish());
    },
  };
}
function terminal(run) {
  run.interval('immutable-terminal', () => {
    const { owner, session } = run;
    if (owner instanceof RelayCoordinator) owner.finish();
    else for (const player of session.players) {
      assert.equal(owner.command(owner.actionToken(player.seat), 'leave'), true);
      assert.equal(owner.command(owner.actionToken(player.seat), 'confirm'), true);
    }
    const result = owner.result, frozen = JSON.stringify(result);
    assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), false);
    session.update(STEP); assert.strictEqual(owner.result, result);
    assert.equal(JSON.stringify(result), frozen);
  });
  run.finish();
}

// Component fixtures own the terrain/body/poses. All routing,body contact,
// retirement,ownership and recovery use the real mode's single session update.
for (const mode of ['relay', 'race']) for (const kind of ['slime', 'crab', 'wasp'])
test(`${mode}: ${kind} respects scenery and a river barrier through shared AI`, () => {
  const run = create(mode), { game, session } = run, [p, other] = session.players;
  place(p, 0, 2); place(other, 4, 2);
  Object.assign(game.rows.get(1), { kind: 'river', phase: 10, speed: 0, spacing: 20, length: 1 });
  game.rows.get(0).blocked = [-1];
  const pursuer = mob(kind, -2, 0); game.mobs.push(pursuer);
  const before = session.players.map(resources);
  run.interval('blocked-route-and-flight', () => {
    if (kind === 'wasp') {
      for (let n = 0; n < 360 && pursuer.phase !== 'windup'; n++) run.ticks(1);
    } else run.ticks(240);
    assert.equal(game.mobs.includes(pursuer), true);
    if (kind === 'wasp') {
      assert.ok(pursuer.y > .5, 'flight crosses the unsupported river');
      assert.equal(pursuer.phase, 'windup');
      assert.equal(pursuer.targetX, 0); assert.equal(pursuer.targetY, 2);
    } else {
      assert.deepEqual([pursuer.x, pursuer.y], [-2, 0], 'sealed ground route waits without crossing the barrier');
      assert.ok(pursuer.y < .5, 'a ground mob never enters the river');
      assert.equal(pursuer.phase, 'walking');
      assert.deepEqual([pursuer.targetX, pursuer.targetY], [-2, 0]);
    }
    assert.deepEqual(session.players.map(resources), before);
  });
  terminal(run);
});
for (const mode of ['relay', 'race']) for (const kind of ['slime', 'crab', 'wasp'])
test(`${mode}: ${kind} takes an available route around a tree or flies over it`, () => {
  const run = create(mode), { game, session } = run, [p, other] = session.players;
  place(other, 4, 2); game.rows.get(0).blocked = [-1];
  const pursuer = mob(kind, -2, 0); game.mobs.push(pursuer);
  const before = session.players.map(resources);
  run.interval('available-scenery-detour', () => {
    run.ticks(144);
    assert.equal(game.mobs.includes(pursuer), true);
    if (kind === 'wasp') {
      assert.equal(pursuer.y, 0); assert.ok(pursuer.x > -2);
      assert.equal(pursuer.phase, 'windup');
      assert.equal(pursuer.targetX, p.groundX); assert.equal(pursuer.targetY, p.groundY);
    } else {
      assert.ok(Math.abs(pursuer.y) >= .7, 'ground body takes the open cardinal detour');
      assert.equal(pursuer.phase, 'walking');
      assert.ok(Math.hypot(pursuer.x + 1, pursuer.y) >= .7, 'tree body remains clear');
    }
    assert.deepEqual(session.players.map(resources), before);
  });
  terminal(run);
});
for (const mode of ['relay', 'race']) for (const kind of ['slime', 'crab', 'wasp'])
for (const hazard of ['road', 'rail'])
test(`${mode}: ${hazard} retires ground ${kind} bodies but preserves flight`, () => {
  const run = create(mode), { game, session } = run;
  place(session.players[1], 4, 2);
  Object.assign(game.rows.get(-2), { kind: hazard, phase: hazard === 'rail' ? 2.375 : 0,
    speed: hazard === 'rail' ? 1 : 0, spacing: 20, length: 1.15,
    direction: 1, period: 9, warning: 1.5 });
  const pursuer = mob(kind, 0, -2, 10); game.mobs.push(pursuer);
  const before = session.players.map(resources);
  run.interval('actual-traffic-body-contact', () => {
    const tick = session.world.simulationTick, time = game.time;
    run.ticks(1);
    assert.equal(session.world.simulationTick, tick + 1); assert.equal(game.time, time + STEP);
    assert.equal(game.mobs.includes(pursuer), kind === 'wasp');
    assert.equal(game.mobs.length, kind === 'wasp' ? 1 : 0);
    assert.deepEqual(session.players.map(resources), before);
  });
  terminal(run);
});
for (const mode of ['relay', 'race'])
test(`${mode}: one shared mob frame resolves every active victim once and ignores the bench`, () => {
  const run = create(mode), { game, session } = run, [p, other] = session.players;
  place(p, -.15, 0); place(other, .15, 0);
  p.run.creditCoins(17); other.run.creditCoins(29);
  game.mobs.push(mob('wasp', 0, 0, 10));
  const untouched = resources(other);
  run.interval('same-frame-owned-fatalities-and-revival', () => {
    const tick = session.world.simulationTick, time = game.time;
    run.ticks(1);
    assert.equal(session.world.simulationTick, tick + 1); assert.equal(game.time, time + STEP);
    const victims = mode === 'race' ? [p, other] : [p];
    for (const victim of victims) {
      assert.equal(victim.state, 'dead'); assert.equal(victim.participation, 'dead');
      assert.equal(victim.deathCause, 'mob'); assert.equal(victim.statistics.deaths, 1);
      assert.equal(victim.run.wallet, 0); assert.ok(victim.recovery.offer);
      assert.equal(victim.statistics.innateUses, 0);
      assert.equal(victim.deathSpill.wallet, victim === p ? 17 : 29);
    }
    if (mode === 'relay') assert.deepEqual(resources(other), untouched);
    const deathRecords = session.lifecycle.filter(e => e.type === 'player-death');
    assert.deepEqual(deathRecords.map(e => e.seat), victims.map(v => v.seat));
    const stillDead = mode === 'race' ? resources(other) : undefined;
    assert.equal(session.recover({ kind: 'personal', ownerSeat: 'p1' }), true);
    if (mode === 'race') {
      assert.deepEqual(resources(other), stillDead, 'first revival cannot restore the other victim');
      assert.equal(session.recover({ kind: 'personal', ownerSeat: 'p2' }), true);
    }
    for (const victim of victims) {
      assert.equal(victim.state, 'playing'); assert.equal(victim.health, victim.maxHealth);
      assert.equal(victim.statistics.deaths, 1); assert.equal(victim.statistics.selfRevives, 1);
      assert.equal(victim.recovery.charge, 'spent'); assert.equal(victim.run.wallet, 0);
      assert.equal(victim.earnedDistance, 0); assert.equal(victim.completedForwardTiles, 0);
    }
    run.ticks(1);
    assert.equal(session.lifecycle.filter(e => e.type === 'player-death').length, victims.length);
    if (mode === 'relay') assert.deepEqual(resources(other), untouched);
  });
  terminal(run);
});
for (const reverse of [false, true])
test(`Race: equidistant crab chooses the same seat with ${reverse ? 'reversed' : 'normal'} setup order`, () => {
  const run = create('race', reverse), { game, session } = run, [p, other] = session.players;
  place(p, -1, 0); place(other, 1, 0);
  const pursuer = mob('crab', 0, 0); game.mobs.push(pursuer);
  const before = session.players.map(resources);
  run.interval('stable-target-election-and-committed-warning', () => {
    run.ticks(1); assert.equal(pursuer.phase, 'windup');
    assert.equal(pursuer.targetX, -1); assert.equal(pursuer.targetY, 0);
    assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), true);
    run.ticks(18);
    assert.equal(pursuer.targetX, -1); assert.equal(pursuer.targetY, 0);
    assert.equal(pursuer.phase, 'windup');
    assert.equal(p.state, 'playing'); assert.equal(other.state, 'playing');
    assert.deepEqual(resources(other), before[1]);
    assert.equal(p.earnedDistance, before[0].earned + 1);
    assert.equal(p.statistics.deaths, before[0].deaths);
  });
  terminal(run);
});
