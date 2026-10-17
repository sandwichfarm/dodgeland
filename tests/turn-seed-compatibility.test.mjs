import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { loadSources } from './source-loader.mjs';
import { extractPinnedBaseline, PINNED_BASELINE_SHA } from './solo-baseline.mjs';
import { createTurnModelRecorder } from '../tools/release-coverage/turn-model-attribution.mjs';

const sources = await loadSources(['game', 'relay', 'race', 'market/catalog']);
const oracle = await extractPinnedBaseline(); assert.equal(oracle.sha, PINNED_BASELINE_SHA);
const baseline = await loadSources(['game', 'market/catalog'], oracle.sourceDirectory);
after(async () => { await sources.dispose(); await baseline.dispose(); await oracle.dispose(); });
const { Game } = await sources.import('game');
const { Game: BaselineGame } = await baseline.import('game');
const { ITEM_CATALOG: BASELINE_CATALOG } = await baseline.import('market/catalog');
const { createRelaySession, RelayCoordinator } = await sources.import('relay');
const { createRaceSession, RaceCoordinator } = await sources.import('race');
const { ITEM_CATALOG } = await sources.import('market/catalog');
const authority = { Game, ...await sources.import('session'), ...await sources.import('mode-rules') };
assert.notEqual(Game, BaselineGame); assert.notEqual(sources.directory, baseline.directory);
const config = process.env.DOWN_TO_DUCK_COVERAGE_CONFIG
  ? JSON.parse(await readFile(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG, 'utf8')) : null;
if (config && !config.modelAttribution) throw Error('Missing seeded turn-mode attribution');
const inventory = config ? JSON.parse(await readFile(config.inventoryPath, 'utf8')) : null;
const records = [];
after(async () => {
  if (!inventory) return;
  assert.equal(records.length, 24);
  await writeFile(config.modelAttribution.output, JSON.stringify({
    ...records.at(-1), intervals: records.flatMap(record => record.intervals),
  }));
});
const seats = [
  { seat: 'p1', device: 'keyboard-a', characterId: 'butter' },
  { seat: 'p2', device: 'keyboard-b', characterId: 'sunny' },
];
const badCodes = [null, 3, '', 'x'.repeat(65), 'ph4-00000071-pond-a-n',
  'ph0-00000071-pond-a-n', 'ph3-nohex000-pond-a-n', 'ph3-00000071-unknown-a-n',
  'ph3-00000071-pond-x-n', 'ph3-00000071-pond-a-x',
  'ph3-00000071-pond-a-n\n', ' ph3-00000071-pond-a-n'];
for (const mode of ['relay', 'race']) for (const base of ['arcade', 'stroll'])
for (const schema of [1, 2, 3]) for (const gentle of [false, true])
test(`${mode}/${base}: schema${schema} ${gentle ? 'gentle shuffle max-seed' : 'pond zero-seed'} keeps the pinned course identity`, () => {
  const code = `ph${schema}-${gentle ? 'ffffffff-shuffle' : '00000000-pond'}-${base === 'arcade' ? 'a' : 's'}-${gentle ? 'g' : 'n'}`;
  // Independent immutable source is an oracle,never current coverage. It
  // supplies the exact expected generated course before session acquisition.
  const expected = BaselineGame.fromSeed(code, BASELINE_CATALOG, 'butter');
  const factory = mode === 'relay' ? createRelaySession : createRaceSession;
  const Coordinator = mode === 'relay' ? RelayCoordinator : RaceCoordinator;
  const recorder = inventory ? createTurnModelRecorder({ mode, inventory, factory, Coordinator,
    authority, identity: { runId: config.runId, realmId: config.modelAttribution.realmId,
      jobId: config.jobId, artifactHash: config.browserBuilds.modules.artifactHash } }) : null;
  let originalRows;
  const create = () => {
    // Real public Game construction rejects imported codes before an owner
    // exists. This is a component setup-and-correction journey,not direct
    // decoder/helper execution or a claim of public seed-entry UI coverage.
    if (base === 'arcade' && schema === 1 && !gentle)
      for (const invalid of badCodes) assert.throws(() => Game.fromSeed(invalid, ITEM_CATALOG, 'butter'));
    const game = Game.fromSeed(code, ITEM_CATALOG, 'butter'); originalRows = game.rows;
    assert.deepEqual([...game.rows], [...expected.rows]);
    assert.deepEqual(game.runSeed, expected.runSeed); assert.equal(game.seedCode, expected.seedCode);
    assert.equal(game.seed, expected.seed); assert.equal(game.home, expected.home);
    assert.equal(game.mode, expected.mode); assert.equal(game.gentle, expected.gentle);
    assert.equal(game.run.wallet, 0); assert.equal(game.time, 0);
    return game;
  };
  const acquired = recorder ? recorder.acquireFrom(create, base, { seats })
    : (() => { const game = create(); return { game, owner: factory(game, { seats }) }; })();
  const { game, owner } = acquired, session = owner.session, [p, other] = session.players;
  const interval = (id, action) => recorder ? recorder.interval(id, action) : action();
  interval('same-course-first-settled-hop', () => {
    assert.strictEqual(session.world, game.world); assert.strictEqual(session.world.rows, originalRows);
    assert.strictEqual(session.players[0], game.player);
    assert.equal(game.seedCode, code); assert.equal(game.runSeed.schema, schema);
    assert.equal(game.runSeed.gentle, gentle); assert.equal(game.definition.id, base);
    assert.ok(Object.isFrozen(game.runSeed));
    if (mode === 'race') {
      assert.deepEqual(owner.descriptor.runSeed, expected.runSeed);
      assert.equal(owner.descriptor.seedCode, code); assert.ok(Object.isFrozen(owner.descriptor.runSeed));
    }
    assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), true);
    for (let n = 0; n < 120 && p.hop > 0; n++) session.update(1 / 120);
    assert.equal(p.state, 'playing'); assert.equal(p.hop, 0);
    assert.equal(p.earnedDistance, 1); assert.equal(p.completedForwardTiles, 1);
    assert.equal(other.earnedDistance, 0); assert.equal(other.completedForwardTiles, 0);
    assert.equal(game.runSeed.schema, schema); assert.equal(game.seedCode, code);
  });
  interval('frozen-versioned-results', () => {
    if (mode === 'relay') owner.finish();
    else for (const player of session.players) {
      assert.equal(owner.command(owner.actionToken(player.seat), 'leave'), true);
      assert.equal(owner.command(owner.actionToken(player.seat), 'confirm'), true);
    }
    assert.ok(Object.isFrozen(owner.result)); assert.equal(mode === 'race' ? owner.result.descriptor.seedCode : owner.result.seedCode, code);
    const result = owner.result, before = JSON.stringify(result);
    assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), false);
    session.update(1 / 120); assert.strictEqual(owner.result, result);
    assert.equal(JSON.stringify(result), before); assert.equal(game.seedCode, code);
  });
  if (recorder) records.push(recorder.finish());
});
