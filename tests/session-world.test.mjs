import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'session', 'mode-rules', 'market/catalog']);
after(() => sources.dispose());
const { Game, actorPositions } = await sources.import('game');
const { LocalSession, SessionPlayer } = await sources.import('session');
const { composeModeDefinition } = await sources.import('mode-rules');
const { ITEM_CATALOG } = await sources.import('market/catalog');

const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} != ${expected}`);

function clearStandingLane(game, row = 0) {
  Object.assign(game.rows.get(row), { kind: 'meadow', blocked: [], decorations: [], coin: null, coinActor: undefined, actors: undefined });
}

function setup(size = 2, { mode = 'arcade', definition, reverse = false } = {}) {
  const game = new Game(89, 'pond', mode, false, ITEM_CATALOG, 'pip', { definition });
  clearStandingLane(game);
  const characters = ['pip', 'butter', 'sunny', 'petal'];
  const players = [game.player];
  for (let index = 1; index < size; index++) {
    players.push(new SessionPlayer(game.world, `p${index + 1}`, `keyboard-${String.fromCharCode(97 + index)}`, characters[index]));
  }
  const session = new LocalSession(game.world, reverse ? [...players].reverse() : players);
  session.start();
  return { game, session, players };
}

function advance(session, frames, dt = 1 / 120) {
  for (let frame = 0; frame < frames; frame++) session.update(dt);
}

function buy(run, itemId) {
  run.advanceScore(100);
  assert.equal(run.open(), true);
  const item = run.catalog.get(itemId);
  assert.ok(item, itemId);
  const offer = { id: `world-fixture-${itemId}`, itemId, price: item.price, sold: false };
  run.market.offers.push(offer);
  run.creditCoins(item.price);
  const result = run.buy(offer.id);
  assert.equal(result.ok, true, result.message);
  run.close();
}

test('Arcade pursuit crosses its grace boundary and advances once for one, two, and four seats', () => {
  const observations = [1, 2, 4].map(size => {
    const { game, session, players } = setup(size, { reverse: size === 4 });
    advance(session, 480);
    close(game.time, 4, 'four seconds of shared time');
    close(game.waveRow, -4, 'grace leaves the wave at its starting row');
    advance(session, 120);
    close(game.time, 5, 'five seconds of shared time');
    close(game.waveRow, -3.35, 'the real Arcade wave advances after grace');
    assert.ok(players.every(player => player.state === 'playing'));
    return { time: game.time, wave: game.waveRow, ticks: game.world.simulationTick };
  });
  assert.deepEqual(observations[1], observations[0]);
  assert.deepEqual(observations[2], observations[0]);
});

test('shared pursuit honors composed clock and pursuit rules while Flow keeps its trail policy', () => {
  const definition = composeModeDefinition({
    id: 'shared-clock-test', simulation: { worldTimeScale: .5 },
    pursuit: { grace: 1, speed: .4 }, pursuers: { enabled: false },
  });
  const custom = setup(4, { definition });
  advance(custom.session, 480);
  close(custom.game.time, 2, 'composed half-speed world time');
  close(custom.game.waveRow, -3.6, 'only the one post-grace world second advances pursuit');
  const flow = setup(4, { mode: 'stroll' });
  advance(flow.session, 600);
  close(flow.game.time, 2.9, 'released Flow time scale');
  close(flow.game.waveRow, -4, 'Flow does not gain an Arcade chasing wave');
});

test('WorldFrame captures fractional ground positions before each player advances', () => {
  const { game, session, players } = setup();
  clearStandingLane(game, 1);
  players[1].x = players[1].fromX = -.37;
  assert.equal(session.dispatch({ seat: 'p2', direction: 'forward' }), true);
  const before = players.map(player => ({ x: player.groundX, y: player.groundY }));
  session.update(1 / 120);
  const firstFrame = game.world.frame;
  assert.equal(firstFrame.previousTime, 0);
  for (const [index, player] of players.entries()) assert.deepEqual(firstFrame.playerGround.get(player), before[index]);
  assert.ok(players[1].groundY > before[1].y, 'the hop actually advanced after its sample');
  session.update(1 / 120);
  assert.notEqual(game.world.frame, firstFrame);
  assert.deepEqual(firstFrame.playerGround.get(players[1]), { x: -.37, y: 0 }, 'the prior frame retains its original sample');
});

test('personal structural cards cannot change newly generated shared terrain for either owner', () => {
  const snapshots = [null, 'p1', 'p2'].map(owner => {
    const { game, session, players } = setup(2, { reverse: owner === 'p2' });
    if (owner) {
      const player = players.find(candidate => candidate.seat === owner);
      for (const item of ['traffic-spacing', 'platform-length', 'scenery-clear']) buy(player.run, item);
      assert.ok(player.run.effects.trafficSpacing > 1);
      assert.ok(player.run.effects.platformLength > 1);
      assert.ok(player.run.effects.sceneryClear > 0);
    }
    const rows = [];
    for (const frontier of [40, 80, 120]) {
      game.world.noteProgress(frontier);
      game.ensureRows();
      rows.push([...game.rows].map(([row, lane]) => [row, structuredClone(lane)]));
    }
    assert.equal(session.running, true);
    return rows;
  });
  assert.deepEqual(snapshots[1], snapshots[0], 'P1 structural cards do not become shared generation policy');
  assert.deepEqual(snapshots[2], snapshots[0], 'P2 structural cards do not become shared generation policy');
  const kinds = new Set(snapshots[0].flatMap(rows => rows.map(([, lane]) => lane.kind)));
  assert.ok(kinds.has('road') && kinds.has('river') && kinds.has('meadow'), 'the fixture exercises all affected geometry kinds');
});

test('personal traffic, river, and freeze effects do not select a shared actor clock', () => {
  const snapshots = [null, 'p1', 'p2'].map(owner => {
    const { game, session, players } = setup(2, { reverse: owner === 'p2' });
    if (owner) {
      const player = players.find(candidate => candidate.seat === owner);
      for (const item of ['traffic-speed', 'river-speed', 'power-freeze']) buy(player.run, item);
      assert.equal(player.run.effects.trafficSpeed, 0, 'the personal freeze is active');
      assert.ok(player.run.effects.riverSpeed < 1);
    }
    advance(session, 120);
    const actors = [...game.rows.values()].filter(lane => lane.kind === 'road' || lane.kind === 'river');
    assert.ok(actors.some(lane => lane.kind === 'road') && actors.some(lane => lane.kind === 'river'));
    return actors.map(lane => ({ row: lane.index, kind: lane.kind, speed: lane.speed, phase: lane.phase, positions: actorPositions(lane, game.time) }));
  });
  assert.deepEqual(snapshots[1], snapshots[0], 'P1 effects do not alter shared actors');
  assert.deepEqual(snapshots[2], snapshots[0], 'P2 effects do not alter shared actors');
});

function walkingMob(y = 0) {
  return { id: 1, kind: 'slime', x: -3, y, fromX: -3, fromY: y, targetX: -2.5, targetY: y, phase: 'walking', phaseLeft: 1, phaseDuration: 1, motionSpeed: .5 };
}

test('personal mob-freeze cards cannot stop the shared director for any owner', () => {
  const observations = [null, 'p1', 'p2'].map(owner => {
    const { game, session, players } = setup();
    if (owner) {
      const player = players.find(candidate => candidate.seat === owner);
      buy(player.run, 'power-freeze');
      assert.equal(player.run.effects.mobSpeed, 0);
    }
    game.mobs.push(walkingMob());
    advance(session, 30);
    assert.equal(game.mobs.length, 1);
    return structuredClone(game.mobs);
  });
  assert.ok(observations[0][0].x > -3, 'the baseline director moved the existing mob');
  assert.deepEqual(observations[1], observations[0], 'P1 freeze cannot become shared mob policy');
  assert.deepEqual(observations[2], observations[0], 'P2 freeze cannot become shared mob policy');
});

test('a dead primary cannot cull mobs that are still beside a living secondary', () => {
  const { game, session, players } = setup();
  const p2 = players[1];
  p2.y = p2.fromY = p2.maxY = 12;
  p2.x = p2.fromX = 0;
  game.world.noteProgress(12);
  game.ensureRows();
  clearStandingLane(game, 12);
  game.end('Primary terminal fixture', 'traffic');
  game.mobs.push(walkingMob(12));
  session.update(1 / 120);
  assert.equal(p2.state, 'playing');
  assert.equal(game.mobs.length, 1, 'world retention follows the living course, not the terminal host position');
  assert.ok(game.mobs[0].x > -3, 'the surviving player still receives advancing mob encounters');
});

test('an earlier seat cannot start a gravity pull before another player claims actual contact', () => {
  const { game, session, players } = setup();
  const [p1, p2] = players;
  p1.x = p1.fromX = -.55;
  p2.x = p2.fromX = 0;
  game.rows.get(0).coin = 0;
  session.update(0);
  assert.equal(p2.coins, 1, 'the player already touching the coin wins over a newly proposed pull');
  assert.equal(p1.coins, 0);
  assert.equal(game.rows.get(0).coin, null);
  assert.equal(game.world.pickupOwners.size, 0);
});
