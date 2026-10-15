import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'session']);
after(() => sources.dispose());
const { Game } = await sources.import('game');
const { LocalSession } = await sources.import('session');
const step = 1 / 120;

function setLane(game, row, kind = 'meadow', extra = {}) {
  const lane = {
    ...game.rows.get(row), kind, blocked: [], decorations: [], coin: null,
    phase: 0, speed: 1, spacing: 20, length: 1.15, variant: 0, ...extra,
  };
  game.rows.set(row, lane);
  return lane;
}

function startSession({ primary = 'butter', secondary = 'pip', mode = 'arcade' } = {}) {
  const game = new Game(71, 'pond', mode, false, [], primary);
  for (const row of game.rows.keys()) setLane(game, row);
  const session = LocalSession.stage(game, { secondaryCharacterId: secondary }).commit();
  const p2 = session.players.find(player => player.seat === 'p2');
  assert.ok(p2);
  return { game, session, p2 };
}

function tick(session, seconds) {
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += step) session.update(Math.min(step, seconds - elapsed));
}

test('P2 resolves the released front, rear, and side road contacts with its own health', () => {
  for (const direction of [-1, 1]) for (const [face, remaining] of [['rear', 2], ['side', 1], ['front', 0]]) {
    const { game, session, p2 } = startSession();
    const length = 1.15;
    const hurts = [], ends = [];
    p2.onHurt = event => hurts.push(event);
    p2.onEnd = () => ends.push(p2.deathCause);
    game.x = game.fromX = 0; game.y = game.fromY = -2;
    setLane(game, -2);
    p2.x = p2.fromX = 0;
    setLane(game, p2.y, 'road', { speed: direction, length });
    if (face === 'side') {
      p2.y = p2.fromY = -1;
      setLane(game, -1); setLane(game, 0, 'road', { speed: direction, length });
      assert.equal(session.dispatch({ seat: 'p2', direction: 'forward' }), true);
    } else {
      p2.x = p2.fromX = (length / 2 + .4) * direction * (face === 'rear' ? -1 : 1);
      assert.equal(session.dispatch({ seat: 'p2', direction: (face === 'rear' ? direction : -direction) > 0 ? 'right' : 'left' }), true);
    }
    tick(session, game.rules.movement.hopDuration);
    assert.equal(p2.health, remaining, `${face} contact at direction ${direction}`);
    assert.equal(p2.state, face === 'front' ? 'dead' : 'playing');
    assert.equal(game.state, 'playing', 'a P2 impact never ends P1');
    assert.deepEqual(hurts, face === 'front' ? [] : [{ face, amount: face === 'rear' ? 1 : 2 }]);
    assert.deepEqual(ends, face === 'front' ? ['traffic'] : []);
  }
});

test('P2 river movement uses its own rescue, cooldown, and death state', () => {
  const { game, session, p2 } = startSession({ primary: 'pip', secondary: 'butter' });
  p2.x = p2.fromX = 0; p2.y = p2.fromY = 0;
  setLane(game, 0, 'river', { phase: 3, length: 2, speed: 1 });
  session.update(step);
  assert.equal(p2.state, 'playing');
  assert.ok(p2.powerRescue, 'Butter starts its personal river rescue instead of dying');
  assert.equal(p2.earnedDistance, 0, 'rescue does not inherit P1 progress');
  assert.equal(p2.powerReadyAt - p2.earnedDistance, 100, 'P2 cooldown starts from its own earned distance');
  tick(session, p2.power.duration + step);
  assert.equal(p2.powerRescue, null, 'rescue completes through the shared per-player operation');

  const drowning = startSession({ primary: 'pip', secondary: 'sunny' });
  drowning.p2.x = drowning.p2.fromX = 0; drowning.p2.y = drowning.p2.fromY = 0;
  setLane(drowning.game, 0, 'river', { phase: 3, length: 2, speed: 1 });
  drowning.session.update(step);
  assert.equal(drowning.p2.state, 'dead');
  assert.equal(drowning.p2.deathCause, 'water');
});

test('shared rewards are claimed once by the eligible seat and retain independent wallets and spills', () => {
  const { game, session, p2 } = startSession();
  game.y = game.fromY = -2; p2.x = p2.fromX = 0; p2.y = p2.fromY = 0;
  setLane(game, -2); setLane(game, 0, 'meadow', { coin: 0 });
  let primaryCoinCalls = 0;
  const secondaryCoinCalls = [];
  game.onCoin = () => { primaryCoinCalls++; };
  p2.onCoin = amount => { secondaryCoinCalls.push(amount); };
  session.update(0);
  assert.equal(p2.coins, 1);
  assert.equal(p2.run.wallet, 1);
  assert.equal(game.coins, 0);
  assert.equal(game.run.wallet, 0);
  assert.equal(primaryCoinCalls, 0, 'a P2 reward does not report as a P1 callback');
  assert.deepEqual(secondaryCoinCalls, [1], 'the claimed reward reports through P2 exactly once');
  assert.equal(game.rows.get(0).coin, null, 'one shared reward is retired once');

  p2.health = 1;
  setLane(game, 0, 'road', { speed: 0, phase: 0, length: 1.15 });
  session.update(0);
  assert.equal(p2.state, 'dead');
  assert.ok(p2.deathSpill);
  assert.equal(game.state, 'playing');
  assert.equal(game.run.wallet, 0, 'P2 terminal clearing never clears P1 inventory');
});

test('joining high in a live course grants no retroactive health, coins, or cooldown progress', () => {
  const game = new Game(29, 'pond', 'stroll', false, [], 'pip');
  game.maxY = 200; game.x = game.fromX = 0; game.y = game.fromY = 200;
  game.ensureRows();
  for (const row of game.rows.keys()) setLane(game, row);
  const session = LocalSession.stage(game, { secondaryCharacterId: 'butter' }).commit();
  const p2 = session.players.find(player => player.seat === 'p2');
  assert.ok(p2);
  p2.health = 1;
  assert.equal(p2.earnedDistance, 0);
  assert.equal(p2.run.wallet, 0);
  assert.equal(p2.healedMilestone, 0);
  assert.equal(p2.powerRemaining, 0);
  assert.equal(session.dispatch({ seat: 'p2', direction: 'forward' }), true);
  assert.equal(p2.earnedDistance, 1);
  assert.equal(p2.health, 1, 'the first high-row hop cannot grant skipped regeneration milestones');
  assert.equal(p2.run.wallet, 0, 'the first high-row hop uses the released first-score reward path without retroactive credits');
});

test('one session tick advances shared time, effects, wave/director, and pulls once while a dead P1 stays terminal', () => {
  const { game, session, p2 } = startSession({ mode: 'stroll' });
  let effects = 0, director = 0;
  const syncEffects = game.syncEffects.bind(game);
  game.syncEffects = () => { effects++; return syncEffects(); };
  const updateDirector = game.mobDirector.update.bind(game.mobDirector);
  game.mobDirector.update = (...args) => { director++; return updateDirector(...args); };
  const beforeTime = game.time;
  session.update(step);
  assert.equal(game.time, beforeTime + step * game.rules.simulation.worldTimeScale);
  assert.equal(effects, 0, 'player card effects cannot mutate the shared world policy');
  assert.equal(director, 1, 'the current director contract runs once');

  game.end('P1 terminal test');
  const snapshot = { state: game.state, x: game.x, y: game.y, coins: game.coins, wallet: game.run.wallet, cause: game.deathCause };
  const terminalTime = game.time;
  session.update(step);
  assert.equal(game.time, terminalTime + step * game.rules.simulation.worldTimeScale, 'P2 preserves the one shared world clock after P1 dies');
  assert.deepEqual({ state: game.state, x: game.x, y: game.y, coins: game.coins, wallet: game.run.wallet, cause: game.deathCause }, snapshot, 'the terminal primary remains untouched');
  assert.equal(p2.state, 'playing');
});

test('adopted P1 keeps solo progress but transfer placement cannot earn power, healing or market milestones', () => {
  const game = new Game(29, 'pond', 'stroll', false, [], 'butter');
  const clear = () => { for (const row of game.rows.keys()) setLane(game, row); game.mobs.length = 0; };
  for (let hop = 0; hop < 98; hop++) {
    clear(); assert.equal(game.move('forward'), true); clear();
    game.update(game.rules.movement.hopDuration);
  }
  assert.equal(game.maxY, 98); assert.equal(game.run.maxScore, 98);
  game.end('Adoption power test', 'water');
  assert.equal(game.powerRescue?.power.id, 'water-bounce');
  clear(); game.update(game.power.duration + step);
  assert.equal(game.powerRescue, null);
  game.health = 1;
  const before = { score: game.run.maxScore, power: game.powerRemaining, health: game.health, wallet: game.run.wallet };
  LocalSession.stage(game, { secondaryCharacterId: 'pip' }).cancel();
  assert.deepEqual({ score: game.run.maxScore, power: game.powerRemaining, health: game.health, wallet: game.run.wallet }, before);
  const session = LocalSession.stage(game, { secondaryCharacterId: 'pip' }).commit();
  const [p1, p2] = session.players;
  assert.equal(p1.earnedDistance, 0, 'pre-adoption distance is retained separately from session-earned movement');
  assert.equal(p1.powerRemaining, before.power);
  // Stage the outgoing runner on a distant safe bank, then use the generic
  // production transfer API. No Relay-specific score adjustment is involved.
  session.world.noteProgress(200); game.ensureRows(); clear();
  p2.y = p2.fromY = p2.maxY = 200; p2.hop = 0;
  assert.equal(session.transferPosition('p2', 'p1'), true);
  assert.equal(p1.maxY, 200);
  assert.equal(p1.run.maxScore, 98);
  assert.equal(p1.run.wallet, before.wallet);
  assert.equal(p1.powerRemaining, before.power, 'placement alone never recharges the adopted power');
  session.start();
  assert.equal(p1.personalScore, 98, 'repeated start cannot rebase score onto the transferred position');
  assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), true);
  assert.equal(p1.run.maxScore, 99, 'the first post-transfer hop continues the adopted personal score');
  assert.equal(p1.health, 1, 'placement cannot grant the skipped 100/200-row healing thresholds');
  assert.equal(p1.run.market, null, 'placement cannot create a market invitation');
  assert.equal(p1.powerRemaining, before.power - 1);
  assert.equal(game.powerRemaining, p1.powerRemaining, 'the primary facade and player HUD agree outside an operation');
  clear(); tick(session, game.rules.movement.hopDuration);
  assert.equal(p1.statistics.distance, 99);
  assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), true);
  assert.equal(p1.run.maxScore, 100);
  assert.equal(p1.health, 1.5, 'the actual second earned tile reaches the retained 100-point threshold');
  assert.equal(p1.run.market.milestone, 100);
  assert.equal(p1.earnedDistance, 2);
});
