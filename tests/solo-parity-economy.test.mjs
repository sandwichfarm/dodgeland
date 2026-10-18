import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';
import { runDifferentialMatrix } from './solo-parity-snapshot.mjs';

// Keep the catalog data real while using deterministic offer placement.  The
// market deliberately seeds only what it needs, so an empty definition list
// would make a parity pass meaningless.
const catalogSource = await loadSources('market/catalog');
const { ITEM_CATALOG } = await catalogSource.import('market/catalog');
after(() => catalogSource.dispose());

const item = id => {
  const definition = ITEM_CATALOG.find(candidate => candidate.id === id);
  assert.ok(definition, `released catalog contains ${id}`);
  return definition;
};
const definitions = ids => ids.map(item);
const STEP = 1 / 120;

function levelMarket(game, gameModule) {
  game.state = 'playing';
  game.x = game.fromX = 0;
  game.y = game.fromY = game.maxY = 99;
  game.hop = 0;
  game.waveRow = -100;
  game.ensureRows();
  for (const lane of game.rows.values()) {
    Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
    delete lane.actors;
    delete lane.coinActor;
  }
  assert.ok(game.rows.has(100), 'production row generation supplies the invitation landing row');
  assert.equal(typeof gameModule.laneActors, 'function');
}

function stageOffers(ids) {
  return game => {
    assert.ok(game.run.market, 'the score milestone opened a production invitation');
    const offers = ids.map((id, index) => {
      const definition = game.run.catalog.get(id);
      assert.ok(definition, `run catalog contains ${id}`);
      return {
        id: `parity-${game.run.market.milestone}-${index}-${id}`,
        itemId: id,
        price: definition.price,
        sold: false,
        section: definition.kind === 'card' ? 'cards' : definition.kind === 'cosmetic' ? 'extras' : 'rare',
      };
    });
    game.run.market.offers = offers;
    game.run.creditCoins(10_000);
  };
}

function appendOffer(id, offerId) {
  return game => {
    const definition = game.run.catalog.get(id);
    assert.ok(definition, `run catalog contains ${id}`);
    game.run.market.offers.push({ id: offerId, itemId: id, price: definition.price, sold: false, section: 'cards' });
  };
}

function levelMarketWithLiveLanes(game) {
  game.state = 'playing';
  game.x = game.fromX = 0;
  game.y = game.fromY = game.maxY = 99;
  game.hop = 0;
  game.waveRow = -100;
  game.ensureRows();
  const landing = game.rows.get(100);
  Object.assign(landing, { kind: 'meadow', blocked: [], decorations: [], coin: null });
  delete landing.actors;
  delete landing.coinActor;
  const road = [...game.rows.values()].find(lane => lane.kind === 'road' && lane.actors);
  const river = [...game.rows.values()].find(lane => lane.kind === 'river' && lane.actors);
  assert.ok(road, 'generated production rows include a traffic lane');
  assert.ok(river, 'generated production rows include a river lane');
  road.speed = 1.5;
  river.speed = -1.25;
}

const forward = { kind: 'move', direction: 'forward' };
const settle = { kind: 'step', count: 18 };
const open = { kind: 'call', method: 'openMarket' };
const close = { kind: 'call', method: 'closeMarket' };
const closeFrozen = { kind: 'call', method: 'closeMarket', args: [false] };

function outcome(scenario, command, step = 0) {
  const point = scenario.results.find(candidate => candidate.command === command && candidate.step === step);
  assert.ok(point, `${scenario.baselineSha}: command ${command} step ${step} was traced`);
  return point.result;
}

test('differential economy: invitation expiry freezes the world, preserves offers, and resumes clocks', async () => {
  const [scenario] = await runDifferentialMatrix([{
    name: 'economy invitation expiry, pause freeze, offer continuity, and resume',
    seed: 0x7fffffff,
    mode: 'stroll',
    definitions: definitions(['traffic-speed', 'power-freeze', 'field-pack', 'pack-pocket']),
    setup: levelMarket,
    fixedStep: STEP,
    keepTrace: true,
    tape: [
      forward, settle, open,
      { kind: 'fixture', apply: stageOffers(['traffic-speed', 'power-freeze', 'field-pack', 'pack-pocket']) },
      { kind: 'call', target: 'run', method: 'buy', args: ['parity-100-0-traffic-speed'] },
      closeFrozen,
      { kind: 'move', direction: 'forward' }, { kind: 'step', count: 24 },
      { kind: 'call', method: 'resume' },
      open,
      { kind: 'call', target: 'run', method: 'buy', args: ['parity-100-1-power-freeze'] },
      { kind: 'call', target: 'run', method: 'buy', args: ['parity-100-2-field-pack'] },
      close,
      { kind: 'step', count: 120 },
      forward, settle,
      { kind: 'step', count: 1_800 },
    ],
  }]);

  assert.equal(scenario.points, 1 + 12 + 1_980, 'each operation and fixed 1/120 step is traced');
  assert.equal(outcome(scenario, 0), true, 'the 100-point move is accepted');
  assert.equal(outcome(scenario, 2), true, 'invitation opens through Game.openMarket');
  assert.equal(outcome(scenario, 4).ok, true, 'structural card purchase succeeds');
  assert.equal(outcome(scenario, 6), false, 'market closure freezes movement');
  assert.equal(outcome(scenario, 9), true, 'reopening uses the still-active invitation');
  assert.equal(outcome(scenario, 10).ok, true, 'timed power purchase succeeds');
  assert.equal(outcome(scenario, 11).ok, true, 'structural field card purchase succeeds');
  assert.equal(outcome(scenario, 14), true, 'a later real move generates rows with the active structural effect');
  assert.equal(scenario.final.game.inventory.visible.market, null, 'real market timer eventually expires');
  assert.equal(scenario.final.game.inventory.visible.isOpen, false, 'expiry closes the transaction surface');
  assert.equal(scenario.final.game.state, 'playing', 'normal play resumes after market closure');
  assert.equal(scenario.final.game.inventory.future.maxScore, 101, 'only the post-resume move advances score');
  assert.ok(scenario.final.game.inventory.visible.effects.sceneryClear > 0, 'the purchased structural card remains active for production row generation');
  assert.equal(scenario.final.game.inventory.visible.powers.length, 0, 'timed power ticks and expires only after resume');
});

test('differential economy: reopening an active market keeps its original released offers', async () => {
  const [scenario] = await runDifferentialMatrix([{
    name: 'economy market offer continuity across a pause and reopen',
    seed: 31,
    // The runner resolves this list separately from the archived and working
    // catalog modules, so catalog drift cannot be hidden by shared objects.
    catalogIds: ITEM_CATALOG.map(definition => definition.id),
    setup: levelMarket,
    fixedStep: STEP,
    keepTrace: true,
    tape: [
      forward, settle, open,
      { kind: 'fixture', apply: stageOffers(['magnet', 'traffic-speed', 'river-speed']) },
      closeFrozen, { kind: 'call', method: 'resume' }, open,
    ],
  }]);
  assert.equal(outcome(scenario, 2), true, 'opened invitation enters the production market');
  assert.equal(outcome(scenario, 6), true, 'paused invitation reopens');
  assert.deepEqual(scenario.final.game.inventory.visible.market.offers.map(offer => offer.id), [
    'parity-100-0-magnet', 'parity-100-1-traffic-speed', 'parity-100-2-river-speed',
  ], 'the original offer ids and order survive closing and reopening');
  assert.ok(scenario.final.game.inventory.visible.market.offers.every(offer => !offer.sold), 'reopening does not consume or reroll an offer');
});

test('differential economy: full hands require a sale, packs retain choices, and skip leaves payment intact', async () => {
  const [replace, skip] = await runDifferentialMatrix([
    {
      name: 'economy full hand card replacement and paid pack selection',
      seed: 0x80000000,
      definitions: definitions(['magnet', 'traffic-speed', 'river-speed', 'pack-pocket']),
      setup: levelMarket,
      fixedStep: STEP,
      keepTrace: true,
      tape: [
        forward, settle, open,
        { kind: 'fixture', apply: stageOffers(['magnet', 'traffic-speed', 'river-speed', 'pack-pocket']) },
        { kind: 'call', target: 'run', method: 'buy', args: ['parity-100-0-magnet'] },
        { kind: 'call', target: 'run', method: 'buy', args: ['parity-100-1-traffic-speed'] },
        { kind: 'call', target: 'run', method: 'buy', args: ['parity-100-2-river-speed'] },
        { kind: 'fixture', apply: appendOffer('magnet', 'parity-full-hand-magnet') },
        { kind: 'call', target: 'run', method: 'buy', args: ['parity-full-hand-magnet'] },
        { kind: 'call', target: 'run', method: 'sell', args: ['card-1'] },
        { kind: 'call', target: 'run', method: 'buy', args: ['parity-100-3-pack-pocket'] },
        { kind: 'call', target: 'run', method: 'previewPack', args: [['card-5']] },
        { kind: 'call', target: 'run', method: 'claimPack', args: [['card-5'], ['card-2']] },
        close,
      ],
    },
    {
      name: 'economy full hand pack skip keeps the paid offer and cards unchanged',
      seed: 0xfffffffe,
      definitions: definitions(['magnet', 'traffic-speed', 'river-speed', 'pack-pocket']),
      setup: levelMarket,
      fixedStep: STEP,
      keepTrace: true,
      tape: [
        forward, settle, open,
        { kind: 'fixture', apply: stageOffers(['magnet', 'traffic-speed', 'river-speed', 'pack-pocket']) },
        { kind: 'call', target: 'run', method: 'buy', args: ['parity-100-0-magnet'] },
        { kind: 'call', target: 'run', method: 'buy', args: ['parity-100-1-traffic-speed'] },
        { kind: 'call', target: 'run', method: 'buy', args: ['parity-100-2-river-speed'] },
        { kind: 'call', target: 'run', method: 'buy', args: ['parity-100-3-pack-pocket'] },
        closeFrozen, open,
        { kind: 'call', target: 'run', method: 'skipPack' },
        close,
      ],
    },
  ]);

  assert.equal(outcome(replace, 8).ok, false, 'a fourth ordinary card is rejected at the real capacity');
  assert.match(outcome(replace, 8).message, /Hand full/, 'rejection names the capacity cause');
  assert.equal(outcome(replace, 9).ok, true, 'sale is available while the market is open');
  assert.equal(outcome(replace, 10).ok, true, 'paid pack opens after making room');
  assert.equal(outcome(replace, 11).valid, true, 'the selected card is previewed against final capacity');
  assert.equal(outcome(replace, 12).ok, true, 'selection replaces the explicit held card');
  assert.equal(replace.final.game.inventory.visible.pendingPack, null, 'claim clears the draft');
  assert.equal(replace.final.game.inventory.visible.cards.length, 2, 'sale plus selected pack card leaves the expected hand');
  assert.equal(outcome(skip, 7).ok, true, 'pack opens while a three-card hand is full');
  assert.equal(outcome(skip, 10).ok, true, 'skip is an explicit completed transaction');
  assert.equal(skip.final.game.inventory.visible.pendingPack, null, 'skip clears only the draft');
  assert.equal(skip.final.game.inventory.visible.cards.length, 3, 'skip never changes owned cards');
  assert.equal(skip.final.game.inventory.visible.market.offers.find(offer => offer.itemId === 'pack-pocket').sold, true, 'skipping never refunds or restocks the paid pack');
});

test('differential economy: capacity cards and live speed effects rebase retained lanes without teleporting actors', async () => {
  const [scenario] = await runDifferentialMatrix([{
    name: 'economy capacity sale and live traffic river effect rebase',
    seed: 0xffffffff,
    definitions: definitions(['extra-pocket', 'magnet', 'traffic-speed', 'river-speed']),
    setup: levelMarketWithLiveLanes,
    fixedStep: STEP,
    keepTrace: true,
    tape: [
      forward, settle, open,
      { kind: 'fixture', apply: stageOffers(['extra-pocket', 'magnet', 'traffic-speed', 'river-speed']) },
      { kind: 'call', target: 'run', method: 'buy', args: ['parity-100-0-extra-pocket'] },
      { kind: 'call', target: 'run', method: 'buy', args: ['parity-100-1-magnet'] },
      { kind: 'call', target: 'run', method: 'buy', args: ['parity-100-2-traffic-speed'] },
      { kind: 'call', target: 'run', method: 'buy', args: ['parity-100-3-river-speed'] },
      close,
      { kind: 'step', count: 24 },
      { kind: 'call', target: 'run', method: 'sell', args: ['card-1'] },
      { kind: 'call', target: 'run', method: 'sell', args: ['card-3'] },
      { kind: 'call', target: 'game', method: 'syncEffects' },
    ],
  }]);

  assert.equal(outcome(scenario, 4).ok, true, 'capacity-changing card purchase succeeds');
  assert.equal(outcome(scenario, 6).ok, true, 'traffic modifier purchase succeeds');
  assert.equal(outcome(scenario, 7).ok, true, 'river modifier purchase succeeds');
  const afterPurchase = scenario.trace.find(point => point.game.state === 'playing' && point.game.inventory.visible.cards.length === 4)?.game;
  assert.ok(afterPurchase.gameFuture.laneSpeeds.some(entry => entry.speed?.base !== entry.speed?.applied), 'live effects retain base and rebased speed state');
  assert.equal(outcome(scenario, 10).ok, true, 'selling the capacity card succeeds only because the final hand still fits');
  assert.equal(outcome(scenario, 11).ok, true, 'selling a modifier card succeeds outside the open market');
  assert.equal(scenario.final.game.inventory.visible.cardCapacity, 3, 'removing the capacity card recomputes the live hand limit');
  const finalLanes = scenario.final.game.gameFuture.laneSpeeds;
  const finalKinds = new Map(scenario.final.game.rows.map(entry => [entry.row, entry.lane.kind]));
  assert.ok(finalLanes.filter(entry => finalKinds.get(entry.row) === 'road').every(entry => entry.speed.base === entry.speed.applied), 'selling traffic speed rebases retained roads back to their base speed');
  assert.ok(finalLanes.some(entry => finalKinds.get(entry.row) === 'river' && entry.speed.base !== entry.speed.applied), 'the remaining river card keeps its live rebase active');
  assert.equal(scenario.final.game.inventory.future.sequence, 4, 'no hidden transaction ids are introduced by effects or sales');
});
