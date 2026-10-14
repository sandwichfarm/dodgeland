import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const source = await loadSources(['death-spill-audio', 'death-spill', 'market/catalog']);
after(source.dispose);
const { DeathSpillAudio, spillImpacts } = await source.import('death-spill-audio');
const { createDeathSpill } = await source.import('death-spill');
const { ITEM_CATALOG } = await source.import('market/catalog');
const cosmetics = ITEM_CATALOG.filter(item => item.kind === 'cosmetic');
const make = (coins, items = []) => createDeathSpill(coins, items, 2, 18, 0, 42);
const harness = () => {
  const played = [], director = new DeathSpillAudio({ play: (cue, options) => played.push({ cue, ...options }) });
  const advance = (spill, age, enabled = true, reduced = false) => { spill.age = age; director.update(spill, enabled, reduced); };
  return { played, director, advance };
};

test('empty pockets are silent, while full wallets add bounded density and weight', () => {
  assert.deepEqual(spillImpacts(make(0)), []);
  const one = spillImpacts(make(1)), handful = spillImpacts(make(12)), pile = spillImpacts(make(192));
  const grouped = spillImpacts(make(10000));
  assert.equal(one.length, 3, 'one landing and two softer bounces');
  assert.ok(handful.length > one.length);
  assert.ok(pile.length >= handful.length);
  assert.equal(grouped.length, pile.length, 'grouped visual coins do not multiply voices');
  assert.ok(grouped.some((impact, i) => impact.gain > pile[i].gain), 'exact wallet amount affects weight');
  assert.ok(grouped.some(impact => impact.variant === 'heavy'));
  assert.ok(one[0].gain > one[1].gain && one[1].gain > one[2].gain, 'bounces decay');
  for (const wallet of [1, 12, 192, 10000, Number.MAX_SAFE_INTEGER]) {
    const impacts = spillImpacts(make(wallet, cosmetics));
    assert.ok(impacts.length <= 45, 'at most one contact per material in each short window');
    for (const impact of impacts) {
      assert.ok(Number.isFinite(impact.gain) && impact.gain > 0 && impact.gain <= .84);
      assert.ok(Math.abs(impact.pan) <= .85 && impact.rate >= .935 && impact.rate <= 1.065);
    }
  }
});

test('contacts coincide with visible landings, stay spatial, and distinguish soft and solid cosmetics', () => {
  const spill = make(12, cosmetics), snapshot = structuredClone(spill);
  const impacts = spillImpacts(spill), materials = new Set(impacts.map(impact => impact.cue));
  assert.deepEqual(materials, new Set(['spill.coin', 'spill.fabric', 'spill.trinket']));
  const contacts = spill.drops.flatMap(drop => [drop.landing, drop.landing + drop.firstBounce, drop.landing + drop.firstBounce + drop.secondBounce]);
  assert.ok(impacts.every(impact => contacts.includes(impact.at)));
  assert.ok(impacts.some(impact => impact.pan < -.1) && impacts.some(impact => impact.pan > .1));
  assert.ok(!impacts.some(impact => impact.cue === 'coin'), 'no collection reward sound');
  const random = Math.random;
  Math.random = () => { throw Error('Spill audio cannot consume gameplay RNG'); };
  try { assert.deepEqual(spillImpacts(spill), impacts); } finally { Math.random = random; }
  assert.deepEqual(spill, snapshot);
});

test('the visible spill clock fires each contact once, including a paused clock', () => {
  const spill = make(25, cosmetics), expected = spillImpacts(spill), h = harness();
  h.advance(spill, expected[0].at - .001);
  assert.equal(h.played.length, 0, 'airborne belongings stay silent');
  for (const impact of expected) {
    h.advance(spill, impact.at);
    const count = h.played.length;
    for (let frame = 0; frame < 20; frame++) h.advance(spill, impact.at);
    assert.equal(h.played.length, count, 'focus/visibility pause does not repeat impacts');
  }
  assert.deepEqual(h.played, expected.map(({ at, ...impact }) => impact));
  h.advance(spill, 3); assert.equal(h.played.length, expected.length);
});

test('mute/menu skips elapsed contacts; late frames and new runs never flush a backlog', () => {
  const spill = make(30), expected = spillImpacts(spill), h = harness();
  h.advance(spill, .8, false);
  h.advance(spill, .8);
  assert.equal(h.played.length, 0);
  for (const impact of expected.filter(impact => impact.at > .8)) h.advance(spill, impact.at);
  assert.equal(h.played.length, expected.filter(impact => impact.at > .8).length);
  const late = harness(); late.advance(make(100), 3);
  assert.equal(late.played.length, 0, 'already settled contacts do not catch up');
  h.director.reset(); h.director.update(null, true);
  const next = make(1), before = h.played.length;
  h.advance(next, 0); assert.equal(h.played.length, before);
  h.advance(next, next.drops[0].landing); assert.equal(h.played.length, before + 1);
});

test('reduced motion gives one brief contact per material and never replays on preference changes', () => {
  const spill = make(10000, cosmetics), impacts = spillImpacts(spill, true), h = harness();
  assert.equal(impacts.length, 3);
  assert.ok(impacts.every(impact => impact.at === 0));
  h.advance(spill, .02, true, true); assert.equal(h.played.length, 3);
  h.advance(spill, .7, true, true); assert.equal(h.played.length, 3);
  h.advance(spill, .8, true, false); h.advance(spill, 1);
  assert.equal(h.played.length, 3);
  const muted = harness(), mutedSpill = make(20);
  muted.advance(mutedSpill, 0, false, true);
  muted.advance(mutedSpill, 3, true, true);
  assert.equal(muted.played.length, 0);
});
