import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['coin-models', 'harmony', 'wearables', 'levels/v3', 'levels/index', 'run-seed', 'market/catalog']);
after(() => sources.dispose());
const { coinPickupModel } = await sources.import('coin-models');
const { musicHarmonyAt, MUSIC_LOOP_SECONDS, MUSIC_BAR_SECONDS } = await sources.import('harmony');
const { dressedModel } = await sources.import('wearables');
const { CHARACTERS, box } = await sources.import('content');
const { ITEM_CATALOG } = await sources.import('market/catalog');
const { generateLane } = await sources.import('levels/v3');
const { generateSeedLane } = await sources.import('levels/index');
const { createRunSeed } = await sources.import('run-seed');

test('legacy or unknown pickup appearances retain a visible ordinary coin', () => {
  const ordinary = coinPickupModel('coin');
  assert.ok(ordinary.length > 0);
  for (const id of [undefined, 'unknown-future-denomination']) {
    const model = coinPickupModel(id);
    assert.deepEqual(model, ordinary);
    assert.ok(model.every(v => [v.x, v.y, v.z, v.w, v.d, v.h].every(Number.isFinite)));
    assert.ok(model.every(v => v.w > 0 && v.d > 0 && v.h > 0));
  }
});

test('an invalid audio clock starts in key and a backward clock wraps the same score', () => {
  const first = musicHarmonyAt(0);
  assert.equal(first.scale, 'C Ionian');
  for (const clock of [NaN, Infinity, -Infinity]) assert.deepEqual(musicHarmonyAt(clock), first);
  for (const offset of [.125, MUSIC_BAR_SECONDS, MUSIC_LOOP_SECONDS - .125]) {
    assert.deepEqual(musicHarmonyAt(-offset), musicHarmonyAt(MUSIC_LOOP_SECONDS - offset));
    assert.deepEqual(musicHarmonyAt(offset + MUSIC_LOOP_SECONDS), musicHarmonyAt(offset));
  }
  assert.deepEqual(musicHarmonyAt(MUSIC_LOOP_SECONDS), first);
  assert.equal(musicHarmonyAt(-.125).scale, 'G Mixolydian');
});

function traveler(model) {
  return { ...CHARACTERS[0], id: 'authored-traveler', model: Object.freeze(model.map(Object.freeze)) };
}
const hat = ITEM_CATALOG.find(item => item.id === 'look-hat-boater');
const shirt = ITEM_CATALOG.find(item => item.id === 'look-shirt-sailor');
assert.ok(hat && shirt);

test('an authored traveler gets a hat above its head and a shirt without losing its face', () => {
  const body = box(0, 0, .1, .6, .5, .7, '#ccaa55');
  const face = box(0, -.3, .8, .2, .1, .2, '#223322');
  const character = traveler([body, face]);
  const before = structuredClone(character.model);
  const hatted = dressedModel(character, [hat]);
  const brim = hatted.slice(character.model.length);
  assert.ok(brim.length > 0);
  assert.ok(brim.every(v => v.z >= 1), 'hat rests above the highest body/face voxel');
  const dressed = dressedModel(character, [hat, shirt]);
  assert.ok(dressed.includes(face), 'authored face stays intact');
  assert.ok(dressed.some(v => v.color === shirt.appearance.color), 'shirt covers the lower body');
  assert.ok(dressed.some(v => v.color === body.color && v.z > body.z), 'upper body remains above the shirt');
  assert.ok(dressed.every(v => [v.x, v.y, v.z, v.w, v.d, v.h].every(Number.isFinite)));
  assert.deepEqual(character.model, before, 'preview fitting cannot modify the traveler asset');
});

test('small or empty authored models can preview clothing with finite positive geometry', () => {
  for (const model of [[], [box(0, 0, .2, .1, .1, .1, '#ffffff')]]) {
    const character = traveler(model);
    const dressed = dressedModel(character, [hat, shirt]);
    assert.ok(dressed.length > model.length);
    assert.ok(dressed.every(v => [v.x, v.y, v.z, v.w, v.d, v.h].every(Number.isFinite)));
    assert.ok(dressed.every(v => v.w > 0 && v.d > 0 && v.h > 0));
    assert.deepEqual(character.model, model);
  }
});

test('schema 3 callers that omit gentle mode reproduce the normal seeded course', () => {
  for (const seed of [0, 1, 0xffffffff]) for (const home of ['pond', 'shuffle']) {
    const normal = createRunSeed(seed, home, 'arcade', false, 3);
    for (const row of [-1, 0, 49, 50, 99, 100, 149, 150, 501]) {
      assert.deepEqual(generateLane(seed, row, home), generateSeedLane(normal, row));
    }
  }
});
