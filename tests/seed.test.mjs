import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'run-seed', 'levels/index', 'market/catalog']);
after(sources.dispose);
const { Game, generateLane, random } = await sources.import('game');
const { CURRENT_LEVEL_SCHEMA, createRunSeed, encodeRunSeed, decodeRunSeed, validateRunSeed } = await sources.import('run-seed');
const { generateSeedLane } = await sources.import('levels/index');
const { progressiveActors, progressiveCoinPosition } = await sources.import('actors');
const { WORLDS_V1, HOME_IDS_V1 } = await sources.import('levels/v1-content');
const { WORLDS } = await sources.import('content');
const { ITEM_CATALOG } = await sources.import('market/catalog');
const seeds = [0, 1, 78, 0x12345678, 0x80000000, 0xffffffff];
const rows = [...Array.from({ length: 266 }, (_, index) => index - 10), 1000, 10000, 1e6, 1e9];
const compact = lane => ({ ...lane, world: lane.world.id });
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('schema 1 retains the original 22,680-row course and immutable model snapshots', () => {
  // Captured against the original generator before moving any implementation.
  const hash = createHash('sha256');
  for (const seed of seeds) for (const home of HOME_IDS_V1) for (const gentle of [false, true]) {
    const run = createRunSeed(seed, home, 'arcade', gentle, 1);
    for (const row of rows) {
      const lane = generateSeedLane(run, row);
      assert.deepEqual(lane, generateLane(seed, row, home, gentle), 'schema extraction preserves live baseline');
      hash.update(JSON.stringify([seed, home, gentle, row, compact(lane)]));
    }
  }
  assert.equal(hash.digest('hex'), 'c0a8ccde3e2b061823b2ff58fb5e44db300936e2a8e5ddae25467543de5cd7bc');
  assert.equal(digest(WORLDS_V1), '4df65c0df76fd12c84ae10e53e23c9fb5c0bbfa984a5821e00c686736a43027d');
  assert.ok(Object.isFrozen(WORLDS_V1));
  assert.ok(Object.isFrozen(WORLDS_V1[0].patterns[0]));
  assert.ok(Object.isFrozen(WORLDS_V1[0].vehicles[0][0]));
  assert.throws(() => { WORLDS_V1[0].vehicles[0][0].w = 20; }, TypeError);
});

test('initial games retain their pre-versioning lanes in both modes and gentle settings', () => {
  const hash = createHash('sha256');
  for (const seed of seeds) for (const home of HOME_IDS_V1) for (const mode of ['arcade', 'stroll']) for (const gentle of [false, true]) {
    const game = new Game(createRunSeed(seed, home, mode, gentle, 1));
    hash.update(JSON.stringify([seed, home, mode, gentle, [...game.rows.values()].map(compact)]));
  }
  assert.equal(hash.digest('hex'), 'cf9786d3d8900f3e38167a7ff6129bb10ff5879162727bbbdd7cbb40d0e6d6d9');
});

test('schema 1 RNG has pinned unsigned-boundary vectors', () => {
  const fixtures = [
    [0, [0.26642920868471265, 0.0003297457005828619, 0.2232720274478197, 0.1462021479383111]],
    [1, [0.6270739405881613, 0.002735721180215478, 0.5274470399599522, 0.9810509674716741]],
    [0x80000000, [0.8205775609239936, 0.4481089550536126, 0.7836112855002284, 0.5120457962621003]],
    [0xffffffff, [0.8964226141106337, 0.189478256739676, 0.7156526781618595, 0.9440599093213677]],
  ];
  for (const [seed, expected] of fixtures) {
    const next = random(seed);
    assert.deepEqual(expected.map(() => next()), expected);
  }
});

test('schema 2 retains its released actor recipes, trajectories and platform-bound coins', () => {
  // Roads and rivers at each introduction tier; row 400 itself is a relief row.
  const fixtures = [[2, 50], [1, 50], [4, 100], [6, 100], [24, 150], [0, 150], [0, 400], [0, 401], [2, 401]];
  const times = [0, .25, 1, 3, 10, 25, 39.5, 42.5, 60, 120, 1000];
  const captured = fixtures.map(([seed, row]) => {
    const lane = generateSeedLane(createRunSeed(seed, 'pond', 'arcade', false, 2), row);
    return [seed, row, compact(lane), times.map(time => ({
      time, actors: progressiveActors(lane, time, time - 1 / 60),
      coins: lane.kind === 'river' ? [-1, 0, 7].map(id => progressiveCoinPosition(lane, time, id)) : [],
    }))];
  });
  assert.ok(captured.some(([, , , frames]) => frames.some(frame => frame.actors.some(actor => actor.accelerating))), 'snapshot includes an active sports-car acceleration');
  // Ignore sub-nanotile floating-point differences across JS engines.
  const stable = JSON.stringify(captured, (_key, value) => typeof value === 'number' ? Math.round(value * 1e9) / 1e9 : value);
  assert.equal(createHash('sha256').update(stable).digest('hex'), 'b5bb938f21445539b1891965028fcc844d87b639528691af672d54eea38cc732');
});

test('schema 3 changes only pickup denomination metadata and leaves all schema 2 course dynamics intact', () => {
  const found = new Set();
  const hash = createHash('sha256');
  for (const seed of seeds) for (const home of HOME_IDS_V1) for (const gentle of [false, true]) {
    const previous = createRunSeed(seed, home, 'arcade', gentle, 2);
    const current = createRunSeed(seed, home, 'arcade', gentle, 3);
    for (const row of rows) {
      const original = generateSeedLane(previous, row);
      const { coinDenomination, ...lane } = generateSeedLane(current, row);
      assert.deepEqual(lane, original, `seed ${seed}, ${home}, row ${row} keeps terrain, actors, spacing, and coin position`);
      hash.update(JSON.stringify([seed, home, gentle, row, lane.coin, coinDenomination ?? 'coin']));
      if (coinDenomination) {
        assert.notEqual(lane.coin, null, 'only spawned pickups receive denominations');
        assert.notEqual(coinDenomination, 'coin', 'ordinary pickups retain their original shape');
        found.add(coinDenomination);
      }
    }
  }
  assert.deepEqual([...found].sort(), ['bar', 'big-sack', 'huge-sack', 'small-sack']);
  assert.equal(hash.digest('hex'), 'd8343cf683a490c97fa6ec497ad85270e03b80f0bacb493a85bbe1cf4dc08a84', 'schema 3 pickup positions and denomination rolls stay pinned');
});

test('new runs choose schema 3 while copied schema 1 and 2 identities remain pinned', () => {
  assert.equal(CURRENT_LEVEL_SCHEMA, 3);
  assert.equal(encodeRunSeed(createRunSeed(0, 'pond')), 'ph3-00000000-pond-a-n');
  assert.equal(encodeRunSeed(createRunSeed(0xffffffff, 'shuffle', 'stroll', true)), 'ph3-ffffffff-shuffle-s-g');
  assert.equal(new Game(0).seedCode, 'ph3-00000000-pond-a-n');
  for (const schema of [1, 2]) {
    const oldCode = `ph${schema}-ffffffff-shuffle-s-g`;
    const oldRun = validateRunSeed(decodeRunSeed(oldCode));
    assert.equal(oldRun.schema, schema);
    assert.equal(encodeRunSeed(oldRun), oldCode);
    assert.equal(Game.fromSeed(oldCode).seedCode, oldCode);
  }
});

test('all canonical schemas round trip all homes, settings and uint32 limits', () => {
  for (const schema of [1, 2, 3]) for (const seed of seeds) for (const home of HOME_IDS_V1) for (const mode of ['arcade', 'stroll']) for (const gentle of [false, true]) {
    const descriptor = createRunSeed(seed, home, mode, gentle, schema);
    const code = encodeRunSeed(descriptor);
    const decoded = decodeRunSeed(code);
    assert.deepEqual(decoded, descriptor);
    assert.equal(encodeRunSeed(decoded), code);
    assert.ok(Object.isFrozen(descriptor)); assert.ok(Object.isFrozen(decoded));
    const game = Game.fromSeed(code);
    assert.equal(game.seedCode, code);
    assert.deepEqual(game.runSeed, descriptor);
    assert.deepEqual([game.seed, game.home, game.mode, game.gentle], [seed, home, mode, gentle]);
  }
});

test('malformed, incomplete and unsupported identities fail instead of using current defaults', () => {
  const valid = createRunSeed(1);
  for (const seed of [-1, 0x100000000, NaN, Infinity, 1.5, '1', null, undefined]) assert.throws(() => createRunSeed(seed));
  for (const home of ['home', 'unknown', '', 'POND']) assert.throws(() => createRunSeed(1, home));
  for (const schema of [0, 4, -1, 1.5, '1', null]) assert.throws(() => createRunSeed(1, 'pond', 'arcade', false, schema));
  for (const invalid of [
    null, {}, { ...valid, schema: 4 }, { ...valid, schema: '2' }, { ...valid, seed: -1 }, { ...valid, home: undefined },
    { ...valid, mode: undefined }, { ...valid, gentle: undefined }, { ...valid, gentle: 1 },
  ]) {
    assert.throws(() => validateRunSeed(invalid));
    assert.throws(() => encodeRunSeed(invalid));
    assert.throws(() => new Game(invalid));
  }
  for (const code of [
    '', null, 1, 'ph4-00000001-pond-a-n', 'ph01-00000001-pond-a-n', 'ph02-00000001-pond-a-n', 'ph03-00000001-pond-a-n', 'ph0-00000001-pond-a-n',
    'ph1-0000001-pond-a-n', 'ph1-100000000-pond-a-n', 'ph1-0000000A-pond-a-n',
    'ph1-00000001-home-a-n', 'ph1-00000001-pond-arcade-n', 'ph1-00000001-pond-a-false',
    ' ph1-00000001-pond-a-n', 'ph1-00000001-pond-a-n\n', 'ph1-00000001-pond-a-n-extra',
  ]) assert.throws(() => Game.fromSeed(code), String(code));
  assert.throws(() => generateSeedLane({ ...valid, schema: 4 }, 10), /Unsupported/);
});

test('all schemas preserve generation order independence and discarded streamed rows', () => {
  for (const schema of [1, 2, 3]) for (const seed of seeds) {
    const original = new Game(createRunSeed(seed, 'shuffle', 'stroll', true, schema));
    const expected = new Map(rows.map(row => [row, generateSeedLane(original.runSeed, row)]));
    for (const row of [...rows].reverse()) assert.deepEqual(generateSeedLane(original.runSeed, row), expected.get(row));
    const streamed = new Map();
    for (const score of [96, 128, 320, 1000, 10_000]) {
      original.maxY = score; original.ensureRows();
      for (const [row, lane] of original.rows) streamed.set(row, lane);
    }
    for (const score of [128, 1000, 320, 96, 10_000]) {
      // Changing generation window simulates an out-of-order loader, without input/timing changes.
      const replay = Game.fromSeed(original.seedCode);
      replay.rows.clear(); replay.maxY = score; replay.ensureRows();
      for (const [row, lane] of replay.rows) assert.deepEqual(lane, streamed.get(row));
      assert.equal(replay.rows.size, 39);
    }
  }
});

test('all schemas retain captured settings and published content through preference and live-catalog edits', () => {
  for (const schema of [1, 2, 3]) {
    const settings = { schema, seed: 789, home: 'orchard', mode: 'stroll', gentle: true };
    const game = new Game(settings);
    const code = game.seedCode;
    const expected = rows.map(row => generateSeedLane(game.runSeed, row));
    settings.schema = schema === 1 ? 2 : 1; settings.seed = 20; settings.home = 'frost'; settings.mode = 'arcade'; settings.gentle = false;
    assert.equal(game.seedCode, code);
    const original = [...WORLDS], pond = WORLDS[0], oldPatterns = pond.patterns, oldVehicles = pond.vehicles;
    try {
      WORLDS.reverse();
      WORLDS.push({ ...pond, id: 'future-world', patterns: [['rail']] });
      pond.patterns = [['road']]; pond.vehicles = [];
      const replay = Game.fromSeed(code);
      assert.equal(replay.home, 'orchard'); assert.equal(replay.mode, 'stroll'); assert.equal(replay.gentle, true);
      rows.forEach((row, index) => assert.deepEqual(generateSeedLane(replay.runSeed, row), expected[index]));
      game.seed = 10; game.home = 'frost'; game.gentle = false;
      game.rows.clear(); game.maxY = 10; game.ensureRows();
      for (const [row, lane] of game.rows) assert.deepEqual(lane, generateSeedLane(replay.runSeed, row));
    } finally {
      pond.patterns = oldPatterns; pond.vehicles = oldVehicles;
      WORLDS.splice(0, WORLDS.length, ...original);
    }
  }
});

test('custom extension worlds stay playable without a misleading replay code', () => {
  const custom = { ...WORLDS[0], id: 'test-world', patterns: [['road', 'river', 'meadow']] };
  WORLDS.push(custom);
  try {
    const game = new Game(1, custom.id);
    assert.equal(game.lane.world, custom);
    assert.equal(game.runSeed, null); assert.equal(game.seedCode, null);
    assert.throws(() => createRunSeed(1, custom.id));
  } finally { WORLDS.pop(); }
});

test('replays retain the supplied item catalog and deterministic market offers', () => {
  for (const schema of [1, 2, 3]) for (const mode of ['arcade', 'stroll']) {
    const original = new Game(createRunSeed(321, 'frost', mode, false, schema), undefined, undefined, undefined, ITEM_CATALOG);
    const replay = Game.fromSeed(original.seedCode, ITEM_CATALOG);
    assert.deepEqual([...replay.run.catalog.keys()], [...original.run.catalog.keys()]);
    assert.ok(replay.run.catalog.size > 0);
    for (const score of [100, 200, 300]) {
      original.run.advanceScore(score); replay.run.advanceScore(score);
      assert.deepEqual(replay.run.market, original.run.market);
    }
  }
});
