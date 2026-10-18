import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createMarketGameFixture } from './market-game-fixture.mjs';
import { artifactDirectoryForCoverage } from '../tools/release-coverage/browser.mjs';

const output = artifactDirectoryForCoverage(new URL('../artifacts/preference-hydration/', import.meta.url), 'preference-hydration');
await mkdir(output, { recursive: true });
const records = [];
after(async () => writeFile(new URL('preferences.json', output), JSON.stringify({
  provenance: 'Runtime-owned saved strings enter through actual SDK storage hydration. Assertions use visible game settings and user-triggered SDK persistence. No app state, parser, callback, pose or clock replacement.',
  scenarios: records,
}, null, 2)));
const defaults = { selected: 'butter', name: 'Butter', mode: 'arcade', reduced: false, muted: false,
  musicVolume: .6, ambienceVolume: .65, effectsVolume: 1, soundPack: 'pond', soundAddress: '' };
const scenarios = [
  { id: 'missing', raw: null },
  { id: 'malformed', raw: '{broken' },
  { id: 'wrong-types', raw: JSON.stringify({ best: -4, coins: '999', runs: 1.2, selected: 7, mode: 'unknown', reduced: 1,
    muted: 'false', musicVolume: 'loud', ambienceVolume: null, soundPack: 'unknown', soundAddress: 10 }) },
  { id: 'legacy-default-frog', raw: JSON.stringify({ selected: 'pip', mode: 'stroll', muted: true }), expected: { mode: 'stroll', muted: true } },
  { id: 'explicit-frog', raw: JSON.stringify({ travelerVersion: 2, selected: 'pip', mode: 'arcade', muted: true }), expected: { selected: 'pip', name: 'Pip', muted: true } },
  { id: 'locked-traveler', raw: JSON.stringify({ travelerVersion: 2, selected: 'beep', best: 74, coins: 0, muted: true }), expected: { muted: true } },
  { id: 'clamped-mix', raw: JSON.stringify({ travelerVersion: 2, selected: 'sunny', best: 100, coins: 200, runs: 4, strollBest: 9,
    world: 'home', mode: 'stroll', reduced: true, muted: true, musicVolume: 2, ambienceVolume: -1, effectsVolume: .35,
    soundPack: 'arcade', soundAddress: 'remembered' }), expected: { selected: 'sunny', name: 'Sunny', mode: 'stroll', reduced: true, muted: true,
      musicVolume: 1, ambienceVolume: 0, effectsVolume: .35, soundPack: 'arcade', soundAddress: 'remembered' } },
  { id: 'empty-custom-pack', raw: JSON.stringify({ soundPack: 'custom', soundAddress: '   ', muted: true }), expected: { soundAddress: '   ', muted: true } },
  { id: 'saved-optional-pack', raw: JSON.stringify({ soundPack: 'custom', soundAddress: 'naddr1saved-pack', muted: true }), expected: { soundPack: 'custom', soundAddress: 'naddr1saved-pack', muted: true } },
  { id: 'overlong-address', raw: JSON.stringify({ soundPack: 'custom', soundAddress: 'x'.repeat(2001), muted: true }), expected: { muted: true } },
];
for (const scenario of scenarios) test(`${scenario.id}: saved preferences hydrate visibly, remain playable, and persist normalized data`, { timeout: 40_000 }, async () => {
  const expected = { ...defaults, ...scenario.expected }, evidence = { errors: [], external: [] };
  const app = await createMarketGameFixture(evidence, { auditBoundary: true, progressRaw: scenario.raw });
  try {
    const f = app.frame;
    assert.equal(await f.locator('#traveler-name').innerText(), expected.name);
    assert.match(await f.locator('#mode').innerText(), expected.mode === 'arcade' ? /Arcade/ : /Stroll/);
    await f.locator('#choose').click(); await f.locator('#sounds-tab').click();
    assert.equal(await f.locator('#sound-pack').isVisible(), true);
    assert.equal(await f.locator('#sound-pack').inputValue(), expected.soundPack);
    await f.locator('#collection-next').click();
    assert.equal(await f.locator('#sound-muted').isVisible(), true);
    assert.equal(await f.locator('#sound-muted').isChecked(), expected.muted);
    for (const [name, key] of [['music', 'musicVolume'], ['ambience', 'ambienceVolume'], ['effects', 'effectsVolume']]) {
      await f.locator('#collection-next').click();
      assert.equal(await f.locator(`#${name}-volume`).isVisible(), true);
      assert.equal(await f.locator(`#${name}-volume`).inputValue(), String(Math.round(expected[key] * 100)));
      assert.equal(await f.locator(`#${name}-volume-value`).innerText(), `${Math.round(expected[key] * 100)}%`);
    }
    await f.locator('#collection-next').click(); await f.locator('#collection-next').click();
    assert.equal(await f.locator('#sound-address').isVisible(), true);
    assert.equal(await f.locator('#sound-address').inputValue(), expected.soundAddress);
    assert.equal(await f.locator('#sound-load').isDisabled(), true, 'missing optional pack domains disable only remote loading');
    await f.locator('#camp-tab').click();
    assert.equal(await f.locator('#reduced-motion').isChecked(), expected.reduced);
    await f.locator('#reduced-motion').click(); await app.advance(32);
    const writes = await f.evaluate(() => window.marketGameFixture.writes.filter(w => w.key === 'puddlehop.progress.v1'));
    assert.ok(writes.length > 0, 'a visible user action invokes real app persistence');
    const saved = JSON.parse(writes.at(-1).value);
    for (const [key, value] of Object.entries(expected)) if (key !== 'name')
      assert.deepEqual(saved[key], key === 'reduced' ? !value : value, key);
    assert.equal(saved.travelerVersion, 2);
    for (const key of ['best', 'strollBest', 'coins', 'runs']) assert.ok(Number.isSafeInteger(saved[key]) && saved[key] >= 0);
    await app.iframe.screenshot({ path: new URL(`${scenario.id}.png`, output).pathname });
    await f.locator('#close-drawer').click(); await f.locator('#play').click();
    await app.advance(32); await f.locator('[data-direction="forward"]').click(); await app.advance(250);
    assert.equal(await f.locator('#score').innerText(), '1');
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
    assert.deepEqual(await f.evaluate(() => window.marketGameFixture.forbidden), []);
    records.push({ id: scenario.id, expected, saved, errors: evidence.errors, external: evidence.external });
  } finally { await app.close(); }
});
