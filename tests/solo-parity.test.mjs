import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { PINNED_BASELINE_SHA, extractPinnedBaseline } from './solo-baseline.mjs';
import { runDifferentialMatrix, runDifferentialScenario } from './solo-parity-snapshot.mjs';

const STEP = 1 / 120;
const execFile = promisify(execFileCallback);

function arcadeTracer() {
  return [
    { kind: 'move', direction: 'forward' },
    { kind: 'step', count: 18 },
    { kind: 'move', direction: 'left' },
    { kind: 'step', count: 18 },
    { kind: 'move', direction: 'back' },
    { kind: 'step', count: 18 },
    { kind: 'move', direction: 'right' },
    { kind: 'step', count: 18 },
  ];
}

test('provenance: extracts the exact immutable a310a81 baseline', async () => {
  await using baseline = await extractPinnedBaseline();
  assert.equal(baseline.sha, PINNED_BASELINE_SHA);
  assert.match(baseline.sourceDirectory, /src$/);
});

test('provenance: missing pinned history fails closed with the SHA and shallow-history remedy', async () => {
  const repository = await mkdtemp(join(tmpdir(), 'down-to-duck-empty-history-'));
  try {
    await execFile('git', ['init', '--quiet'], { cwd: repository });
    await assert.rejects(() => extractPinnedBaseline(repository), error =>
      error.message.includes(PINNED_BASELINE_SHA) && error.message.includes('git fetch --unshallow'));
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});

test('Arcade tracer: compares independent pinned and working engines at every command and fixed step', async () => {
  const result = await runDifferentialScenario({
    name: 'Arcade tracer',
    seed: 0x10203040,
    mode: 'arcade',
    tape: arcadeTracer(),
    fixedStep: STEP,
  });
  assert.equal(result.points > 0, true);
  assert.equal(result.baselineSha, PINNED_BASELINE_SHA);
});

test('intentional drift: one-sided callback perturbation fails through the ordinary trace comparator', async () => {
  await assert.rejects(
    () => runDifferentialScenario({
      name: 'Arcade intentional callback drift',
      seed: 0x10203040,
      mode: 'arcade',
      tape: arcadeTracer(),
      fixedStep: STEP,
      perturbCurrent: { command: 0, step: 0, callback: 'onCoin', amount: 987 },
    }),
    error => /Arcade intentional callback drift.*command 0.*step 0.*callbacks\[0\]/s.test(error.message),
  );
});

test('seeded movement and timing matrix: all released identities reach accepted, rejected, side, and back production moves', async () => {
  const homes = ['pond', 'orchard', 'neon', 'dunes', 'frost', 'bloom', 'shuffle'];
  const travelers = ['butter', 'sunny', 'pip', 'petal', 'beep', 'rust', 'pebble'];
  const scenarios = [];
  for (const schema of [1, 2, 3]) for (const home of homes) for (const mode of ['arcade', 'stroll']) {
    for (const gentle of [false, true]) for (const seed of [0, 0xffffffff]) for (const characterId of travelers) {
      scenarios.push({
        name: `matrix schema${schema}/${home}/${mode}/${gentle ? 'gentle' : 'standard'}/${seed}/${characterId}`,
        seed: { schema, seed, home, mode, gentle }, characterId,
        tape: [{ kind: 'move', direction: 'forward' }, { kind: 'move', direction: 'forward' },
          { kind: 'step', count: 18 }, { kind: 'move', direction: 'left' }, { kind: 'step', count: 18 },
          { kind: 'move', direction: 'back' }, { kind: 'step', count: 18 }, { kind: 'move', direction: 'right' }],
      });
    }
  }
  const results = await runDifferentialMatrix(scenarios);
  assert.equal(results.length, 1176, 'the pinned matrix must retain every schema/home/mode/gentle/uint32/traveler combination');
  assert.equal(results.every(result => result.points === 60), true, 'every operation and 1/120 step is compared');
  assert.equal(results.every(result => result.results.some(point => point.result === true)), true, 'real accepted moves execute');
  assert.equal(results.every(result => result.results.some(point => point.result === false)), true, 'real rejected moves execute while hopping');
  assert.equal(results.some(result => result.final.game.mode === 'stroll' && result.final.game.time > 0), true, 'stored stroll mode advances world time through the real runner');
});

function hazardFixture(game, gameModule, kind) {
  const lane = { ...gameModule.generateLane(game.seed, 0, game.home, game.gentle), index: 0, kind,
    phase: 0, speed: kind === 'river' ? .5 : 0, spacing: 20, length: kind === 'river' ? 5 : 1.15,
    blocked: [], decorations: [], coin: null };
  game.rows.set(0, lane);
  game.state = 'playing';
  game.x = game.fromX = kind === 'road' ? .975 : 0;
  game.y = game.fromY = 0;
}

function setLane(game, row, kind = 'meadow', extra = {}) {
  game.rows.set(row, { ...game.rows.get(row), index: row, kind, blocked: [], decorations: [], coin: null,
    phase: 0, speed: 1, spacing: 20, length: 1.15, variant: 0, ...extra });
}

function impactFixture(face, direction) {
  return game => {
    game.state = 'playing';
    setLane(game, 0, 'road', { speed: direction });
    if (face === 'side') { game.y = game.fromY = -1; return; }
    game.x = game.fromX = (1.15 / 2 + .4) * direction * (face === 'rear' ? -1 : 1);
  };
}

function fatalFixture(cause) {
  return game => {
    game.state = 'playing';
    if (cause === 'train') setLane(game, 0, 'rail', { period: 9, warning: 1.5, phase: 2.375, length: 13 });
    if (cause === 'water') setLane(game, 0, 'river', { phase: 5, length: 1 });
    if (cause === 'wave') game.waveRow = 0;
    // These fixtures only place world state; the following paired update is
    // what detects every fatal cause through production collision/water logic.
    if (cause === 'swept') { game.x = game.fromX = 5.51; setLane(game, 0, 'river', { speed: 1, phase: 5.51, length: 3.5 }); }
    if (cause === 'trail') game.maxY = 8;
    if (cause === 'mob') game.mobs.push({ id: 1, kind: 'slime', x: 0, y: 0, fromX: 0, fromY: 0,
      targetX: 0, targetY: 0, phase: 'rest', phaseLeft: 1, phaseDuration: 1 });
  };
}

test('production collision faces, latches, and fatal hazards reach their named state transitions', async () => {
  const impactCases = [];
  for (const direction of [-1, 1]) for (const face of ['rear', 'side', 'front']) {
    impactCases.push({ name: `vehicle ${direction}/${face}`, seed: 67, keepTrace: true, setup: impactFixture(face, direction),
      tape: [{ kind: 'move', direction: face === 'side' ? 'forward' : ((face === 'rear' ? direction : -direction) > 0 ? 'right' : 'left') }, { kind: 'step', count: 18 }] });
  }
  const fatalCauses = ['train', 'water', 'wave', 'swept', 'trail', 'mob'];
  const results = await runDifferentialMatrix([
    ...impactCases,
    ...fatalCauses.map(cause => ({ name: `${cause} remains fatal during recovery`, seed: 71, mode: cause === 'trail' ? 'stroll' : undefined, characterId: ['water', 'swept'].includes(cause) ? 'sunny' : undefined,
      setup: game => { fatalFixture(cause)(game); game.hurtRemaining = .9; }, tape: [{ kind: 'step', count: 1 }] })),
    { name: 'stationary contact latch suppresses repeat harm', seed: 73, keepTrace: true, setup: game => {
      game.state = 'playing'; game.x = game.fromX = .1; setLane(game, 0, 'road', { speed: .1, phase: -.1 });
      setLane(game, -1); setLane(game, 1);
    }, tape: [{ kind: 'step', count: 144 }] },
  ]);
  for (let index = 0; index < impactCases.length; index += 1) {
    const face = impactCases[index].name.split('/').at(-1);
    const result = results[index], hurt = result.final.callbacks.filter(event => event.name === 'onHurt');
    if (face === 'front') assert.equal(result.final.game.deathCause, 'traffic', result.final.game.mode);
    else assert.deepEqual(hurt.map(event => event.payload.face), [face], `real ${face} contact records one ordered hurt callback`);
  }
  for (let index = 0; index < fatalCauses.length; index += 1) assert.equal(results[impactCases.length + index].final.game.deathCause, fatalCauses[index]);
  const latch = results.at(-1);
  assert.equal(latch.final.callbacks.filter(event => event.name === 'onHurt').length, 1, 'one retained car contact cannot drain health repeatedly');
  assert.equal(latch.trace.some(point => point.game.gameFuture.touchingCars.length > 0), true, 'the latch changes through actual collision detection');
});

test('Stroll trail boundary keeps seven trailing rows safe and kills only beyond them', async () => {
  const distances = [6, 7, 8];
  const results = await runDifferentialMatrix(distances.map(distance => ({
    name: `Stroll trail cutoff at ${distance} rows behind`,
    seed: 71,
    mode: 'stroll',
    setup: game => {
      game.state = 'playing';
      game.maxY = 20;
      game.y = game.fromY = 20 - distance;
      game.ensureRows();
      setLane(game, game.y);
    },
    tape: [{ kind: 'step', count: 1 }],
  })));
  for (let index = 0; index < distances.length; index += 1) {
    const beyond = distances[index] > 7;
    assert.equal(results[index].final.game.state, beyond ? 'dead' : 'playing');
    assert.equal(results[index].final.game.deathCause, beyond ? 'trail' : null);
    assert.equal(results[index].final.callbacks.filter(event => event.name === 'onEnd').length, beyond ? 1 : 0);
  }
});

function forwardTape(count) {
  return Array.from({ length: count }, () => [
    { kind: 'fixture', apply: game => setLane(game, Math.round(game.y) + 1) },
    { kind: 'move', direction: 'forward' }, { kind: 'step', count: 18 },
  ]).flat();
}

test('recovery, regeneration, shield, landing grace, and 100-row power cooldown retain real ordering', async () => {
  const shield = { id: 'fixture-shield', name: 'Fixture shield', description: 'test only', rarity: 'common', price: 1,
    icon: 'shield', color: '#fff', kind: 'power', duration: 1, modify: modifiers => { modifiers.shield += 1; } };
  const recovery = await runDifferentialScenario({ name: 'hurt recovery pause and resume', seed: 79, keepTrace: true,
    setup: impactFixture('rear', 1), tape: [{ kind: 'move', direction: 'right' }, { kind: 'step', count: 18 },
      { kind: 'call', method: 'pause' }, { kind: 'step', count: 24 }, { kind: 'call', method: 'resume' }, { kind: 'step', count: 24 }] });
  assert.equal(recovery.trace[20].game.hurtRemaining, recovery.trace[44].game.hurtRemaining, 'pause freezes real hurt recovery');
  assert.ok(recovery.final.game.hurtRemaining < recovery.trace[44].game.hurtRemaining, 'resume advances real hurt recovery');

  const regeneration = await runDifferentialScenario({ name: '100-row regeneration milestone', seed: 83, mode: 'stroll',
    setup: game => { game.state = 'playing'; game.health = 1; }, tape: forwardTape(100) });
  assert.equal(regeneration.final.game.maxY, 100);
  assert.equal(regeneration.final.game.health, 1.5, 'real forward progress heals exactly one half at 100 rows');
  assert.deepEqual(regeneration.final.callbacks.filter(event => event.name === 'onHeal').map(event => event.payload.amount), [.5]);
  assert.equal(regeneration.final.game.gameFuture.healedMilestone, 1, 'private milestone index advances at the 100-row boundary');

  const shielded = await runDifferentialScenario({ name: 'market shield blocks active traffic danger', seed: 89, definitions: [shield],
    setup: game => { game.state = 'playing'; setLane(game, 0, 'road', { speed: 0 }); game.run.advanceScore(100); game.openMarket();
      game.run.creditCoins(1); game.run.market.offers.push({ id: 'shield-offer', itemId: shield.id, price: 1, sold: false }); },
    tape: [{ kind: 'call', target: 'run', method: 'buy', args: ['shield-offer'] }, { kind: 'call', method: 'closeMarket' }, { kind: 'step', count: 1 }] });
  assert.equal(shielded.final.game.state, 'playing', 'the purchased shield prevents the active traffic end path');
  assert.equal(shielded.final.callbacks.some(event => event.name === 'onEnd'), false);

  const grace = await runDifferentialScenario({ name: 'Pip landing grace defers then expires against an overlapping mob', seed: 97, characterId: 'pip', keepTrace: true,
    setup: game => { fatalFixture('mob')(game); }, tape: [{ kind: 'step', count: 1 }, { kind: 'step', count: 60 },
      { kind: 'fixture', apply: game => game.mobs.splice(0, game.mobs.length, { id: 5, kind: 'slime', x: game.x, y: game.y,
        fromX: game.x, fromY: game.y, targetX: game.x, targetY: game.y, phase: 'rest', phaseLeft: 1, phaseDuration: 1 }) },
      { kind: 'step', count: 1 }, { kind: 'step', count: 60 }] });
  assert.equal(grace.trace[63].game.state, 'playing', 'landing grace protects the first overlapping mob frame');
  assert.equal(grace.final.game.deathCause, 'mob', 'grace expires without a new power cooldown');

  const cooldown = await runDifferentialScenario({ name: 'Sunny 100-row innate power cooldown boundary', seed: 101, mode: 'stroll', characterId: 'sunny',
    setup: game => { game.state = 'playing'; game.x = game.fromX = .975; setLane(game, 0, 'road', { speed: 0 }); },
    tape: [{ kind: 'move', direction: 'left' }, { kind: 'step', count: 60 }, ...forwardTape(100)] });
  assert.equal(cooldown.final.game.maxY >= 100, true);
  assert.equal(cooldown.final.game.powerReady, true, 'the exact 100-row boundary recharges the innate power');
  assert.equal(cooldown.final.game.gameFuture.powerReadyAt, 100);
});

function retainedPullFixture(game) {
  const lane = game.rows.get(0);
  lane.coin = .55;
  lane.coinActor = undefined;
  game.state = 'playing';
}

test('focused movement, hazard, health, and time arenas execute production paths at every fixed step', async () => {
  const scenarios = [
    { name: 'traffic contact latch arena', seed: 19, setup: (game, module) => hazardFixture(game, module, 'road'),
      tape: [{ kind: 'move', direction: 'left' }, { kind: 'step', count: 24 }] },
    { name: 'river drift and safe landing arena', seed: 23, setup: (game, module) => hazardFixture(game, module, 'river'),
      tape: [{ kind: 'step', count: 24 }] },
    { name: 'stroll real versus world timing arena', seed: 29, mode: 'stroll',
      tape: [{ kind: 'move', direction: 'forward' }, { kind: 'step', count: 24 }] },
    { name: 'retained coin pull survives source-lane pruning arena', seed: 30, setup: retainedPullFixture,
      tape: [{ kind: 'step', count: 1 }, ...Array.from({ length: 11 }, () => [
        { kind: 'move', direction: 'forward' }, { kind: 'step', count: 18 },
      ]).flat()] },
    ...[
      ['butter', 'water'], ['sunny', 'traffic'], ['pip', 'mob'], ['petal', 'traffic'],
      ['beep', 'train'], ['rust', 'mob'], ['pebble', 'wave'],
    ].map(([characterId, cause]) => ({ name: `${characterId} innate power arena`, seed: 31, characterId,
      setup: game => { game.state = 'playing'; }, tape: [{ kind: 'call', method: 'end', args: ['planned danger', cause, characterId === 'petal' ? 'rear' : undefined] }, { kind: 'step', count: 12 }] })),
  ];
  const results = await runDifferentialMatrix(scenarios);
  assert.equal(results.every(result => result.points > 1), true, 'focused fixtures execute and compare bounded real fixed steps');
  assert.equal(Array.isArray(results[0].final.game.gameFuture.touchingCars), true, 'collision latch is included in the full private snapshot');
  assert.equal(results[1].final.game.state, 'playing', 'the river fixture rides a real platform before drift');
  let expectedStrollTime = 0;
  for (let tick = 0; tick < 24; tick += 1) expectedStrollTime += STEP * .58;
  assert.equal(results[2].final.game.time, expectedStrollTime, 'stroll world time retains the exact .58 scale and arithmetic grouping');
  assert.equal(results[3].final.game.rows.some(({ row }) => row === 0), false, 'source terrain prunes through normal forward movement');
  assert.equal(results[3].final.game.attractedCoins.some(({ row }) => row === 0), true, 'the retained pull remains fully compared after pruning');
  assert.equal(results.slice(4).every(result => result.final.callbacks.some(event => event.name === 'onPower')), true, 'every released innate power is driven through Game.end production logic');
});

function attractionFixture(game, module, { denomination = 'coin', magnet = false, river = false } = {}) {
  game.state = 'playing';
  if (river) setLane(game, 0, 'river', { speed: .5, length: 5, phase: 0 });
  const reward = game.rows.get(1);
  Object.assign(reward, { kind: 'meadow', blocked: [], decorations: [], speed: 0, phase: 0, spacing: 20, length: 4,
    coin: 0, coinActor: undefined, coinDenomination: denomination });
  if (!magnet) return;
  const item = game.run.catalog.get('magnet');
  assert.ok(item, 'the independently loaded catalog supplies the real gravity card');
  game.run.advanceScore(100);
  assert.equal(game.openMarket(), true);
  const offer = { id: `fixture-magnet-${game.run.revision}`, itemId: item.id, price: item.price, sold: false };
  game.run.market.offers.push(offer);
  game.run.creditCoins(item.price);
  assert.equal(game.run.buy(offer.id).ok, true);
  game.closeMarket();
}

test('denominations, base/card gravity, and safe river landing use paired production pickup traces', async () => {
  const denominations = [['coin', 1], ['bar', 2], ['small-sack', 5], ['big-sack', 10], ['huge-sack', 25]];
  const scenarios = [
    { name: 'base gravity stays bounded outside a one-row pickup', seed: 107,
      setup: game => attractionFixture(game, null, { magnet: false }), tape: [{ kind: 'step', count: 24 }] },
    { name: 'magnet gravity safely pulls a bank pickup after river landing', seed: 109, catalogIds: ['magnet'],
      setup: game => attractionFixture(game, null, { magnet: true, river: true }),
      tape: [{ kind: 'move', direction: 'forward' }, { kind: 'step', count: 18 }, { kind: 'step', count: 240 }] },
    ...denominations.map(([denomination]) => ({ name: `magnet exact-once ${denomination} denomination`, seed: 113,
      catalogIds: ['magnet'], setup: game => attractionFixture(game, null, { magnet: true, denomination }),
      tape: [{ kind: 'step', count: 240 }] })),
  ];
  const results = await runDifferentialMatrix(scenarios);
  const [base, river, ...paid] = results;
  assert.equal(base.final.game.coins, 0, 'the base .1 pull never reaches the row-one pickup');
  assert.equal(base.final.game.rows.find(({ row }) => row === 1).lane.coin, 0, 'base gravity retains the uncollected coin');
  assert.equal(river.final.game.state, 'playing', 'the real river platform carries the duck safely onto the bank');
  assert.equal(river.final.game.coins, 1, 'the bought gravity card pulls the bank reward only after safe landing');
  for (let index = 0; index < paid.length; index += 1) {
    const [denomination, value] = denominations[index];
    const events = paid[index].final.callbacks.filter(event => event.name === 'onCoin');
    assert.equal(paid[index].final.game.coins, value, `${denomination} pays its production denomination value`);
    assert.deepEqual(events.map(event => event.payload.amount), [value], `${denomination} pays once through the ordered callback`);
    assert.equal(paid[index].final.game.inventory.visible.wallet, value, `${denomination} credits the exact pickup value after the fixture card purchase`);
  }
});

test('extreme generation and every seed schema round-trip through independent archived engines', async () => {
  const scenarios = [1, 2, 3].map(schema => ({
    name: `schema ${schema} extreme-distance generated-row and replay roundtrip`,
    seed: { schema, seed: 0xffffffff, home: 'shuffle', mode: 'stroll', gentle: true },
    setup: game => {
      game.state = 'playing';
      game.maxY = game.y = game.fromY = 1000000;
      game.ensureRows();
    },
    tape: [{ kind: 'roundtrip' }, { kind: 'step', count: 24 }],
  }));
  const results = await runDifferentialMatrix(scenarios);
  for (const result of results) {
    assert.equal(result.final.game.rows.length, 39, 'extreme generation retains the bounded production row window');
    assert.equal(result.final.game.rows[0].row, 999990, 'generation prunes exactly behind the extreme active row');
    assert.equal(result.final.game.rows.at(-1).row, 1000028, 'generation retains exactly the look-ahead boundary');
    assert.equal(result.results[1].result.seedCode, result.final.game.seedCode, 'Game.fromSeed preserves the encoded schema identity');
  }
});

function progressionFixture(row, time = 45) {
  return game => {
    game.state = 'playing';
    game.maxY = game.y = game.fromY = row;
    game.time = time;
    game.ensureRows();
  };
}

test('economy, actor, mob, retention, and terminal arenas keep hidden future state and callbacks exact', async () => {
  const scenarios = [
    { name: 'market invitation freeze and resume', seed: 41, setup: game => { game.state = 'playing'; }, tape: [
      { kind: 'call', target: 'run', method: 'advanceScore', args: [100] },
      { kind: 'call', method: 'openMarket' }, { kind: 'step', count: 12 },
      { kind: 'call', method: 'closeMarket' }, { kind: 'step', count: 12 },
    ] },
    ...[50, 100, 150, 400].map(row => ({ name: `actor progression row ${row}`, seed: 43 + row,
      setup: progressionFixture(row), tape: [{ kind: 'step', count: 12 }] })),
    ...[160, 320, 480].map(row => ({ name: `mob progression row ${row}`, seed: 47 + row,
      setup: progressionFixture(row), tape: [{ kind: 'step', count: 24 }] })),
    { name: 'terminal spill callback and dead visual clock', seed: 59, setup: game => { game.state = 'playing'; game.run.creditCoins(9); }, tape: [
      { kind: 'call', method: 'end', args: ['terminal ordering', 'traffic', 'front'] },
      { kind: 'step', count: 12 }, { kind: 'call', method: 'advanceDeathVisuals', args: [.25] },
    ] },
  ];
  const results = await runDifferentialMatrix(scenarios);
  const [market, ...rest] = results;
  const terminal = rest.at(-1);
  assert.equal(market.final.game.inventory.future.maxScore, 100, 'real RunInventory score advancement is included in the private adapter');
  assert.equal(market.final.game.inventory.visible.isOpen, false, 'the real market close resumes the paired run');
  assert.equal(rest.slice(0, 7).every(result => result.final.game.rows.length > 0), true, 'actor and mob progression fixtures generate real retained rows');
  assert.equal(rest.slice(4, 7).some(result => result.final.game.mobs.actors.length > 0), true, 'MobDirector reaches deterministic production spawn pacing');
  const onEnd = terminal.final.callbacks.find(event => event.name === 'onEnd');
  assert.deepEqual(onEnd.payload.inventoryCleared, { wallet: 0, cards: [], powers: [], cosmetics: [] }, 'terminal observers see already-cleared inventory');
  assert.equal(terminal.final.game.deathSpill.wallet, 9, 'spill capture precedes RunInventory.clear');
  assert.equal(terminal.final.game.time, 0, 'dead-game visual advancement never advances gameplay time');
});
