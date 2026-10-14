import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { loadSources } from './source-loader.mjs';
const source = await loadSources(['devtools-state', 'market/catalog']);
after(() => source.dispose());
const { Game, WAVE_TRAIL } = await source.import('game');
const { createRunSeed } = await source.import('run-seed');
const { generateSeedLane } = await source.import('levels/index');
const { jumpDevelopmentRun, loadDevelopmentRun, developmentScore, developmentDiagnostics } = await source.import('devtools-state');
const { ITEM_CATALOG } = await source.import('market/catalog');

test('development score accepts only bounded whole finite values', () => {
  for (const [input, expected] of [[-1, 0], [NaN, 0], [Infinity, 0], [-Infinity, 0], [99.9, 99], [1e9, 100000]]) assert.equal(developmentScore(input), expected);
});
test('jump replaces stale state, preserves seed/world/mode/catalog and generates a bounded seeded neighborhood', () => {
  const original = new Game(123, 'pond', 'arcade', true, ITEM_CATALOG);
  original.state = 'dead'; original.health = 0; original.hurtRemaining = 1; original.hop = .1;
  original.run.creditCoins(50); original.mobs.push({ kind: 'slime' });
  const end = original.onEnd = () => {};
  for (const score of [0, 99, 100, 159, 160, 319, 320, 479, 480, 100000]) {
    const next = jumpDevelopmentRun(original, score);
    assert.notEqual(next, original); assert.equal(next.seed, original.seed); assert.equal(next.home, original.home);
    assert.equal(next.mode, original.mode); assert.equal(next.gentle, original.gentle); assert.equal(next.onEnd, end);
    assert.equal(next.run.catalog.size, original.run.catalog.size); assert.equal(next.run.wallet, 0); assert.equal(next.run.cards.length, 0);
    assert.equal(next.state, 'paused'); assert.equal(next.maxY, score); assert.equal(next.groundY, score);
    assert.equal(next.hop, 0); assert.equal(next.fromY, score); assert.equal(next.x, 0); assert.equal(next.fromX, 0);
    assert.equal(next.health, next.maxHealth); assert.equal(next.hurtRemaining, 0); assert.equal(next.mobs.length, 0);
    assert.equal(next.waveRow, score - WAVE_TRAIL); assert.equal(next.time, score * .45);
    assert.equal(next.rows.size, 39); assert.equal(next.lane.kind, 'meadow'); assert.deepEqual(next.lane.blocked, []);
    assert.deepEqual(next.rows.get(score + 1), generateSeedLane(original.runSeed, score + 1));
    assert.equal(next.run.market?.milestone ?? null, score >= 100 ? Math.floor(score / 100) * 100 : null);
    next.resume(); next.update(1 / 120); assert.equal(next.state, 'playing', 'safe landing survives first simulation step');
  }
  assert.equal(original.state, 'dead'); assert.equal(original.run.wallet, 50); assert.equal(original.mobs.length, 1);
});
test('jump initializes real heal and market milestone bookkeeping without callbacks or lifetime coins', () => {
  const original = new Game(777, 'pond', 'stroll', false, ITEM_CATALOG);
  let events = 0; original.onCoin = original.onHeal = () => events++;
  const next = jumpDevelopmentRun(original, 999);
  assert.equal(events, 0); next.health = 1; next.rows.get(1000).blocked = [];
  next.resume(); assert.equal(next.move('forward'), true);
  assert.equal(next.health, 1.5, 'next milestone heals once rather than all skipped hundreds');
  assert.equal(next.run.market.milestone, 1000); assert.equal(events, 1);
});
test('diagnostics expose useful state without changing the run', () => {
  const game = jumpDevelopmentRun(new Game(77), 320);
  const before = JSON.stringify(game);
  const output = developmentDiagnostics(game, true);
  for (const label of ['SANDBOX', 'records disabled', 'score 320', 'seed 77', 'code ph3-0000004d-pond-a-n', 'chapter 11', 'time 144.00s', 'health', 'wallet', 'market 300', 'mobs none', 'rows 39']) assert.ok(output.includes(label), label);
  assert.equal(JSON.stringify(game), before);
});

test('jump preserves all captured schema identities and their copied codes recreate the courses', () => {
  for (const schema of [1, 2, 3]) {
    const original = new Game(createRunSeed(0xfedcba98, 'shuffle', 'stroll', true, schema), undefined, undefined, undefined, ITEM_CATALOG);
    const code = original.seedCode;
    // Later preference-like changes cannot rewrite the course captured at birth.
    original.seed = 5; original.home = 'frost'; original.mode = 'arcade'; original.gentle = false;
    const jumped = jumpDevelopmentRun(original, 320);
    assert.equal(jumped.seedCode, code); assert.deepEqual(jumped.runSeed, original.runSeed);
    assert.equal(jumped.seed, 0xfedcba98); assert.equal(jumped.home, 'shuffle');
    assert.equal(jumped.mode, 'stroll'); assert.equal(jumped.gentle, true);
    const replay = Game.fromSeed(jumped.seedCode, ITEM_CATALOG);
    replay.rows.clear(); replay.maxY = jumped.maxY; replay.ensureRows();
    for (const [row, lane] of jumped.rows) if (row !== jumped.maxY) assert.deepEqual(lane, replay.rows.get(row));
  }
});

test('loading a copied seed creates a paused fresh sandbox candidate with the full target-mode catalog', () => {
  const current = jumpDevelopmentRun(new Game(4, 'pond', 'stroll', false, ITEM_CATALOG), 480);
  current.run.creditCoins(50);
  const callbacks = ['onCoin', 'onEnd', 'onMobSpawn', 'onMobAttack', 'onHurt', 'onHeal'];
  let calls = 0;
  for (const name of callbacks) current[name] = () => calls++;
  const before = JSON.stringify(current);
  for (const schema of [1, 2, 3]) {
    const target = new Game(createRunSeed(42, 'orchard', 'arcade', true, schema), undefined, undefined, undefined, ITEM_CATALOG);
    const loaded = loadDevelopmentRun(current, ` ${target.seedCode}\n`, ITEM_CATALOG);
    assert.equal(loaded.seedCode, target.seedCode); assert.equal(loaded.state, 'paused');
    assert.equal(loaded.maxY, 0); assert.equal(loaded.time, 0); assert.equal(loaded.groundY, 0);
    assert.equal(loaded.run.wallet, 0); assert.equal(loaded.run.cards.length, 0); assert.equal(loaded.mobs.length, 0);
    assert.deepEqual([...loaded.rows], [...target.rows]);
    assert.deepEqual([...loaded.run.catalog.keys()], [...target.run.catalog.keys()]);
    assert.ok(loaded.run.catalog.size > current.run.catalog.size, 'Arcade-only items return when loading from a Stroll run');
    for (const name of callbacks) assert.equal(loaded[name], current[name]);
    assert.equal(calls, 0); assert.equal(JSON.stringify(current), before);
  }
});

test('an invalid copied seed does not alter the current run or invoke callbacks', () => {
  const current = new Game(9, 'frost', 'stroll', false, ITEM_CATALOG);
  let calls = 0; current.onCoin = current.onEnd = () => calls++;
  const before = JSON.stringify(current);
  for (const code of ['', 'ph4-00000009-frost-s-n', 'ph1-00000009-unknown-s-n']) assert.throws(() => loadDevelopmentRun(current, code, ITEM_CATALOG));
  assert.equal(calls, 0); assert.equal(JSON.stringify(current), before);
});
