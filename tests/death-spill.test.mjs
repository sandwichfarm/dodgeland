import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const source = await loadSources(['death-spill', 'market/catalog']);
after(source.dispose);
const { createDeathSpill, spillPose, MAX_SPILL_COINS, DEATH_SPILL_REVEAL } = await source.import('death-spill');
const { ITEM_CATALOG } = await source.import('market/catalog');
const cosmetics = ITEM_CATALOG.filter(item => item.kind === 'cosmetic');
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test('every wallet coin is represented, with bounded draw bodies for large piles', () => {
  for (const wallet of [0, 1, 17, 160, 191, 192, 193, 999, 1000000, Number.MAX_SAFE_INTEGER]) {
    const spill = createDeathSpill(wallet, [], 0, 0, 0, 51);
    assert.equal(spill.wallet, wallet); assert.equal(spill.age, 0);
    assert.equal(spill.drops.length, Math.min(wallet, MAX_SPILL_COINS));
    assert.equal(spill.drops.reduce((sum, drop) => sum + drop.amount, 0), wallet);
    assert.ok(spill.drops.every(drop => drop.kind === 'coin' && Number.isSafeInteger(drop.amount) && drop.amount > 0));
    if (wallet <= MAX_SPILL_COINS) assert.ok(spill.drops.every(drop => drop.amount === 1));
  }
});

test('all owned cosmetics spill once, including unworn hats, shirts and effect styles', () => {
  assert.ok(cosmetics.some(item => item.appearance.style === 'hat'));
  assert.ok(cosmetics.some(item => item.appearance.style === 'shirt'));
  for (const style of ['halo', 'sparkles', 'trail']) assert.ok(cosmetics.some(item => item.appearance.style === style));
  const owned = [...cosmetics], spill = createDeathSpill(3, owned, 1, 30, .15, 42);
  owned.length = 0;
  assert.deepEqual(spill.cosmetics, cosmetics, 'snapshot outlives cleared run inventory');
  const dropped = spill.drops.filter(drop => drop.kind === 'cosmetic');
  assert.deepEqual(dropped.map(drop => drop.item), cosmetics);
  assert.ok(dropped.every(drop => drop.amount === 0));
  assert.equal(spill.drops.length, cosmetics.length + 3);
});

test('motion stays local and above its floor, makes two damped bounces, then settles within two seconds', () => {
  const spill = createDeathSpill(300, cosmetics, -2, 85, .27, 900);
  for (const drop of spill.drops) {
    const settled = drop.landing + drop.firstBounce + drop.secondBounce + drop.slide;
    assert.ok(settled < 2);
    for (let tick = 0; tick <= 240; tick++) {
      const pose = spillPose(drop, tick / 120);
      assert.ok(Object.values(pose).every(Number.isFinite));
      assert.ok(pose.z >= .27);
      assert.ok(Math.hypot(pose.x + 2, pose.y - 85) <= 2.81);
    }
    close(spillPose(drop, drop.landing).z, .27);
    close(spillPose(drop, drop.landing + drop.firstBounce).z, .27);
    const first = spillPose(drop, drop.landing + drop.firstBounce / 2).z;
    const second = spillPose(drop, drop.landing + drop.firstBounce + drop.secondBounce / 2).z;
    assert.ok(first > second && second > .27);
    const rest = spillPose(drop, 2);
    close(rest.z, .27); close(rest.x, -2 + drop.offsetX); close(rest.y, 85 + drop.offsetY);
    close(rest.tilt, drop.restTilt);
    if (drop.kind === 'coin' || drop.item.appearance.style === 'shirt') close(rest.tilt, Math.PI / 2);
    assert.deepEqual(rest, spillPose(drop, 120), 'fallen belongings remain on the floor');
  }
  assert.ok(DEATH_SPILL_REVEAL >= 1, 'result screen leaves time to see belongings fall');
});

test('poses are independent of frame history, render ordering and outside random state', () => {
  const random = Math.random;
  Math.random = () => { throw new Error('Spill must not consume external RNG'); };
  try {
    const first = createDeathSpill(87, cosmetics, .7, 100, 0, 8675309);
    const second = createDeathSpill(87, cosmetics, .7, 100, 0, 8675309);
    assert.deepEqual(first, second);
    const snapshot = structuredClone(first);
    const expected = first.drops.map(drop => spillPose(drop, .725));
    for (const drop of first.drops.toReversed()) for (const age of [2, .01, .5, 10, 0]) spillPose(drop, age);
    assert.deepEqual(first.drops.map(drop => spillPose(drop, .725)), expected);
    assert.deepEqual(first, snapshot, 'sampling does not mutate the snapshot or trajectory');
    assert.notDeepEqual(first.drops, createDeathSpill(87, cosmetics, .7, 100, 0, 8675310).drops);
  } finally { Math.random = random; }
});

test('reduced motion lands belongings immediately and malformed numeric inputs stay finite', () => {
  const spill = createDeathSpill(8, cosmetics, Infinity, NaN, -Infinity, NaN);
  for (const drop of spill.drops) {
    const rest = spillPose(drop, 2);
    for (const age of [0, .2, 2, 10]) assert.deepEqual(spillPose(drop, age, true), rest);
    for (const age of [-3, NaN, Infinity, -Infinity]) assert.ok(Object.values(spillPose(drop, age)).every(Number.isFinite));
  }
  for (const amount of [NaN, Infinity, -1]) assert.equal(createDeathSpill(amount, [], 0, 0, 0, 3).wallet, 0);
});
