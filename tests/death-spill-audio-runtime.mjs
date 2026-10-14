// Observe native Web Audio nodes from the production artifact in an opaque iframe.
// The debugger stages a fatal loss; production contains no test hook or fixture.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createMarketGameFixture } from './market-game-fixture.mjs';

const evidence = { artifact: 'Production build in opaque allow-scripts iframe; native Web Audio', scenarios: [], errors: [], external: [] };
const artifacts = new URL('../artifacts/', import.meta.url);
await mkdir(artifacts, { recursive: true });

function observeAudio() {
  const observed = window.spillAudioFixture = { voices: [], age: () => null };
  const connections = new WeakMap(), automation = new WeakMap(), records = new WeakMap();
  const nativeConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (destination, ...args) {
    connections.set(this, destination); return nativeConnect.call(this, destination, ...args);
  };
  for (const method of ['setValueAtTime', 'linearRampToValueAtTime']) {
    const native = AudioParam.prototype[method];
    AudioParam.prototype[method] = function (value, ...args) {
      automation.set(this, Math.max(value, automation.get(this) ?? 0));
      return native.call(this, value, ...args);
    };
  }
  const start = AudioBufferSourceNode.prototype.start, stop = AudioBufferSourceNode.prototype.stop;
  AudioBufferSourceNode.prototype.start = function (...args) {
    const pcm = this.buffer?.getChannelData(0) ?? [], envelope = connections.get(this);
    let fingerprint = 2166136261, peak = 0, energy = 0;
    for (const sample of pcm) {
      fingerprint = Math.imul(fingerprint ^ Math.round(sample * 1e6), 16777619);
      peak = Math.max(peak, Math.abs(sample)); energy += sample ** 2;
    }
    const spatial = connections.get(envelope);
    const record = {
      loop: this.loop, duration: this.buffer?.duration ?? 0, rate: this.playbackRate.value,
      age: observed.age(), at: performance.now(), fingerprint, peak,
      rms: Math.sqrt(energy / Math.max(1, pcm.length)),
      gain: automation.get(envelope?.gain) ?? envelope?.gain?.value ?? 0,
      pan: spatial?.pan?.value ?? 0, state: this.context.state, stops: 0, ended: false,
    };
    records.set(this, record); observed.voices.push(record);
    this.addEventListener('ended', () => { record.ended = true; });
    return start.apply(this, args);
  };
  AudioBufferSourceNode.prototype.stop = function (...args) {
    const record = records.get(this); if (record) record.stops++;
    return stop.apply(this, args);
  };
}

async function setup({ reduced = false } = {}) {
  const app = await createMarketGameFixture(evidence);
  await app.frame.evaluate(observeAudio);
  if (reduced) {
    await app.frame.locator('#choose').click(); await app.frame.locator('#camp-tab').click();
    await app.frame.locator('#reduced-motion').check(); await app.frame.locator('#close-drawer').click();
  }
  await app.frame.locator('#play').click();
  await app.frame.locator('#sound-toggle').click();
  await app.advance(350);
  // A held, real pointer gesture unlocks the browser audio context before death.
  await app.frame.locator('#character-call').click();
  await app.advance(32);
  assert.ok(await app.frame.evaluate(() => window.spillAudioFixture.voices.some(voice => voice.state === 'running')), 'the real audio context was unlocked by player input');
  return app;
}

async function lose(app, wallet, cosmetics = []) {
  return app.onGame(function (wallet, cosmetics) {
    if (!this.deathSpill && typeof this.advanceDeathVisuals !== 'function') throw new Error('Build the current death-spill implementation first');
    for (const row of this.rows.values()) Object.assign(row, { kind: 'meadow', blocked: [], decorations: [], coin: null });
    this.run.wallet = wallet; this.run.cosmetics = cosmetics; this.run.equipped = {};
    window.spillAudioFixture.beforeLoss = window.spillAudioFixture.voices.slice();
    window.spillAudioFixture.voices.length = 0;
    window.spillAudioFixture.age = () => this.deathSpill?.age ?? null;
    this.end('Audio spill fixture', 'traffic', 'front');
    return { wallet: this.deathSpill.wallet, drops: this.deathSpill.drops.map(drop => ({
      kind: drop.kind, item: drop.item?.id, amount: drop.amount,
      contacts: [drop.landing, drop.landing + drop.firstBounce, drop.landing + drop.firstBounce + drop.secondBounce],
    })) };
  }, wallet, cosmetics);
}

const voices = app => app.frame.evaluate(() => window.spillAudioFixture.voices.filter(voice => !voice.loop));
// These are actual PCM normalization levels, distinct from reward/death cues.
// Fingerprints below additionally prove the material recordings are different.
const material = voice => Math.abs(voice.peak - .15) < 1e-6 ? 'coin'
  : Math.abs(voice.peak - .10) < 1e-6 ? 'fabric'
    : Math.abs(voice.peak - .13) < 1e-6 ? 'trinket' : null;
const impacts = values => values.filter(voice => material(voice));
function checkAudible(values) {
  for (const voice of values) {
    assert.equal(voice.state, 'running'); assert.ok(voice.rms > 0);
    assert.ok(voice.gain > 0 && voice.gain <= 1, 'the effects are audible and gain remains bounded');
    assert.ok(Number.isFinite(voice.pan) && Math.abs(voice.pan) <= 1);
  }
}

let smallCount;
for (const wallet of [0, 1, 5000]) {
  const app = await setup();
  try {
    const snapshot = await lose(app, wallet);
    const earliest = Math.min(...snapshot.drops.map(drop => drop.contacts[0]));
    if (wallet) {
      await app.advance(Math.max(0, Math.floor((earliest - .06) * 1000)));
      assert.equal(impacts(await voices(app)).length, 0, 'coins stay silent until they reach the ground');
    }
    await app.advance(1450);
    const actual = await voices(app), spill = impacts(actual), death = actual.filter(voice => !material(voice));
    checkAudible(actual);
    assert.equal(death.length, 1, 'the fatal collision keeps its own contextual death cue');
    assert.equal(death[0].stops, 0, 'a busy spill never steals the death voice');
    assert.ok(await app.frame.evaluate(() => window.spillAudioFixture.voices.every(voice => !voice.loop)
      && window.spillAudioFixture.beforeLoss.filter(voice => voice.loop).every(voice => voice.stops || voice.ended)), 'death stops continuous gameplay layers and keeps them stopped');
    if (!wallet) assert.equal(spill.length, 0, 'an empty inventory has no spill sound');
    else {
      assert.ok(spill.length >= 2, 'a coin makes a landing and a quieter bounce');
      for (const voice of spill) {
        const contact = snapshot.drops.flatMap(drop => drop.contacts).filter(at => at <= voice.age + 1e-8).sort((a, b) => b - a)[0];
        assert.ok(contact !== undefined && voice.age - contact <= .055, 'each heard impact follows an actual contact within one visual frame');
        assert.equal(material(voice), 'coin');
      }
      if (wallet === 1) {
        smallCount = spill.length;
        assert.ok(spill.at(-1).gain < spill[0].gain, 'later bounces are quieter than the first landing');
      } else {
        assert.equal(snapshot.drops.length, 192, 'large wallets use bounded visual bodies');
        assert.equal(snapshot.drops.reduce((sum, drop) => sum + drop.amount, 0), wallet);
        assert.ok(spill.length > smallCount, 'a large wallet produces more clatter than one coin');
        assert.ok(spill.length < 32, 'thousands of dropped coins cannot flood the audio graph');
        assert.ok(new Set(spill.map(voice => `${voice.fingerprint}:${voice.rate}`)).size >= 2, 'larger clatter varies its metallic impacts');
      }
    }
    evidence.scenarios.push({ name: `Wallet ${wallet}`, snapshot: { wallet, bodies: snapshot.drops.length }, sounds: actual });
  } finally { await app.close(); }
}

{
  const app = await setup();
  try {
    await lose(app, 12, ['look-hat-beanie', 'look-shirt-sailor', 'look-halo']);
    await app.advance(1450);
    const actual = impacts(await voices(app)); checkAudible(actual);
    assert.deepEqual([...new Set(actual.map(material))].sort(), ['coin', 'fabric', 'trinket']);
    for (const type of ['coin', 'fabric', 'trinket']) {
      const own = new Set(actual.filter(voice => material(voice) === type).map(voice => voice.fingerprint));
      assert.ok(actual.filter(voice => material(voice) !== type).every(voice => !own.has(voice.fingerprint)), 'coins, clothing and trinkets use distinct actual recordings');
    }
    evidence.scenarios.push({ name: 'Coins, cloth and a halo', sounds: actual });
  } finally { await app.close(); }
}

{
  const app = await setup();
  try {
    await lose(app, 100);
    await app.advance(570);
    const before = await voices(app);
    assert.ok(impacts(before).length > 0, 'fixture interrupts an active spill');
    await app.frame.evaluate(() => window.dispatchEvent(new Event('blur')));
    const frozen = await app.onGame(function () { return this.deathSpill.age; });
    await app.advance(1500);
    assert.equal(await app.onGame(function () { return this.deathSpill.age; }), frozen);
    assert.equal((await voices(app)).length, before.length);
    assert.ok((await voices(app)).every(voice => voice.stops || voice.ended), 'blur stops all active audio');
    await app.frame.evaluate(() => window.dispatchEvent(new Event('focus')));
    await app.advance(950);
    const resumed = await voices(app);
    assert.ok(impacts(resumed.slice(before.length)).every(voice => voice.age >= frozen), 'focus resumes only contacts that have yet to happen');
    const settled = resumed.length; await app.advance(1500);
    assert.equal((await voices(app)).length, settled, 'settled belongings cannot replay impacts');
    evidence.scenarios.push({ name: 'Blur freezes, stops and resumes future contacts', frozen, sounds: resumed });
  } finally { await app.close(); }
}

{
  const app = await setup();
  try {
    await lose(app, 100);
    await app.advance(570);
    // Invoke the real mute button handler while the falling scene temporarily
    // hides the HUD; this tests the shared preference/lifecycle path.
    await app.frame.evaluate(() => document.getElementById('sound-toggle').click());
    const muted = await voices(app);
    assert.ok(muted.every(voice => voice.stops || voice.ended));
    await app.advance(1300);
    assert.equal((await voices(app)).length, muted.length, 'muting silences all subsequent landings');
    await app.frame.evaluate(() => document.getElementById('sound-toggle').click());
    await app.advance(350);
    assert.equal((await voices(app)).length, muted.length, 'unmuting does not replay impacts missed while muted');
    evidence.scenarios.push({ name: 'Mute consumes impacts without catch-up', sounds: muted });
  } finally { await app.close(); }
}

{
  const app = await setup({ reduced: true });
  try {
    await lose(app, 100, ['look-hat-beanie', 'look-halo']);
    await app.advance(32);
    const initial = await voices(app), spill = impacts(initial);
    assert.equal(await app.frame.locator('#result-content').isVisible(), true);
    assert.deepEqual([...new Set(spill.map(material))].sort(), ['coin', 'fabric', 'trinket']);
    assert.equal(spill.length, 3, 'Less motion gives one brief sound per material');
    assert.ok(spill.every(voice => voice.age <= .05), 'Less motion sounds accompany the settled display immediately');
    await app.frame.locator('#play').click(); await app.advance(1200);
    assert.equal(await app.frame.locator('#app').getAttribute('data-run-state'), 'playing');
    const after = await voices(app);
    assert.equal(impacts(after).length, spill.length, 'retry cancels old spill work');
    assert.ok(after.slice(0, initial.length).every(voice => voice.stops || voice.ended), 'retry stops old spill voices');
    await app.frame.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    const closed = (await voices(app)).length; await app.advance(1000);
    assert.equal((await voices(app)).length, closed, 'teardown cannot create late audio');
    evidence.scenarios.push({ name: 'Less motion, immediate retry and teardown', sounds: initial });
  } finally { await app.close(); }
}

assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
await writeFile(new URL('death-spill-audio-runtime.json', artifacts), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ artifact: evidence.artifact, scenarios: evidence.scenarios.map(({ name, sounds }) => ({ name, effects: sounds.length, impacts: impacts(sounds).length })), errors: evidence.errors, external: evidence.external }, null, 2));
