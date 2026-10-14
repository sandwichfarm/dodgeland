import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const source = await loadSources(['game', 'character-powers', 'market/catalog', 'devtools-state']);
after(source.dispose);
const { Game, HOP_TIME, generateLane, PLAYER_VEHICLE_RADIUS } = await source.import('game');
const { CHARACTERS, characterById } = await source.import('content');
const { characterPower } = await source.import('character-powers');
const { ITEM_CATALOG } = await source.import('market/catalog');
const { jumpDevelopmentRun, loadDevelopmentRun } = await source.import('devtools-state');
const step = 1 / 120;
const close = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-8, `${message ?? ''}: ${a} != ${b}`);

function lane(g, row, kind = 'meadow', extra = {}) {
  const value = { ...generateLane(g.seed, row, g.home), kind, blocked: [], decorations: [], coin: null,
    phase: 0, speed: 0, spacing: 20, length: 1.15, variant: 0, ...extra };
  g.rows.set(row, value); return value;
}
function arena(character = 'butter', mode = 'arcade') {
  const g = new Game(23, 'pond', mode, false, ITEM_CATALOG, character);
  for (const row of g.rows.keys()) lane(g, row);
  g.state = 'playing'; return g;
}
function tick(g, duration) {
  for (let elapsed = 0; elapsed < duration - 1e-10; elapsed += step) g.update(step);
}
function finish(g) {
  for (let count = 0; g.powerRescue && count < 200; count++) g.update(Math.min(step, g.powerRescue.remaining));
  assert.equal(g.powerRescue, null, 'rescue reaches its landing');
}
function walk(g, target) {
  while (g.maxY < target) {
    lane(g, g.y + 1); assert.equal(g.move('forward'), true);
    for (const row of g.rows.keys()) lane(g, row);
    tick(g, HOP_TIME); assert.equal(g.state, 'playing');
  }
}
function pursuer(extra = {}) {
  return { id: 1, kind: 'slime', x: 0, y: 0, fromX: 0, fromY: 0,
    targetX: 0, targetY: 0, phase: 'rest', phaseLeft: 2, phaseDuration: 2, ...extra };
}
function hazard(g, cause, face = 'front') {
  if (cause === 'water') lane(g, g.y, 'river', { phase: 10, length: 2 });
  if (cause === 'swept') { g.x = g.fromX = 5.51; lane(g, g.y, 'river', { phase: 5.51, length: 4 }); }
  if (cause === 'train') lane(g, g.y, 'rail', { phase: 2.375 - g.time, period: 9, warning: 1.5, speed: 1 });
  if (cause === 'wave') g.waveRow = g.groundY;
  if (cause === 'mob') g.mobs.push(pursuer({ x: g.x, y: g.y, fromX: g.x, fromY: g.y, targetX: g.x, targetY: g.y }));
  if (cause === 'traffic') {
    lane(g, g.y, 'road');
    if (face === 'side') { g.y = g.fromY = g.y - 1; assert.equal(g.move('forward'), true); }
    else { g.x = g.fromX = face === 'front' ? .975 : -.975; assert.equal(g.move(face === 'front' ? 'left' : 'right'), true); }
    for (let count = 0; count < 30 && g.state === 'playing' && !g.powerRescue; count++) g.update(step);
  } else g.update(0);
}
function buyShield(g) {
  const item = g.run.catalog.get('power-shield');
  g.run.advanceScore(100); assert.equal(g.openMarket(), true);
  g.run.creditCoins(item.price);
  g.run.market.offers.push({ id: 'fixture-shield', itemId: item.id, price: item.price, sold: false });
  assert.equal(g.run.buy('fixture-shield').ok, true); g.closeMarket();
}

test('all seven travelers have distinct automatic powers, including the new chicken', () => {
  assert.deepEqual(CHARACTERS.map(c => c.id).sort(), ['beep', 'butter', 'pebble', 'petal', 'pip', 'rust', 'sunny']);
  assert.equal(characterById('sunny').id, 'sunny');
  assert.equal(new Set(CHARACTERS.map(c => characterPower(c.id).id)).size, 7);
  for (const character of CHARACTERS) {
    const g = arena(character.id);
    assert.equal(g.characterId, character.id); assert.equal(g.powerReady, true); assert.equal(g.powerRemaining, 0);
    assert.equal(g.power.cooldown, 100); assert.ok(g.power.name && g.power.description && g.power.icon);
    assert.deepEqual(g.run.cards, [], 'innate powers do not consume a hand slot');
  }
});

test('every traveler averts its actual matching hazard once, preserves the run and lands safely', () => {
  for (const [character, cause, face] of [
    ['butter', 'water'], ['sunny', 'traffic', 'front'], ['pip', 'mob'], ['petal', 'traffic', 'side'],
    ['beep', 'train'], ['rust', 'mob'], ['pebble', 'wave'],
  ]) {
    const g = arena(character), powers = [], ends = [], hurts = [];
    g.health = character === 'petal' ? .5 : 2.5;
    g.run.creditCoins(41); g.onPower = event => powers.push(event); g.onEnd = () => ends.push(g.deathCause); g.onHurt = event => hurts.push(event);
    hazard(g, cause, face);
    assert.equal(g.state, 'playing', character); assert.ok(g.powerRescue, character);
    assert.deepEqual(powers.map(event => event.cause), [cause], character);
    assert.equal(powers[0].power, g.power); assert.equal(g.powerReady, false); assert.equal(g.powerRemaining, 100);
    assert.equal(g.deathCause, null); assert.equal(g.reason, ''); assert.equal(g.caughtByWave, false);
    assert.equal(g.run.wallet, 41); assert.equal(g.run.alive, true); assert.deepEqual(ends, []); assert.deepEqual(hurts, []);
    assert.equal(g.health, character === 'petal' ? 1 : 2.5, 'only Regrow changes existing health');
    assert.equal(g.lane.kind, 'meadow'); assert.equal(g.mobBlocked(g.x, g.y, PLAYER_VEHICLE_RADIUS), false);
    assert.ok(g.y > g.waveRow); assert.ok(Math.abs(g.x) <= 5);
    finish(g); g.update(0);
    assert.equal(g.state, 'playing', `${character} survives the landing`); assert.equal(powers.length, 1);
  }
});

test('duck also escapes supported river drift, while chicken and robot handle fatal road faces', () => {
  const duck = arena(); hazard(duck, 'swept'); assert.ok(duck.powerRescue); assert.equal(duck.state, 'playing');
  for (const character of ['sunny', 'beep']) for (const face of ['rear', 'side', 'front']) {
    const g = arena(character); g.health = .5; hazard(g, 'traffic', face);
    assert.ok(g.powerRescue, `${character}/${face}`); assert.equal(g.health, .5, 'averted damage does not heal previous hits');
  }
  for (const face of ['rear', 'side']) {
    const g = arena('petal'); g.health = .5; hazard(g, 'traffic', face); assert.ok(g.powerRescue); assert.equal(g.health, 1);
  }
  const petal = arena('petal'); hazard(petal, 'mob'); assert.ok(petal.powerRescue); assert.equal(petal.health, 1);
});

test('powers never replace nonfatal damage or save unrelated hazards', () => {
  const chicken = arena('sunny'), hurt = []; chicken.onHurt = event => hurt.push(event);
  hazard(chicken, 'traffic', 'side'); assert.equal(chicken.health, 1); assert.equal(chicken.powerReady, true);
  assert.equal(chicken.powerRescue, null); assert.deepEqual(hurt, [{ face: 'side', amount: 2 }]);
  for (const [character, cause, face] of [
    ['butter', 'traffic', 'front'], ['sunny', 'train'], ['pip', 'water'], ['petal', 'traffic', 'front'],
    ['beep', 'water'], ['rust', 'wave'], ['pebble', 'water'],
  ]) {
    const g = arena(character); hazard(g, cause, face);
    assert.equal(g.state, 'dead', `${character}/${cause}`); assert.equal(g.deathCause, cause); assert.equal(g.powerRescue, null);
  }
});

test('cooldown is 100 new blocks from use, not time, a round-score boundary or backtracking', () => {
  const g = arena('butter', 'stroll'); walk(g, 99); hazard(g, 'water');
  assert.equal(g.maxY, 99); assert.equal(g.powerRemaining, 100); finish(g);
  for (const row of g.rows.keys()) lane(g, row);
  g.update(400); assert.equal(g.powerRemaining, 100, 'waiting does not replenish a power');
  assert.equal(g.move('back'), true); tick(g, HOP_TIME);
  walk(g, 100); assert.equal(g.powerRemaining, 99, 'crossing score 100 does not reset a charge used at 99');
  assert.equal(g.move('back'), true); tick(g, HOP_TIME); assert.equal(g.move('forward'), true); tick(g, HOP_TIME);
  assert.equal(g.powerRemaining, 99, 'revisiting the same row does not count');
  walk(g, 198); assert.equal(g.powerRemaining, 1); assert.equal(g.powerReady, false);
  walk(g, 199); assert.equal(g.powerReady, true); hazard(g, 'water'); assert.ok(g.powerRescue); assert.equal(g.powerRemaining, 100);
});

test('a second matching hazard during cooldown ends exactly once and clears the wallet', () => {
  const g = arena('butter', 'stroll'), powers = [], ends = [];
  g.onPower = event => powers.push(event); g.onEnd = () => ends.push(g.deathCause); g.run.creditCoins(9);
  hazard(g, 'water'); finish(g); hazard(g, 'water');
  assert.equal(g.state, 'dead'); assert.equal(g.deathCause, 'water'); assert.equal(g.health, 0);
  assert.equal(g.run.wallet, 0); assert.equal(powers.length, 1); assert.deepEqual(ends, ['water']);
  g.update(10); g.end('another contact', 'traffic'); assert.deepEqual(ends, ['water']);
});

test('rescue input locks only for its arc and pause freezes animation, clocks and cooldown', () => {
  const g = arena('butter', 'stroll'); hazard(g, 'water');
  const before = [g.groundX, g.groundY, g.time, g.powerRescue.remaining, g.powerRemaining, g.powerFlash];
  for (const direction of ['forward', 'back', 'left', 'right']) assert.equal(g.move(direction), false);
  g.pause(); g.update(10); assert.deepEqual([g.groundX, g.groundY, g.time, g.powerRescue.remaining, g.powerRemaining, g.powerFlash], before);
  g.resume(); g.update(g.power.duration / 2);
  assert.ok(g.powerRescue.remaining < before[3]); close(g.groundX, (g.powerRescue.fromX + g.x) / 2); close(g.groundY, (g.powerRescue.fromY + g.y) / 2);
  finish(g); close(g.groundX, g.x); close(g.groundY, g.y); assert.equal(g.hop, 0);
  lane(g, g.y + 1); assert.equal(g.move('forward'), true); assert.equal(g.hop, HOP_TIME);
});

test('changing travelers preserves one shared spent charge and does not alter an active escape', () => {
  const g = arena('butter', 'stroll'); hazard(g, 'water');
  const active = g.powerRescue, position = [g.groundX, g.groundY];
  for (const traveler of CHARACTERS) {
    g.setCharacter(traveler.id); assert.equal(g.characterId, traveler.id); assert.equal(g.power, characterPower(traveler.id));
    assert.equal(g.powerRemaining, 100); assert.equal(g.powerRescue, active); assert.deepEqual([g.groundX, g.groundY], position);
  }
  finish(g); g.setCharacter('sunny'); hazard(g, 'traffic', 'front'); assert.equal(g.state, 'dead', 'wardrobe swaps cannot chain new rescues');
  const fresh = arena('sunny'); assert.equal(fresh.powerReady, true); hazard(fresh, 'traffic'); assert.ok(fresh.powerRescue);
  const replay = Game.fromSeed(fresh.seedCode, ITEM_CATALOG, 'sunny'); assert.equal(replay.characterId, 'sunny'); assert.equal(replay.powerReady, true);
});

test('Bubble Wrap protects first and its expiration leaves the innate charge available', () => {
  for (const [character, cause] of [['butter', 'water'], ['sunny', 'traffic'], ['pip', 'mob'], ['beep', 'train'], ['pebble', 'wave']]) {
    const g = arena(character); buyShield(g); const events = []; g.onPower = event => events.push(event);
    hazard(g, cause); assert.equal(g.state, 'playing'); assert.equal(g.powerReady, true); assert.equal(g.powerRescue, null);
    assert.deepEqual(events, []); assert.equal(g.health, 3);
    g.run.powers[0].remaining = .001;
    if (cause === 'traffic') { g.x = g.fromX = .5; g.y = g.fromY = 0; g.hop = 0; }
    g.update(.002); assert.equal(g.state, 'playing'); assert.ok(g.powerRescue, `${character}/${cause} charge survives shield`); assert.equal(events.length, 1);
  }
});

test('rescue neither awards path coins nor scores its destination or rewrites terrain', () => {
  const g = arena('butter', 'stroll'), rewards = []; g.onCoin = amount => rewards.push(amount);
  lane(g, 0, 'river', { phase: 10, length: 2, coin: 0 }); lane(g, 1, 'meadow', { coin: 0 });
  const rows = structuredClone([...g.rows]), score = g.maxY, wallet = g.run.wallet;
  g.update(0); assert.ok(g.powerRescue); assert.equal(g.y, 1);
  g.update(g.power.duration / 2); assert.deepEqual(rewards, []); assert.equal(g.maxY, score); assert.equal(g.run.wallet, wallet);
  finish(g); assert.deepEqual(rewards, []); assert.equal(g.maxY, score); assert.equal(g.run.wallet, wallet);
  assert.deepEqual([...g.rows], rows, 'the original lane geometry and uncollected coins remain unchanged');
  g.update(0); assert.deepEqual(rewards, [1], 'ordinary contact collects the landing coin once after rescue');
});

test('unsafe and boxed-in landing candidates are rejected without spending a charge', () => {
  const g = arena('butter');
  for (const row of g.rows.keys()) lane(g, row, 'river', { phase: 10, length: 2 });
  for (const row of [-1, 1]) lane(g, row, 'meadow', { blocked: Array.from({ length: 11 }, (_, i) => i - 5) });
  g.update(0); assert.equal(g.state, 'dead'); assert.equal(g.deathCause, 'water'); assert.equal(g.powerRescue, null); assert.equal(g.powerRemaining, 0);
  const crowded = arena(); lane(crowded, 1, 'meadow', { blocked: [0] });
  crowded.mobs.push(pursuer({ x: -1, y: -1, fromX: -1, fromY: -1, targetX: -1, targetY: -1 }));
  hazard(crowded, 'water'); assert.ok(crowded.powerRescue);
  assert.equal(crowded.mobBlocked(crowded.x, crowded.y, PLAYER_VEHICLE_RADIUS), false);
  assert.ok(crowded.mobs.every(mob => Math.hypot(mob.x - crowded.x, mob.y - crowded.y) >= 1.5));
});

test('a stacked contact cannot kill mid-rescue or prevent other mobs from advancing', () => {
  const g = arena(); hazard(g, 'water');
  const first = pursuer({ kind: 'wasp' }), second = pursuer({ id: 2, x: 4, fromX: 4, targetX: 4 });
  g.mobs.push(first, second);
  g.update(.01); assert.equal(g.state, 'playing'); assert.ok(g.powerRescue);
  close(second.phaseLeft, 1.99, 'unrelated mob clocks continue even when the first mob touches the escape arc');
  g.end('simultaneous train', 'train'); assert.equal(g.state, 'playing'); assert.equal(g.deathCause, null);
});

test('brief landing grace gives time to evade a pursuer but does not protect other hazards', () => {
  const g = arena('pip'); hazard(g, 'mob'); finish(g);
  assert.equal(g.powerAvoidsMobs, true);
  g.mobs.splice(0, g.mobs.length, pursuer({ x: g.x, y: g.y, fromX: g.x, fromY: g.y, targetX: g.x, targetY: g.y }));
  g.update(0); assert.equal(g.state, 'playing', 'overlapping pursuer cannot kill on the first landing frame');
  g.pause(); g.update(10); assert.equal(g.powerAvoidsMobs, true); g.resume();
  g.update(.2); assert.equal(g.state, 'playing');
  g.update(.3); assert.equal(g.state, 'dead'); assert.equal(g.deathCause, 'mob', 'grace expires without renewing the distance cooldown');
  const duck = arena(); hazard(duck, 'water'); finish(duck); assert.equal(duck.powerAvoidsMobs, true);
  hazard(duck, 'train'); assert.equal(duck.state, 'dead'); assert.equal(duck.deathCause, 'train', 'mob grace is not another all-hazard shield');
});

test('development jumps and loaded seeds keep traveler and callbacks but create fresh power state', () => {
  const current = arena('sunny'); const onPower = () => {}; current.onPower = onPower;
  hazard(current, 'traffic'); assert.equal(current.powerRemaining, 100);
  for (const next of [jumpDevelopmentRun(current, 150), loadDevelopmentRun(current, current.seedCode, ITEM_CATALOG)]) {
    assert.equal(next.characterId, 'sunny'); assert.equal(next.onPower, onPower); assert.equal(next.powerReady, true);
    assert.equal(next.powerRescue, null); assert.equal(next.state, 'paused'); assert.equal(next.seedCode, current.seedCode);
  }
});
