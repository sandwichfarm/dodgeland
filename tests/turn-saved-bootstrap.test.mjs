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
const { Game, parseProgress } = await sources.import('game');
const { Game: BaselineGame, parseProgress: baselineProgress } = await baseline.import('game');
const { ITEM_CATALOG: BASELINE_CATALOG } = await baseline.import('market/catalog');
const { createRelaySession, RelayCoordinator } = await sources.import('relay');
const { createRaceSession, RaceCoordinator } = await sources.import('race');
const { ITEM_CATALOG } = await sources.import('market/catalog');
const authority = { Game, ...await sources.import('session'), ...await sources.import('mode-rules') };
assert.notEqual(Game, BaselineGame); assert.notEqual(sources.directory, baseline.directory);
const config = process.env.DOWN_TO_DUCK_COVERAGE_CONFIG
  ? JSON.parse(await readFile(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG, 'utf8')) : null;
if (config && !config.modelAttribution) throw Error('Missing saved-bootstrap attribution');
const inventory = config ? JSON.parse(await readFile(config.inventoryPath, 'utf8')) : null;
const records = [];
after(async () => {
  if (!inventory) return;
  assert.equal(records.length, 24);
  await writeFile(config.modelAttribution.output, JSON.stringify({
    ...records.at(-1), intervals: records.flatMap(record => record.intervals),
  }));
});
const savedCases = [
  { name: 'missing save', raw: null },
  { name: 'broken JSON', raw: '{' },
  { name: 'JSON null', raw: 'null' },
  { name: 'invalid counters and preferences', data: { mode: 'invalid', world: 'unregistered',
    selected: 'unknown-traveler', best: -1, strollBest: 1.5, coins: '1000', runs: Number.MAX_SAFE_INTEGER + 1,
    reduced: 'false', muted: 1, musicVolume: '0.4', ambienceVolume: null, effectsVolume: {}, soundPack: 3, soundAddress: {} } },
  { name: 'implicit old Pip and clamped volumes', data: { travelerVersion: 1, selected: 'pip', world: 'shuffle',
    best: 1000, coins: 1000, runs: 7, reduced: true, muted: false,
    musicVolume: -2, ambienceVolume: .4, effectsVolume: 3, soundPack: 'custom', soundAddress: '  ' } },
  { name: 'explicit modern Pip with valid custom audio', data: { travelerVersion: 2, selected: 'pip', world: 'pond',
    best: 1000, coins: 1000, soundPack: 'custom', soundAddress: '30030:' + 'a'.repeat(64) + ':pond' } },
  { name: 'Flow unknown content and invalid counters', data: { mode: 'stroll', world: 'missing', selected: 'missing',
    best: -1, strollBest: 'bad', coins: 1.5, runs: -3, soundPack: 'unknown' } },
  { name: 'Flow legacy Pip and custom audio', data: { mode: 'stroll', selected: 'pip', world: 'orchard',
    best: 1000, strollBest: 1000, coins: 1000, musicVolume: .1, ambienceVolume: .2, effectsVolume: .3,
    soundPack: 'custom', soundAddress: '30030:' + 'b'.repeat(64) + ':field' } },
  { name: 'Flow modern unlocked traveler and zero volumes', data: { mode: 'stroll', travelerVersion: 2, selected: 'petal',
    world: 'shuffle', best: 1000, strollBest: 999, coins: 1000, runs: 10,
    musicVolume: 0, ambienceVolume: 0, effectsVolume: 0 } },
  { name: 'Flow accessibility and arcade pack', data: { mode: 'stroll', travelerVersion: 2, selected: 'butter',
    world: 'frost', reduced: true, muted: true, soundPack: 'arcade', soundAddress: '' } },
  { name: 'Flow oversized custom address', data: { mode: 'stroll', world: 'neon', soundPack: 'custom', soundAddress: 'x'.repeat(2001) } },
  { name: 'Flow non-string preferences', data: { mode: 'stroll', world: 123, selected: false,
    reduced: 0, muted: 'false', musicVolume: {}, ambienceVolume: [], effectsVolume: '1', soundPack: null, soundAddress: false } },
];
for (const mode of ['relay', 'race']) for (const savedCase of savedCases)
test(`${mode}: ${savedCase.name} retains pinned bootstrap validation before actual play`, () => {
  const raw = Object.hasOwn(savedCase, 'raw') ? savedCase.raw : JSON.stringify(savedCase.data);
  const expectedProgress = baselineProgress(raw), base = expectedProgress.mode;
  const expected = new BaselineGame(113, expectedProgress.world, base, false, BASELINE_CATALOG, expectedProgress.selected);
  const factory = mode === 'relay' ? createRelaySession : createRaceSession;
  const Coordinator = mode === 'relay' ? RelayCoordinator : RaceCoordinator;
  const recorder = inventory ? createTurnModelRecorder({ mode, inventory, factory, Coordinator,
    authority, identity: { runId: config.runId, realmId: config.modelAttribution.realmId,
      jobId: config.jobId, artifactHash: config.browserBuilds.modules.artifactHash } }) : null;
  const create = () => {
    // Actual saved preferences feed actual Game construction. No unrelated
    // parser calls are added to a playing interval just to gain counters.
    const progress = parseProgress(raw);
    assert.deepEqual(progress, expectedProgress);
    const game = new Game(113, progress.world, progress.mode, false, ITEM_CATALOG, progress.selected);
    assert.deepEqual([...game.rows], [...expected.rows]);
    assert.equal(game.characterId, expected.characterId); assert.equal(game.home, expected.home);
    assert.equal(game.mode, expected.mode); assert.equal(game.seedCode, expected.seedCode);
    assert.deepEqual(game.runSeed, expected.runSeed); assert.equal(game.run.wallet, 0);
    assert.deepEqual(progress, expectedProgress, 'construction never mutates saved preferences');
    return game;
  };
  const proposal = { seats: [
    { seat: 'p1', device: 'keyboard-a', characterId: expected.characterId },
    { seat: 'p2', device: 'keyboard-b', characterId: expected.characterId === 'sunny' ? 'butter' : 'sunny' },
  ] };
  const acquired = recorder ? recorder.acquireFrom(create, base, proposal)
    : (() => { const game = create(); return { game, owner: factory(game, proposal) }; })();
  const { game, owner } = acquired, session = owner.session, [p, other] = session.players;
  const interval = (id, action) => recorder ? recorder.interval(id, action) : action();
  interval('normalized-preferences-own-real-play', () => {
    assert.equal(game.definition.id, base); assert.equal(p.characterId, expected.characterId);
    assert.notEqual(p.characterId, other.characterId); assert.equal(p.run.wallet, 0); assert.equal(other.run.wallet, 0);
    assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), true);
    for (let n = 0; n < 120 && p.hop > 0; n++) session.update(1 / 120);
    assert.equal(p.state, 'playing'); assert.equal(p.earnedDistance, 1); assert.equal(p.completedForwardTiles, 1);
    assert.equal(other.earnedDistance, 0); assert.equal(other.completedForwardTiles, 0);
  });
  interval('immutable-normalized-result', () => {
    if (mode === 'relay') owner.finish();
    else for (const player of session.players) {
      assert.equal(owner.command(owner.actionToken(player.seat), 'leave'), true);
      assert.equal(owner.command(owner.actionToken(player.seat), 'confirm'), true);
    }
    const result = owner.result, frozen = JSON.stringify(result);
    assert.ok(Object.isFrozen(result));
    assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), false);
    session.update(1 / 120); assert.strictEqual(owner.result, result);
    assert.equal(JSON.stringify(result), frozen);
  });
  if (recorder) records.push(recorder.finish());
});
