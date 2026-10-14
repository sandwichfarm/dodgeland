import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const source = await loadSources(['game', 'market/catalog', 'mobs']);
after(source.dispose);
const { Game, HOP_TIME, actorPositions, coinPosition, generateLane, laneDirection, platformSupports, trainPhase, vehicleBounds } = await source.import('game');
const { ITEM_CATALOG } = await source.import('market/catalog');
const { mobTuning } = await source.import('mobs');
const definition = id => ITEM_CATALOG.find(item => item.id === id);
const close = (a, b, note = '') => assert.ok(Math.abs(a - b) < 1e-8, `${note}: ${a} != ${b}`);
function lane(g, row, kind = 'meadow', extra = {}) {
  const value = { ...generateLane(g.seed, row, g.home), kind, blocked: [], decorations: [], coin: null, speed: 1, phase: 0, spacing: 20, length: 1.15, ...extra };
  g.rows.set(row, value); return value;
}
function arena(mode = 'stroll', ids = ITEM_CATALOG.map(item => item.id)) {
  const g = new Game(23, 'pond', mode, false, ids.map(definition));
  for (const row of g.rows.keys()) lane(g, row);
  g.state = 'playing'; return g;
}
function buy(g, id) {
  // Explicit fixture stock isolates each real module; market stock RNG is
  // covered independently in market.test. Transactions use the production API.
  if (!g.run.market) g.run.advanceScore(100);
  assert.equal(g.openMarket(), true);
  const item = g.run.catalog.get(id), offer = { id: `fixture-${id}-${g.run.revision}`, itemId: id, price: item.price, sold: false };
  g.run.market.offers.push(offer); g.run.creditCoins(item.price);
  const result = g.run.buy(offer.id); assert.equal(result.ok, true, result.message);
  g.closeMarket(); return result.cards?.[0];
}
function advance(g, target) {
  while (g.maxY < target) { lane(g, g.y + 1); assert.equal(g.move('forward'), true); for (const value of g.rows.values()) value.coin = null; g.update(HOP_TIME); assert.equal(g.state, 'playing'); }
}
function mob(kind = 'slime', extra = {}) {
  return { id: 1, kind, x: -3, y: 0, fromX: -3, fromY: 0, targetX: -2, targetY: 0, phase: 'rest', phaseLeft: .01, phaseDuration: .01, ...extra };
}

test('100-point invitations follow real scoring, pause every clock, expire, and do not reroll on backtracking', () => {
  const g = arena(); assert.equal(g.openMarket(), false); advance(g, 99); assert.equal(g.run.market, null);
  lane(g, 100); g.move('forward'); assert.equal(g.run.market.milestone, 100);
  const before = { time: g.time, hop: g.hop, wave: g.waveRow, remaining: g.run.market.remaining, offers: structuredClone(g.run.market.offers) };
  assert.equal(g.openMarket(), true); g.update(100); g.resume();
  assert.equal(g.state, 'paused'); assert.equal(g.time, before.time); assert.equal(g.hop, before.hop); assert.equal(g.waveRow, before.wave); assert.equal(g.run.market.remaining, before.remaining);
  g.closeMarket(false); assert.equal(g.state, 'paused'); g.resume(); g.update(HOP_TIME);
  g.move('back'); g.update(HOP_TIME); g.move('forward'); g.update(HOP_TIME);
  assert.deepEqual(g.run.market.offers, before.offers);
  g.update(16); assert.equal(g.run.market, null); assert.equal(g.openMarket(), false);
  advance(g, 200); assert.equal(g.run.market.milestone, 200); assert.notDeepEqual(g.run.market.offers, before.offers);
});

test('an unclaimed pack survives forced market closure and freezes every game clock until its cards are chosen', () => {
  const g = arena('arcade'); advance(g, 100);
  assert.equal(g.openMarket(), true);
  g.run.creditCoins(100);
  const power = definition('power-freeze');
  g.run.market.offers.push({ id: 'fixture-freeze', itemId: power.id, price: power.price, sold: false });
  assert.equal(g.run.buy('fixture-freeze').ok, true);
  const pack = definition('pack-satchel');
  const offer = { id: 'fixture-large-pack', itemId: pack.id, price: pack.price, sold: false };
  g.run.market.offers.push(offer);
  assert.equal(g.run.buy(offer.id).ok, true);
  const draft = structuredClone(g.run.pendingPack);
  const frozen = () => ({
    x: g.x, y: g.y, maxY: g.maxY, time: g.time, hop: g.hop, wave: g.waveRow,
    wallet: g.run.wallet, health: g.health, effects: { ...g.run.effects },
    market: structuredClone(g.run.market), powers: structuredClone(g.run.powers), mobs: structuredClone(g.mobs),
  });
  const before = frozen();
  g.closeMarket(false);
  assert.equal(g.state, 'paused'); assert.equal(g.run.isOpen, false);
  g.resume(); assert.equal(g.state, 'paused', 'resume cannot abandon paid pack choices');
  assert.equal(g.move('forward'), false); g.update(999);
  assert.deepEqual(frozen(), before);
  // The move/update guards also protect the draft if another caller restores
  // playing state directly; a pending pack must remain an engine invariant.
  g.state = 'playing';
  assert.equal(g.move('forward'), false); g.update(999);
  assert.deepEqual(frozen(), before);
  g.state = 'paused';
  assert.equal(g.openMarket(), true, 'a closed draft can be reopened from paused state');
  assert.deepEqual(g.run.pendingPack, draft, 'neither candidates nor bonus quota reroll');
  assert.deepEqual(g.run.cards, []);
  const selected = draft.choices.slice(-draft.picks);
  assert.equal(g.run.claimPack(selected.map(card => card.id)).ok, true);
  assert.deepEqual(g.run.cards, selected); assert.equal(g.run.pendingPack, null);
  assert.equal(g.run.wallet, before.wallet, 'claiming incurs no second charge');
  g.closeMarket(); assert.equal(g.state, 'playing');
  lane(g, 101); assert.equal(g.move('forward'), true); g.update(HOP_TIME);
  assert.ok(g.time > before.time); assert.ok(g.run.market.remaining < before.market.remaining);
  assert.ok(g.run.powers[0].remaining < before.powers[0].remaining);
});

test('skipping a full-hand pack restores normal play and clocks without altering owned cards or refunding the purchase', () => {
  const g = arena('arcade'); advance(g, 100); g.run.creditCoins(1000);
  assert.equal(g.openMarket(), true);
  for (const itemId of ['magnet', 'traffic-speed', 'river-speed', 'power-freeze', 'pack-satchel']) {
    const item = definition(itemId), offer = { id: `fixture-${itemId}`, itemId, price: item.price, sold: false };
    g.run.market.offers.push(offer); assert.equal(g.run.buy(offer.id).ok, true);
  }
  assert.equal(g.run.cards.length, 3); assert.ok(g.run.pendingPack);
  const before = { cards: structuredClone(g.run.cards), wallet: g.run.wallet, time: g.time, window: g.run.market.remaining, power: g.run.powers[0].remaining };
  g.closeMarket(false); g.resume(); g.update(1); assert.equal(g.state, 'paused'); assert.equal(g.time, before.time);
  assert.equal(g.openMarket(), true); assert.equal(g.run.skipPack().ok, true); assert.equal(g.run.pendingPack, null);
  assert.deepEqual(g.run.cards, before.cards); assert.equal(g.run.wallet, before.wallet);
  g.closeMarket(); assert.equal(g.state, 'playing'); lane(g, 101);
  assert.equal(g.move('forward'), true); g.update(HOP_TIME);
  assert.ok(g.time > before.time); assert.ok(g.run.market.remaining < before.window); assert.ok(g.run.powers[0].remaining < before.power);
});

test('terminal cleanup removes pending pack choices before death observers run', () => {
  const g = arena(); g.setCharacter('sunny'); advance(g, 100); g.run.creditCoins(20);
  assert.equal(g.openMarket(), true);
  const pack = definition('pack-pocket');
  const offer = { id: 'fixture-small-pack', itemId: pack.id, price: pack.price, sold: false };
  g.run.market.offers.push(offer);
  assert.equal(g.run.buy(offer.id).ok, true);
  const staleIds = g.run.pendingPack.choices.slice(0, g.run.pendingPack.picks).map(card => card.id);
  g.closeMarket(false);
  let observed;
  g.onEnd = () => { observed = { pendingPack: g.run.pendingPack, wallet: g.run.wallet, cards: [...g.run.cards], market: g.run.market, alive: g.run.alive }; };
  // Normal play is suspended during a draft. Exercise the terminal cleanup
  // path explicitly so cancellation can never expose paid choices to retry.
  g.state = 'playing'; g.end('Fixture terminal event', 'water');
  assert.equal(g.state, 'dead');
  assert.deepEqual(observed, { pendingPack: null, wallet: 0, cards: [], market: null, alive: false });
  assert.equal(g.run.claimPack(staleIds).ok, false); assert.equal(g.openMarket(), false);
});

test('magnet, terrain coins, fractional multipliers and score income pass through actual collection exactly once', () => {
  const g = arena(); buy(g, 'magnet'); const gained = []; g.onCoin = amount => gained.push(amount);
  const nearby = lane(g, 1, 'meadow', { coin: 0 }); g.update(0);
  assert.notEqual(nearby.coin, null); assert.equal(g.coins, 0); for (let step = 0; step < 120; step++) g.update(1 / 120); assert.equal(nearby.coin, null); assert.equal(g.coins, 1); g.update(0); assert.equal(g.coins, 1);
  buy(g, 'road-coins'); lane(g, 0, 'road', { coin: 0, phase: 10, speed: 0 }); g.update(0); assert.equal(g.coins, 3);
  buy(g, 'river-coins'); lane(g, 0, 'river', { coin: 0, speed: 0, length: 4 }); g.update(0); assert.equal(g.coins, 5);
  g.openMarket(); assert.equal(g.run.sell(g.run.cards.find(card => card.components[0].itemId === 'magnet').id).ok, true); g.closeMarket();
  buy(g, 'coin-multiplier'); lane(g, 0); const before = g.coins;
  for (let i = 0; i < 8; i++) { g.lane.coin = 0; g.update(0); }
  assert.equal(g.coins - before, 9); assert.equal(gained.reduce((sum, amount) => sum + amount, 0), g.coins);
  g.openMarket(); assert.equal(g.run.sell(g.run.cards.find(card => card.components[0].itemId === 'road-coins').id).ok, true); g.closeMarket();
  buy(g, 'score-income'); g.x = g.fromX = 0; g.y = g.fromY = g.maxY = 100; g.ensureRows();
  const incomeBefore = g.coins; advance(g, 125); assert.equal(g.coins - incomeBefore, 1);
  g.move('back'); g.update(HOP_TIME); g.move('forward'); g.update(HOP_TIME); assert.equal(g.coins - incomeBefore, 1);
  const rush = arena(); buy(rush, 'power-coin-rush'); buy(rush, 'score-income'); rush.y = rush.fromY = rush.maxY = 100; rush.ensureRows();
  advance(rush, 125); assert.equal(rush.coins, 1, 'Gold Rush multiplies score-hook income with fractional carry'); close(rush.run.effects.coinMultiplier, 1.5);
});

test('magnet waits for safe landing and does not pay for a lethal landing', () => {
  const g = arena(); buy(g, 'magnet'); lane(g, 1, 'meadow', { coin: 1 });
  g.move('forward'); g.update(HOP_TIME / 2); assert.equal(g.coins, 0); g.update(HOP_TIME / 2); assert.equal(g.coins, 0); for (let step = 0; step < 120; step++) g.update(1 / 120); assert.equal(g.coins, 1);
  const bad = arena(); bad.setCharacter('sunny'); buy(bad, 'magnet'); lane(bad, 1, 'river', { phase: 10, coin: 1, length: 2 });
  bad.move('forward'); bad.update(HOP_TIME); assert.equal(bad.state, 'dead'); assert.equal(bad.coins, 0);
});

test('live traffic/current cards and timed freeze keep physical positions, directions, and rider support continuous', () => {
  const g = arena(); g.time = 17;
  const road = lane(g, 2, 'road', { speed: -2, phase: 3, spacing: 7 }), river = lane(g, 3, 'river', { speed: 1.5, length: 4, spacing: 6 });
  const positions = [actorPositions(road, g.time), actorPositions(river, g.time)], bounds = vehicleBounds(road);
  const speedCard = buy(g, 'traffic-speed'); buy(g, 'river-speed');
  assert.deepEqual(actorPositions(road, g.time), positions[0]); assert.deepEqual(actorPositions(river, g.time), positions[1]);
  assert.ok(Math.abs(road.speed) < 2); assert.ok(river.speed < 1.5);
  buy(g, 'power-freeze'); assert.equal(road.speed, 0); assert.equal(laneDirection(road), -1); assert.deepEqual(vehicleBounds(road), bounds);
  g.update(.25); assert.deepEqual(actorPositions(road, g.time), positions[0]);
  const stopped = actorPositions(road, g.time), stoppedAt = g.time; g.run.powers.find(power => power.itemId === 'power-freeze').remaining = .001;
  g.update(0.001); assert.ok(road.speed < 0); const resumed = actorPositions(road, g.time);
  for (let i = 0; i < stopped.length; i++) close(resumed[i] - stopped[i], road.speed * (g.time - stoppedAt));
  g.openMarket(); assert.equal(g.run.sell(speedCard.id).ok, true); const beforeSell = actorPositions(road, g.time); g.closeMarket();
  assert.deepEqual(actorPositions(road, g.time), beforeSell); assert.equal(road.speed, -2);
});

test('structural cards alter future geometry without exceeding three-card hands', () => {
  let road = 0, water = 0, rail = 0, bonusCoins = 0, removed = 0, platformCoins = 0;
  for (const ids of [
    ['traffic-spacing', 'platform-length', 'train-period'],
    ['train-warning', 'coin-chance', 'scenery-clear'],
    ['river-coins'],
  ]) {
    const g = arena(), old = g.rows.get(10), saved = structuredClone(old);
    for (const id of ids) buy(g, id);
    assert.ok(g.run.cards.length <= 3);
    assert.deepEqual(old, saved, 'existing geometry is not remade under the traveler');
    for (let index = 29; index < 700; index++) {
      g.maxY = index; g.ensureRows(); const value = g.rows.get(index), base = generateLane(g.seed, index, g.home);
      if (value.kind === 'road' && ids.includes('traffic-spacing')) { assert.ok(value.spacing > base.spacing); road++; }
      if (value.kind === 'river') {
        if (ids.includes('platform-length')) { assert.ok(value.length > base.length); water++; }
        if (value.coin !== null) {
          const coin = coinPosition(value, g.time); assert.ok(platformSupports(value, coin.x, g.time));
          const later = coinPosition(value, g.time + .3); close(later.x - coin.x, value.speed * .3); platformCoins++;
        }
      }
      if (value.kind === 'rail') {
        if (ids.includes('train-period')) { assert.ok(value.period > base.period); rail++; }
        if (ids.includes('train-warning')) { assert.ok(value.warning > base.warning); assert.equal(trainPhase(value, value.warning - .01 - value.phase).warning, true); }
      }
      if (value.coin !== null && base.coin === null) bonusCoins++;
      removed += base.blocked.length - value.blocked.length;
      for (const x of base.blocked.filter(x => !value.blocked.includes(x))) assert.ok(!value.decorations.some(decoration => decoration.x === x));
    }
  }
  assert.ok(road > 0 && water > 0 && rail > 0 && bonusCoins > 0 && removed > 0 && platformCoins > 0);
});

test('Lucky Lanes adds its advertised eight percentage points to eligible lane coin probability', () => {
  const g = arena(); buy(g, 'coin-chance'); let eligible = 0, added = 0;
  for (let row = 29; row < 10_029; row++) {
    g.maxY = row; g.ensureRows(); const value = g.rows.get(row), base = generateLane(g.seed, row, g.home);
    if (value.kind === 'river' || value.kind === 'rail') continue;
    eligible++; if (value.coin !== null && base.coin === null) added++;
  }
  const increase = added / eligible;
  assert.ok(increase > .065 && increase < .095, `measured increase ${increase}`);
});

test('Lucky Lanes adds eight points to an empty river baseline or the River Gold baseline', () => {
  for (const [ids, expected] of [[['coin-chance'], .08], [['river-coins', 'coin-chance'], .48]]) {
    const g = arena(); for (const id of ids) buy(g, id);
    let rivers = 0, rewards = 0;
    for (let row = 29; row < 20_029; row++) {
      g.maxY = row; g.ensureRows(); const value = g.rows.get(row);
      if (value.kind !== 'river') continue;
      rivers++; if (value.coin !== null) rewards++;
    }
    const probability = rewards / rivers;
    assert.ok(Math.abs(probability - expected) < .025, `${ids.join(' + ')}: ${probability}, expected ${expected}`);
  }
});

test('damage cards reduce actual rear/side hits, recovery lasts longer, and milestone regeneration gains potency', () => {
  for (const [face, id] of [['rear', 'rear-resist'], ['side', 'side-resist']]) {
    const g = arena(); buy(g, id); buy(g, 'hurt-recovery'); const events = []; g.onHurt = event => events.push(event);
    lane(g, 0, 'road');
    if (face === 'side') { g.y = g.fromY = -1; g.move('forward'); }
    else { g.x = g.fromX = -.975; g.move('right'); }
    g.update(HOP_TIME / 2);
    assert.equal(events.length, 1); assert.ok(events[0].amount < (face === 'rear' ? 1 : 2)); assert.ok(g.health > (face === 'rear' ? 2 : 1)); assert.ok(g.hurtRemaining > 1);
  }
  const g = arena(); buy(g, 'regen-bonus'); g.health = 1; const heals = []; g.onHeal = value => heals.push(value);
  advance(g, 100); assert.ok(heals[0] > .5); close(g.health, 1 + heals[0]);
});

test('wave cards change the actual front and matching countdown while retained bounds remain monotonic', () => {
  const ordinary = arena('arcade'), slowed = arena('arcade'); buy(slowed, 'wave-speed'); buy(slowed, 'wave-trail');
  for (const g of [ordinary, slowed]) { g.time = 5; g.waveRow = -4; g.update(.5); }
  assert.ok(slowed.waveRow < ordinary.waveRow); assert.ok(slowed.waveSeconds > ordinary.waveSeconds);
  for (const g of [ordinary, slowed]) { g.x = g.fromX = 0; g.y = g.fromY = g.maxY = 20; g.ensureRows(); lane(g, 20); g.update(0); }
  assert.equal(ordinary.waveRow, 14); assert.equal(slowed.waveRow, 13);
  const before = slowed.waveRow; slowed.update(.1); assert.ok(slowed.waveRow >= before);
});

test('mob modules alter real attack phases and delay arrivals; freeze preserves finite stationary bodies', () => {
  for (const [id, phase, field] of [['mob-windup', 'rest', 'windup'], ['mob-speed', 'windup', 'speed'], ['mob-recovery', 'moving', 'recovery']]) {
    const g = arena('arcade'); buy(g, id);
    const start = phase === 'moving' ? -3 : -1;
    g.mobs.push(mob('crab', { x: start, fromX: start, targetX: start + 1, phase })); g.update(.01);
    const value = g.mobs[0], baseline = mobTuning('crab', g.maxY);
    assert.ok(value.phaseDuration > (field === 'speed' ? 1 / baseline.speed : baseline[field]), id);
  }
  const walker = arena('arcade'); buy(walker, 'mob-speed');
  const slime = mob('slime', { phase: 'spawning' }); walker.mobs.push(slime); walker.update(.01);
  assert.equal(slime.phase, 'walking');
  assert.ok(slime.phaseDuration > Math.hypot(slime.targetX - slime.fromX, slime.targetY - slime.fromY) / mobTuning('slime', 0).walkSpeed);
  const ordinary = arena('arcade'), delayed = arena('arcade'); buy(delayed, 'mob-spawn-delay');
  for (const g of [ordinary, delayed]) {
    g.update(0); g.run.market = null; g.time = 45; g.y = g.fromY = g.maxY = 160; g.ensureRows();
    for (const row of g.rows.keys()) lane(g, row); g.waveRow = 154;
    g.update(0); assert.equal(g.mobs.length, 1); g.mobs.splice(0);
    g.y = g.fromY = g.maxY = 184; g.ensureRows(); for (const row of g.rows.keys()) lane(g, row); g.waveRow = 178;
    // Explicit elapsed-time fixture preserves the real spawn director deadline.
    g.time = 63; g.update(0);
  }
  assert.equal(ordinary.mobs.length, 1); assert.equal(delayed.mobs.length, 0);
  delayed.time = 64.49; delayed.update(0); assert.equal(delayed.mobs.length, 0);
  delayed.time = 64.5; delayed.update(0); assert.equal(delayed.mobs.length, 1);
  const frozen = arena('arcade'); buy(frozen, 'power-freeze'); const body = mob('wasp', { phase: 'moving', phaseLeft: 1, phaseDuration: 1 }); frozen.mobs.push(body);
  frozen.update(.3); assert.equal(body.x, -3); assert.equal(body.phaseLeft, 1); assert.ok(Number.isFinite(body.x));
  frozen.run.powers[0].remaining = .001; frozen.update(.002); assert.ok(body.x > -3);
});

test('shield covers every lethal cause while clocks run, expires, and death clears all run assets before observers', () => {
  for (const cause of ['traffic', 'train', 'water', 'wave', 'swept', 'trail', 'mob']) {
    const g = arena();
    if (cause === 'water' || cause === 'swept') g.setCharacter('sunny');
    buy(g, 'power-shield'); g.end('Fixture contact', cause); assert.equal(g.state, 'playing', cause); assert.equal(g.health, 3);
    const before = g.time; g.update(.1); assert.ok(g.time > before); g.run.powers[0].remaining = .001; g.update(.002); g.end('Expired contact', cause); assert.equal(g.state, 'dead', cause);
  }
  const g = arena(); g.setCharacter('sunny'); buy(g, 'magnet'); buy(g, 'look-halo'); buy(g, 'power-coin-rush'); g.awardCoins(3);
  let observed; g.onEnd = () => { observed = { wallet: g.run.wallet, cards: g.run.cards.length, powers: g.run.powers.length, cosmetics: g.run.cosmetics.length, market: g.run.market, earned: g.coins }; };
  g.end('Fixture loss', 'water'); assert.deepEqual(observed, { wallet: 0, cards: 0, powers: 0, cosmetics: 0, market: null, earned: 4 });
  assert.equal(g.awardCoins(2), 0); assert.equal(g.openMarket(), false); assert.equal(new Game(23).run.wallet, 0);
});

test('shield expiration makes an overlapping car dangerous again instead of retaining protected contact immunity', () => {
  const g = arena(); buy(g, 'power-shield'); lane(g, 0, 'road', { speed: 0 });
  g.update(.1); assert.equal(g.health, 3); assert.equal(g.state, 'playing');
  g.run.powers[0].remaining = .001; g.update(.002);
  assert.ok(g.health < 3, 'the unchanged overlap is a real collision after the power expires');
});

test('shield protection and expiration pass through every real hazard collision path', () => {
  const hazards = [
    ['traffic', g => { lane(g, 0, 'road', { speed: 0 }); g.x = g.fromX = .5; }],
    ['train', g => lane(g, 0, 'rail', { phase: 2.375, period: 9, warning: 1.5 })],
    ['water', g => lane(g, 0, 'river', { phase: 10, length: 2 })],
    ['wave', g => { g.waveRow = 0; }],
    ['swept', g => { g.x = g.fromX = 5.6; lane(g, 0, 'river', { phase: 5.6, speed: 0, length: 4 }); }],
    ['trail', g => { g.mode = 'stroll'; g.maxY = 8; }],
    ['mob', g => g.mobs.push(mob('slime', { x: 0, fromX: 0, targetX: 1, phase: 'walking', phaseLeft: 1, phaseDuration: 1 }))],
  ];
  for (const [cause, setup] of hazards) {
    const g = arena('arcade');
    if (cause === 'water' || cause === 'swept') g.setCharacter('sunny');
    buy(g, 'power-shield'); setup(g); g.update(0);
    assert.equal(g.state, 'playing', `${cause} shielded`); assert.equal(g.health, 3); assert.equal(g.caughtByWave, false);
    g.run.powers[0].remaining = .001; g.update(.002);
    assert.equal(g.state, 'dead', `${cause} expired`); assert.equal(g.deathCause, cause); assert.equal(g.health, 0);
  }
});

test('platform coins bind near their approach and remain supported, bounded and collectible after long waits', () => {
  const g = new Game(77, 'pond', 'arcade', false, ITEM_CATALOG); g.state = 'playing'; buy(g, 'river-coins');
  const arrivals = []; let checked = 0;
  for (let row = 101; row <= 189; row++) {
    g.maxY = row; g.time = (row - 100) * HOP_TIME; g.ensureRows();
    const value = g.rows.get(row); if (value.kind !== 'river' || value.coin === null) continue;
    const arrival = coinPosition(value, g.time); if (arrival && Math.abs(arrival.x) <= 5) arrivals.push(row);
    let reachable = false;
    for (let elapsed = 0; elapsed < 30; elapsed += .1) {
      const point = coinPosition(value, g.time + elapsed); if (!point) continue;
      assert.ok(Math.abs(point.x) <= 11); assert.ok(platformSupports(value, point.x, g.time + elapsed));
      if (Math.abs(point.x) <= 5) reachable = true;
    }
    assert.equal(reachable, true); value.coin = null; assert.equal(coinPosition(value, g.time + 1000), null, 'collected coins never respawn'); checked++;
  }
  assert.ok(checked >= 5); assert.ok(arrivals.length >= 3, `${arrivals.length} coins reachable on arrival`);
});

test('mode metadata excludes every inapplicable module without engine item IDs', () => {
  const arcade = arena('arcade'), stroll = arena('stroll');
  for (const item of ITEM_CATALOG) { assert.equal(arcade.run.catalog.has(item.id), true); assert.equal(stroll.run.catalog.has(item.id), !item.modes || item.modes.includes('stroll')); }
});
