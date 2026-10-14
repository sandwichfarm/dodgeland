// SDK domain fixtures test the built napplet's integration. This is not a live
// relay or Paja test; tests/runtime-smoke.mjs covers the actual shell separately.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { chromium, firefox } from 'playwright';

const built = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
assert.ok(built.includes('sound-address'), 'Build the current napplet before running this suite.');
const author = 'a'.repeat(64);
const address = name => `30063:${author}:${name}`;
function wav(frames = 5_000) {
  const rate = 8_000, bytes = Buffer.alloc(44 + frames * 2);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 2, 28); bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++) bytes.writeInt16LE(Math.round(Math.sin(i * 0.14) * 8_000), 44 + i * 2);
  return bytes;
}
const bytes = wav(), musicBytes = wav(32_800);
const fixtures = {
  bytes: bytes.toString('base64'), hash: createHash('sha256').update(bytes).digest('hex'), author,
  musicBytes: musicBytes.toString('base64'), musicHash: createHash('sha256').update(musicBytes).digest('hex'), musicSize: musicBytes.length,
  ids: Object.fromEntries(['good', 'calls', 'music', 'bad-hash', 'denied', 'slow', 'saved'].map(name => [name, createHash('sha256').update(name).digest('hex')])),
};

function installFixture(config) {
  const native = window.AudioContext;
  const observed = window.fixture = { get effects() { return this.voices.filter(voice => !voice.loop); }, mount: config.mount, contexts: [], voices: [], queries: [], resources: [], decoded: [], writes: [], deferred: [], storagePending: [], actions: [], handlers: {}, saved: config.saved, hydrated: false };
  window.AudioContext = class extends native {
    constructor(options) { super(options); observed.contexts.push(this); }
    createBufferSource() {
      const source = super.createBufferSource(), voice = { starts: 0, stops: 0, ended: false, duration: 0, fingerprint: 0 };
      observed.voices.push(voice);
      const start = source.start.bind(source), stop = source.stop.bind(source);
      source.start = (...args) => {
        voice.starts++; voice.loop = source.loop; voice.duration = source.buffer?.duration ?? 0;
        voice.rate = source.playbackRate.value;
        voice.score = document.querySelector('#score')?.textContent;
        let fingerprint = 2166136261;
        const pcm = source.buffer?.getChannelData(0) ?? [];
        for (const sample of pcm) fingerprint = Math.imul(fingerprint ^ Math.round(sample * 1e6), 16777619);
        voice.fingerprint = fingerprint;
        // A horn's harmonic C4 reference survives every vehicle timbre. Measure
        // that tone from the real built PCM rather than identifying all traffic
        // by the one default sedan recording used by the audition button.
        if (!voice.loop && voice.duration > .1 && voice.duration < .6) {
          const step = 2 * Math.PI * (440 * 2 ** ((60 - 69) / 12)) / source.buffer.sampleRate;
          // Analyze one sustained pulse: separate honks can begin at different
          // oscillator phases and cancel in a whole-clip Fourier projection.
          const length = Math.floor(source.buffer.sampleRate * .035);
          let start = 0, loudest = 0;
          for (let at = 0; at + length < pcm.length; at += Math.floor(length / 4)) {
            let energy = 0;
            for (let i = at; i < at + length; i++) energy += pcm[i] ** 2;
            if (energy > loudest) { start = at; loudest = energy; }
          }
          let real = 0, imaginary = 0, power = 0;
          for (let i = start; i < start + length; i++) {
            real += pcm[i] * Math.cos(step * i); imaginary += pcm[i] * Math.sin(step * i);
            power += pcm[i] ** 2;
          }
          voice.hornTone = power ? 2 * (real ** 2 + imaginary ** 2) / (length * power) : 0;
        }
        return start(...args);
      };
      source.stop = (...args) => { voice.stops++; return stop(...args); };
      source.addEventListener('ended', () => { voice.ended = true; });
      return source;
    }
  };
  // Stable initial lanes keep gameplay input checks independent of random hazards.
  Math.random = () => 0;
  const event = (kind, id, tags) => ({ kind, id, pubkey: config.author, created_at: 1, tags, content: '', sig: '0'.repeat(128) });
  window.napplet = {};
  if (!config.missing) {
    window.addEventListener('keydown', event => { if (event.key.toLowerCase() === 'q') observed.handlers['puddlehop.call']?.(); });
    window.napplet.keys = {
      async registerAction(action) { observed.actions.push(action); return { actionId: action.id, binding: action.defaultKey }; },
      onAction(id, callback) { observed.handlers[id] = callback; return { close() { delete observed.handlers[id]; } }; },
      unregisterAction() {},
    };
    window.napplet.storage = {
      async getItem() {
        const snapshot = observed.saved;
        // Ordering assertions release this read explicitly after the user action;
        // browser/CI load must never decide whether hydration wins the race.
        if (config.deferStorage) await new Promise(resolve => observed.storagePending.push(resolve));
        observed.hydrated = true;
        return snapshot ?? null;
      },
      async setItem(key, value) {
        observed.saved = value; observed.writes.push({ key, value });
        parent.postMessage({ type: 'fixture:save', value }, '*');
      },
    };
    window.napplet.outbox = { async query(filters, options) {
      observed.queries.push({ filters, options });
      const filter = filters[0];
      if (filter.kinds[0] === 30063) {
        const name = filter['#d'][0], id = config.ids[name];
        const cues = name === 'music' ? ['music', 'hop'] : [name === 'calls' ? 'call.duck' : 'hop'];
        return { events: id ? [{ event: event(30063, 'f'.repeat(64), [['d', name], ['title', `Fixture ${name}`], ['puddlehop:sound-pack', '1'], ['e', id], ...cues.map(cue => ['puddlehop:cue', cue, id])]) }] : [] };
      }
      return { events: filter.ids.map(id => {
        const name = Object.keys(config.ids).find(name => config.ids[name] === id);
        return { event: event(1063, id, [['url', `https://fixture.invalid/${name}.wav`], ['m', 'audio/wav'], ['x', name === 'bad-hash' ? '0'.repeat(64) : name === 'music' ? config.musicHash : config.hash], ['size', String(name === 'music' ? config.musicSize : 10044)]]) };
      }) };
    } };
    window.napplet.resource = { async bytes(url) {
      observed.resources.push(url);
      if (url.includes('/denied.')) throw new Error('Fixture resource permission denied');
      // Deliberately ignore AbortSignal: stale completion must still be harmless.
      if (url.includes('/slow.')) await new Promise(resolve => observed.deferred.push(resolve));
      const buffer = Uint8Array.from(atob(url.includes('/music.') ? config.musicBytes : config.bytes), char => char.charCodeAt(0));
      return new Blob([buffer], { type: 'audio/wav' });
    } };
    window.napplet.common = { async decodeNip19(value) {
      observed.decoded.push(value);
      return { ok: true, nip19Type: 'naddr', kind: 30063, pubkey: config.author, identifier: 'good', relays: ['wss://relay.fixture.invalid', 'https://ignored.fixture.invalid'] };
    } };
  }
}

const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const harness = `<!doctype html><html><body style="margin:0"><iframe id="napplet" title="Sound integration fixture" sandbox="allow-scripts" style="border:0;width:900px;height:600px"></iframe><script>
const built = ${json(built)}, fixtures = ${json(fixtures)}, install = ${json(installFixture.toString())};
window.saved = null;
window.mountCount = 0;
window.addEventListener('message', event => { if (event.source === document.querySelector('iframe').contentWindow && event.data?.type === 'fixture:save') window.saved = event.data.value; });
window.mount = (options = {}) => {
  const config = { ...fixtures, saved: window.saved, ...options, mount: ++window.mountCount };
  const injected = '<script>(' + install + ')(' + JSON.stringify(config).replaceAll('<', '\\u003c') + ')<' + '/script>';
  document.querySelector('iframe').srcdoc = built.replace('<head>', '<head>' + injected);
  return config.mount;
};
window.mount();
</script></body></html>`;
const server = createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(harness);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
const errors = [], external = [];
try {
  const browserType = process.env.DOWN_TO_DUCK_AUDIO_BROWSER === 'firefox' ? firefox : chromium;
  browser = await browserType.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 720 } });
  page.setDefaultTimeout(5_000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
    external.push(route.request().url()); return route.abort();
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  async function currentFrame(mount) {
    const handle = await page.locator('#napplet').elementHandle();
    const frame = await handle.contentFrame();
    if (mount) await frame.waitForFunction(expected => window.fixture?.mount === expected, mount);
    await frame.locator('#sound-pack option[value="arcade"]').waitFor({ state: 'attached' });
    return frame;
  }
  async function remount(options = {}) {
    const mount = await page.evaluate(options => window.mount(options), options);
    const frame = await currentFrame(mount);
    if (!options.deferStorage && !options.missing) await frame.waitForFunction(() => window.fixture.hydrated);
    return frame;
  }
  async function releaseStorage(frame) {
    await frame.waitForFunction(() => window.fixture.storagePending.length === 1);
    assert.equal(await frame.evaluate(() => window.fixture.hydrated), false, 'saved preferences remain pending until the test releases them');
    await frame.evaluate(() => window.fixture.storagePending.splice(0).forEach(resolve => resolve()));
    await frame.waitForFunction(() => window.fixture.hydrated && !!window.fixture.handlers['puddlehop.call']);
  }
  async function collection(frame) {
    if (await frame.locator('#drawer').isVisible()) return;
    await frame.locator(await frame.locator('#choose').isVisible() ? '#choose' : '#collection').click();
  }
  async function section(frame, name) {
    await collection(frame);
    if (await frame.locator(`#${name}-tab`).isVisible()) await frame.locator(`#${name}-tab`).click();
    else { await frame.locator('#collection-sections').click(); await frame.locator(`button[data-collection-tab="${name}"]`).click(); }
  }
  async function sounds(frame) { await section(frame, 'sounds'); }
  async function soundPage(frame, name) {
    if (await frame.locator('#drawer').isVisible() && await frame.locator('#drawer').getAttribute('data-collection-tab') === 'sounds' && await frame.locator('#drawer').getAttribute('data-collection-sound') === name) return;
    await sounds(frame);
    for (let at = 0; at < ['pack', 'mute', 'music', 'ambience', 'effects', 'preview', 'shared'].indexOf(name); at++) await frame.locator('#collection-next').click();
  }
  async function traveler(frame, name) {
    await section(frame, 'travelers');
    for (let at = 0; at < 7 && await frame.locator('#collection-traveler-name').textContent() !== name; at++) await frame.locator('#collection-next').click();
    assert.equal(await frame.locator('#collection-traveler-name').textContent(), name);
    await frame.locator('#collection-traveler-select').click();
  }
  async function load(frame, name) {
    await soundPage(frame, 'shared');
    await frame.locator('#sound-address').fill(address(name));
    await frame.locator('#sound-load').click();
  }
  async function persisted(predicate) { await page.waitForFunction(predicate); }
  async function audibleCall(frame) {
    if (!(await frame.locator('#character-call').isVisible())) {
      if (await frame.evaluate(() => !!window.fixture.handlers['puddlehop.call'])) {
        const before = await frame.evaluate(() => window.fixture.effects.length);
        await frame.locator('#traveler-name').click(); await page.keyboard.press('q');
        if (browserType === firefox && await frame.evaluate(() => window.fixture.effects.length) === before) {
          await frame.waitForFunction(() => window.fixture.contexts[0]?.state === 'running');
          await frame.waitForTimeout(480); await page.keyboard.press('q');
        }
        return;
      }
      // Without shell keys, the visible Quack control is available during play.
      await frame.locator('#play').click();
    }
    if (browserType !== firefox) { await frame.locator('#character-call').click(); return; }
    // Firefox resumes asynchronously after pointerdown. Observe that real
    // activation rather than assuming the audio device is ready within 80 ms.
    const button = await frame.locator('#character-call').boundingBox();
    assert.ok(button);
    await page.mouse.move(button.x + button.width / 2, button.y + button.height / 2);
    await page.mouse.down();
    try { await frame.waitForFunction(() => window.fixture.contexts[0]?.state === 'running'); }
    finally { await page.mouse.up(); }
  }

  let frame = await currentFrame();
  console.log(`Audio integration browser: ${browserType.name()}; cancelAndHoldAtTime=${await frame.evaluate(() => typeof AudioParam.prototype.cancelAndHoldAtTime)}`);
  assert.equal(await frame.evaluate(() => location.origin), 'null', 'iframe is opaque');
  assert.equal(await frame.evaluate(() => !!crypto.subtle), true, 'fixture retains secure-context hashing');
  assert.equal(await frame.evaluate(() => window.fixture.contexts.length), 0, 'no audible context before gesture');
  assert.equal(await frame.locator('#world-label').textContent(), 'Apricot Grove', 'new players start with the duck in its home world');
  await frame.waitForFunction(() => !!window.fixture.handlers['puddlehop.call']);
  assert.equal(await frame.evaluate(() => window.fixture.actions.find(action => action.id === 'puddlehop.call').defaultKey), 'q');
  assert.equal(await frame.locator('#character-call').getAttribute('aria-label'), 'Make Butter quack (Q)');
  await audibleCall(frame);
  await frame.waitForFunction(() => window.fixture.effects.length === 1).catch(async error => {
    console.error('First-call audio state:', await frame.evaluate(() => ({ contexts: window.fixture.contexts.map(context => ({ state: context.state, time: context.currentTime })), effects: window.fixture.effects.length })), errors);
    throw error;
  });
  assert.equal(await frame.locator('#score').textContent(), '0', 'calling does not move or start a run');
  assert.equal(await frame.locator('#ready-content').isVisible(), true);
  const duckFingerprint = await frame.evaluate(() => {
    const fingerprint = window.fixture.effects.at(-1).fingerprint;
    window.fixture.handlers['puddlehop.call']();
    window.fixture.handlers['puddlehop.call']();
    return fingerprint;
  });
  assert.equal(await frame.evaluate(() => window.fixture.effects.length), 1, 'held/repeated action is bounded by the call cooldown');
  await frame.waitForTimeout(480);
  await frame.evaluate(() => window.fixture.handlers['puddlehop.call']());
  assert.equal(await frame.evaluate(() => window.fixture.effects.length), 2);
  assert.equal(await frame.evaluate(() => window.fixture.effects.at(-1).fingerprint), duckFingerprint, 'physical Q and the registered shell action play the same designated duck call');
  await frame.locator('#play').click();
  await frame.waitForFunction(() => window.fixture.contexts[0]?.state === 'running');
  await frame.waitForFunction(() => window.fixture.voices.some(voice => voice.loop && voice.duration >= 20 && !voice.stops && !voice.ended));
  await frame.waitForFunction(() => window.fixture.voices.some(voice => voice.loop && voice.duration >= 4 && voice.duration < 20 && !voice.stops && !voice.ended));
  const startingBeds = await frame.evaluate(() => window.fixture.voices.filter(voice => voice.loop && !voice.stops && !voice.ended).map(voice => voice.duration));
  assert.ok(startingBeds.some(duration => duration >= 20), 'starting a run starts the musical arrangement');
  assert.ok(startingBeds.some(duration => duration >= 4 && duration < 20), 'starting a run starts environmental ambience');
  await frame.waitForTimeout(480); await audibleCall(frame);
  assert.equal(await frame.evaluate(() => window.fixture.effects.at(-1).fingerprint), duckFingerprint, 'the visible Quack button uses the same designated duck call as Q');
  const movement = await frame.evaluate(() => {
    const before = window.fixture.effects.length;
    const forward = document.querySelector('[data-direction="forward"]');
    forward.click(); forward.click();
    return { sounds: window.fixture.effects.length - before, score: document.querySelector('#score').textContent };
  });
  assert.deepEqual(movement, { sounds: 1, score: '1' }, 'accepted hop sounds; repeated input during hop is silent');
  await frame.waitForTimeout(200);
  await frame.locator('[data-direction="forward"]').click();
  await frame.waitForFunction(() => document.querySelector('#score').textContent === '2');
  assert.deepEqual(errors, [], 'the first hop and subsequent scene updates keep the animation loop alive');
  await frame.locator('#sound-toggle').click();
  assert.equal(await frame.locator('#sound-toggle').getAttribute('aria-pressed'), 'true');
  const muted = await frame.evaluate(() => { const count = window.fixture.effects.length; document.querySelector('[data-direction="left"]').click(); return window.fixture.effects.length === count; });
  assert.equal(muted, true);
  assert.equal(await frame.evaluate(() => window.fixture.voices.every(voice => voice.stops || voice.ended)), true, 'mute stops music, ambience, passing vehicles and effects together');
  await persisted(() => JSON.parse(window.saved ?? '{}').muted === true);
  frame = await remount();
  assert.equal(await frame.locator('#sound-muted').isChecked(), true, 'mute survives napplet reload');
  assert.equal(await frame.evaluate(() => window.fixture.contexts.length), 0);
  await sounds(frame);
  await soundPage(frame, 'pack');
  await frame.locator('#sound-pack').selectOption('arcade');
  await soundPage(frame, 'mute');
  await frame.locator('#sound-muted').uncheck();
  await frame.waitForFunction(() => window.fixture.contexts[0]?.state === 'running');
  await soundPage(frame, 'preview');
  await frame.locator('#sound-preview').click();
  assert.ok(Math.abs(await frame.evaluate(() => window.fixture.effects.at(-1).duration) - 0.29) < 0.001, 'Pocket Arcade preview uses its own cue');
  console.log('✓ Opaque iframe audio activation, accepted hops, mute persistence and built-in preview');

  await load(frame, 'good');
  await frame.waitForFunction(() => document.querySelector('#sound-pack').value === 'custom').catch(async error => {
    console.error(await frame.evaluate(() => ({ status: document.querySelector('#sound-status').textContent, queries: window.fixture.queries, resources: window.fixture.resources })));
    throw error;
  });
  assert.match(await frame.locator('#sound-status').textContent(), /1\/35 sounds/, 'legacy packs retain their original cues with built-in calls and spill impacts as fallback');
  const loaded = await frame.evaluate(() => ({ queries: window.fixture.queries, resources: window.fixture.resources }));
  assert.deepEqual(loaded.queries[0].filters[0], { kinds: [30063], authors: [author], '#d': ['good'], limit: 10 });
  assert.deepEqual(loaded.queries[1].filters[0].ids, [fixtures.ids.good]);
  assert.deepEqual(loaded.resources, ['https://fixture.invalid/good.wav']);
  await soundPage(frame, 'preview');
  await frame.locator('#sound-preview').click();
  assert.ok(Math.abs(await frame.evaluate(() => window.fixture.effects.at(-1).duration) - 0.32) < 0.001, 'unmapped custom coin uses Pond fallback');
  await frame.locator('#close-drawer').click();
  await frame.locator('#play').click();
  await frame.locator('[data-direction="forward"]').click();
  assert.ok(Math.abs(await frame.evaluate(() => window.fixture.effects.at(-1).duration) - 0.625) < 0.001, 'gameplay uses downloaded, hashed and decoded hop');
  await sounds(frame);
  for (const name of ['bad-hash', 'denied']) {
    await load(frame, name);
    await frame.waitForFunction(() => document.querySelector('#sound-status').textContent.includes('No playable sounds'));
    assert.equal(await frame.locator('#sound-pack').inputValue(), 'custom', `${name} retains previous pack`);
  }
  await soundPage(frame, 'shared');
  await frame.locator('#sound-address').fill('nostr:naddr1fixture');
  await soundPage(frame, 'shared');
  await frame.locator('#sound-address').press('Enter');
  await frame.waitForFunction(() => document.querySelector('#sound-status').textContent.includes('Fixture good selected'));
  assert.deepEqual(await frame.evaluate(() => window.fixture.queries.at(-2).options.relays), ['wss://relay.fixture.invalid']);
  console.log('✓ SDK fixture list/file queries, resource hashing/decoding, custom playback, fallback and failures');

  await load(frame, 'slow');
  await frame.waitForFunction(() => window.fixture.deferred.length === 1);
  await soundPage(frame, 'pack');
  await frame.locator('#sound-pack').selectOption('arcade');
  await frame.evaluate(() => window.fixture.deferred.splice(0).forEach(resolve => resolve()));
  await frame.waitForTimeout(100);
  assert.equal(await frame.locator('#sound-pack').inputValue(), 'arcade', 'late custom load cannot replace a newer selection');
  await persisted(() => JSON.parse(window.saved ?? '{}').soundPack === 'arcade');

  // Unrelated early preferences must not erase stored sound preferences.
  const saved = JSON.stringify({ muted: true, soundPack: 'arcade', world: 'home' });
  frame = await remount({ saved, deferStorage: true });
  await frame.locator('#mode').click();
  await releaseStorage(frame);
  assert.equal(await frame.locator('#sound-muted').isChecked(), true);
  assert.equal(await frame.locator('#sound-pack').inputValue(), 'arcade');
  frame = await remount({ saved: JSON.stringify({ muted: true, soundPack: 'custom', soundAddress: address('saved') }), deferStorage: true });
  await sounds(frame); await load(frame, 'slow');
  assert.equal(await frame.evaluate(() => window.fixture.hydrated), false, 'the requested pack precedes delayed saved preferences');
  await frame.waitForFunction(() => window.fixture.deferred.length === 1);
  await releaseStorage(frame);
  await frame.evaluate(() => window.fixture.deferred.splice(0).forEach(resolve => resolve()));
  await frame.waitForFunction(() => document.querySelector('#sound-pack').value === 'custom');
  assert.match(await frame.locator('#sound-status').textContent(), /Fixture slow selected/);
  await persisted(() => JSON.parse(window.saved ?? '{}').soundAddress?.endsWith(':slow'));
  assert.equal(await frame.locator('#sound-muted').isChecked(), true, 'loading a different pack preserves saved mute');
  console.log('✓ Delayed loads and saved-preference hydration preserve the latest user intent');

  await soundPage(frame, 'mute');
  await frame.locator('#sound-muted').uncheck();
  await frame.locator('#close-drawer').click();
  await frame.locator('#play').click();
  await frame.waitForFunction(() => window.fixture.contexts[0]?.state === 'running');
  const paused = await frame.evaluate(() => {
    document.querySelector('[data-direction="forward"]').click();
    const voice = window.fixture.effects.at(-1);
    document.querySelector('#pause').click();
    return { stops: voice.stops, allStopped: window.fixture.voices.every(voice => voice.stops || voice.ended) };
  });
  assert.deepEqual(paused, { stops: 1, allStopped: true }, 'pause stops in-flight custom clip and every scene layer');
  await frame.locator('#play').click();
  await frame.waitForTimeout(170);
  const hidden = await frame.evaluate(() => {
    document.querySelector('[data-direction="left"]').click();
    const voice = window.fixture.effects.at(-1);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    return { stops: voice.stops, allStopped: window.fixture.voices.every(voice => voice.stops || voice.ended) };
  });
  assert.deepEqual(hidden, { stops: 1, allStopped: true }, 'backgrounding stops playback and every scene layer');
  await frame.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); });
  await sounds(frame);
  await soundPage(frame, 'preview');
  await frame.locator('#sound-preview').click();
  await frame.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await frame.waitForFunction(() => window.fixture.contexts.every(context => context.state === 'closed'));
  assert.equal(await frame.evaluate(() => window.fixture.effects.at(-1).stops), 1, 'teardown stops active preview');
  assert.equal(await frame.evaluate(() => window.fixture.voices.every(voice => voice.stops || voice.ended)), true, 'teardown stops every scene layer');
  assert.equal(await frame.evaluate(() => Object.keys(window.fixture.handlers).length), 0, 'teardown releases the call action with the other shortcuts');

  const legacyTraveler = { best: 81, strollBest: 42, coins: 202, runs: 11, selected: 'pip', world: 'home', mode: 'stroll', reduced: true, muted: false, soundPack: 'arcade', soundAddress: '' };
  frame = await remount({ saved: JSON.stringify(legacyTraveler) });
  await frame.waitForFunction(() => !!window.fixture.handlers['puddlehop.call']);
  assert.equal(await frame.locator('#traveler-name').textContent(), 'Butter', 'legacy frog defaults now show the duck');
  assert.equal(await frame.locator('#world-label').textContent(), 'Apricot Grove');
  assert.equal(await frame.locator('#coins').textContent(), '0', 'new run wallet starts empty; lifetime coins remain in saved progress');
  assert.equal(await frame.locator('#best').textContent(), 'STROLL BEST 42');
  assert.equal(await frame.locator('#character-call').getAttribute('aria-label'), 'Make Butter quack (Q)');
  assert.equal(await frame.locator('#ready-content').isVisible(), true);
  await audibleCall(frame);
  await frame.waitForFunction(() => window.fixture.effects.length === 1);
  const migratedQuack = await frame.evaluate(() => window.fixture.effects[0].fingerprint);
  await frame.waitForFunction(() => window.fixture.writes.some(({ value }) => JSON.parse(value).travelerVersion === 2));
  await persisted(() => { const save = JSON.parse(window.saved ?? '{}'); return save.travelerVersion === 2 && save.selected === 'butter' && save.coins === 202; });
  assert.deepEqual(await page.evaluate(() => JSON.parse(window.saved)), { ...legacyTraveler, selected: 'butter', travelerVersion: 2, musicVolume: 0.6, ambienceVolume: 0.65, effectsVolume: 1 }, 'boot saves the migration while retaining counters and preferences');
  frame = await remount();
  await frame.waitForFunction(() => !!window.fixture.handlers['puddlehop.call']);
  assert.equal(await frame.locator('#traveler-name').textContent(), 'Butter');
  assert.equal(await frame.locator('#coins').textContent(), '0', 'new run wallet starts empty; lifetime coins remain in saved progress');
  assert.equal(await frame.locator('#best').textContent(), 'STROLL BEST 42');
  assert.equal(await frame.locator('#ready-content').isVisible(), true);
  await audibleCall(frame);
  await frame.waitForFunction(() => window.fixture.effects.length === 1);
  assert.equal(await frame.evaluate(() => window.fixture.effects[0].fingerprint), migratedQuack, 'reloading the migrated save keeps the duck quack');
  await traveler(frame, 'Pip');
  await frame.locator('#close-drawer').click();
  await persisted(() => { const save = JSON.parse(window.saved ?? '{}'); return save.selected === 'pip' && save.travelerVersion === 2; });
  frame = await remount();
  await frame.waitForFunction(() => !!window.fixture.handlers['puddlehop.call']);
  assert.equal(await frame.locator('#traveler-name').textContent(), 'Pip', 'explicit frog selection survives the next reload');
  assert.equal(await frame.locator('#world-label').textContent(), 'Mosswater');
  assert.match(await frame.locator('#character-call').getAttribute('aria-label'), /^Make Pip .+ \(Q\)$/);
  assert.equal(await frame.locator('#coins').textContent(), '0', 'new run wallet starts empty; lifetime coins remain in saved progress');
  assert.equal(await frame.locator('#best').textContent(), 'STROLL BEST 42');

  frame = await remount({ saved: JSON.stringify(legacyTraveler), deferStorage: true });
  await traveler(frame, 'Pip');
  assert.equal(await frame.evaluate(() => window.fixture.hydrated), false, 'choice is made before the legacy save arrives');
  await frame.locator('#close-drawer').click();
  await releaseStorage(frame);
  assert.equal(await frame.locator('#traveler-name').textContent(), 'Pip', 'a new choice wins over the asynchronous migration');
  await frame.waitForFunction(() => window.fixture.writes.some(({ value }) => { const save = JSON.parse(value); return save.travelerVersion === 2 && save.selected === 'pip' && save.coins === 202; }));
  await persisted(() => { const save = JSON.parse(window.saved ?? '{}'); return save.travelerVersion === 2 && save.selected === 'pip' && save.coins === 202; });
  assert.deepEqual(await page.evaluate(() => JSON.parse(window.saved)), { ...legacyTraveler, travelerVersion: 2, musicVolume: 0.6, ambienceVolume: 0.65, effectsVolume: 1 }, 'early selection keeps the complete loaded progress');
  console.log('✓ Legacy duck migration persists, retains progress, and respects explicit and early traveler choices');

  for (const selected of ['unknown-traveler', 'pebble']) {
    frame = await remount({ saved: JSON.stringify({ selected, coins: 0 }) });
    await frame.waitForFunction(() => !!window.fixture.handlers['puddlehop.call']);
    assert.equal(await frame.locator('#character-call').getAttribute('aria-label'), 'Make Butter quack (Q)', 'invalid or unavailable saved travelers fall back to the free duck');
  }
  frame = await remount({ saved: JSON.stringify({ selected: 'butter', coins: 200, best: 200, mode: 'stroll' }) });
  await frame.waitForFunction(() => !!window.fixture.handlers['puddlehop.call']);
  const calls = new Set();
  for (const name of ['Butter', 'Sunny', 'Pip', 'Petal', 'Beep', 'Rust', 'Pebble']) {
    await traveler(frame, name);
    await frame.locator('#close-drawer').click();
    await frame.waitForTimeout(480);
    const count = await frame.evaluate(() => window.fixture.effects.length);
    await audibleCall(frame);
    await frame.waitForFunction(before => window.fixture.effects.length === before + 1, count);
    calls.add(await frame.evaluate(() => window.fixture.effects.at(-1).fingerprint));
    assert.match(await frame.locator('#character-call').getAttribute('aria-label'), new RegExp(`^Make ${name} .+ \\(Q\\)$`));
    assert.equal(await frame.locator('#score').textContent(), '0');
  }
  assert.equal(calls.size, 7, 'changing travelers immediately selects seven distinct character calls');
  await traveler(frame, 'Butter');
  await sounds(frame);
  await load(frame, 'calls');
  await frame.waitForFunction(() => document.querySelector('#sound-status').textContent.includes('Fixture calls selected'));
  const drawerCount = await frame.evaluate(() => {
    const before = window.fixture.effects.length;
    window.fixture.handlers['puddlehop.call']();
    return { before, after: window.fixture.effects.length };
  });
  assert.equal(drawerCount.before, drawerCount.after, 'the call shortcut is silent while collection is open');
  await frame.locator('#close-drawer').click();
  await frame.waitForTimeout(480);
  await audibleCall(frame);
  assert.ok(Math.abs(await frame.evaluate(() => window.fixture.effects.at(-1).duration) - 0.625) < 0.001, 'NIP-51 call.duck override is used by the dedicated call control');
  await frame.locator('#play').click();
  await frame.waitForTimeout(480);
  const active = await frame.evaluate(() => {
    const before = window.fixture.effects.length;
    window.fixture.handlers['puddlehop.call']();
    return { sounds: window.fixture.effects.length - before, score: document.querySelector('#score').textContent };
  });
  assert.deepEqual(active, { sounds: 1, score: '0' }, 'calling during play leaves the traveler in place');
  await frame.locator('#sound-toggle').click();
  await frame.waitForTimeout(480);
  const assertBlockedCall = async reason => {
    const counts = await frame.evaluate(() => {
      const before = window.fixture.effects.length;
      window.fixture.handlers['puddlehop.call']();
      document.querySelector('#character-call').click();
      return { before, after: window.fixture.effects.length };
    });
    assert.equal(counts.after, counts.before, reason);
  };
  await assertBlockedCall('mute silences both call input paths');
  await frame.locator('#sound-toggle').click();
  await frame.locator('#pause').click();
  await frame.waitForTimeout(480);
  await assertBlockedCall('paused play cannot emit character calls');
  await frame.locator('#play').click();
  await frame.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await assertBlockedCall('backgrounded play cannot emit character calls');
  await frame.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); });
  await frame.locator('#play').click();
  await page.locator('#napplet').evaluate(iframe => { iframe.style.width = '200px'; iframe.style.height = '160px'; });
  await frame.waitForTimeout(100);
  await assertBlockedCall('undersized frames cannot emit character calls');
  await page.locator('#napplet').evaluate(iframe => { iframe.style.width = '900px'; iframe.style.height = '600px'; });
  console.log('✓ Free default duck, preserved traveler choices, Q/button calls, cooldown, custom overrides and call-state guards');

  frame = await remount({ saved: JSON.stringify({ mode: 'stroll' }) });
  // Firefox resumes a new AudioContext asynchronously. A real held call press
  // unlocks via pointerdown before the cue-audition checks begin.
  if (browserType === firefox) await audibleCall(frame);
  await sounds(frame);
  assert.equal(await frame.locator('#sound-preview-cue option').count(), 35, 'every cue is available to audition');
  const previews = new Set(), auditionFingerprints = {};
  for (const cue of ['call.duck', 'call.chicken', 'train', 'train.pass', 'traffic.honk', 'death.traffic', 'death.train', 'death.water', 'death.wave', 'death.swept', 'death.trail', 'death.mob', 'mob.spawn', 'mob.attack', 'hurt.rear', 'hurt.side', 'health.restore', 'spill.coin', 'spill.fabric', 'spill.trinket']) {
    await soundPage(frame, 'preview');
    await frame.locator('#sound-preview-cue').selectOption(cue);
    await soundPage(frame, 'preview');
    await frame.locator('#sound-preview').click();
    const fingerprint = await frame.evaluate(() => window.fixture.effects.at(-1).fingerprint);
    previews.add(fingerprint); auditionFingerprints[cue] = fingerprint;
  }
  assert.equal(previews.size, 20, 'calls, crossings, horns, contextual deaths, mobs, health and the three spill materials have distinct actual audio');
  for (const [name, value] of [['music', '23'], ['ambience', '41'], ['effects', '76']]) {
    await soundPage(frame, name);
    await frame.locator(`#${name}-volume`).evaluate((slider, value) => { slider.value = value; slider.dispatchEvent(new Event('input', { bubbles: true })); slider.dispatchEvent(new Event('change', { bubbles: true })); }, value);
    assert.equal(await frame.locator(`#${name}-volume-value`).textContent(), `${value}%`);
  }
  await persisted(() => { const save = JSON.parse(window.saved ?? '{}'); return save.musicVolume === .23 && save.ambienceVolume === .41 && save.effectsVolume === .76; }).catch(async error => { console.error(await page.evaluate(() => window.saved), await frame.evaluate(() => window.fixture.writes.slice(-3))); throw error; });
  frame = await remount();
  for (const [name, value] of [['music', '23'], ['ambience', '41'], ['effects', '76']]) assert.equal(await frame.locator(`#${name}-volume`).inputValue(), value, 'individual mix levels survive reload');
  await frame.locator('#play').click();
  await frame.waitForFunction(() => window.fixture.voices.some(voice => voice.loop && !voice.stops));
  await sounds(frame);
  assert.equal(await frame.evaluate(() => window.fixture.voices.every(voice => voice.stops || voice.ended)), true, 'opening collection stops gameplay audio');
  const beforeDrawerWait = await frame.evaluate(() => window.fixture.voices.length);
  await frame.waitForTimeout(250);
  assert.equal(await frame.evaluate(() => window.fixture.voices.length), beforeDrawerWait, 'drawer does not restart the soundscape');
  console.log('✓ Complete cue audition, seven contextual deaths, three health cues, persisted mix levels and drawer silence');

  // Exercise the actual onEnd dispatch with gameplay inputs, without app debug globals.
  frame = await remount({ saved: JSON.stringify({ mode: 'arcade', soundPack: 'pond' }) });
  await frame.locator('#play').click();
  await frame.waitForFunction(() => !document.querySelector('#result-content').hidden, undefined, { timeout: 15_000 });
  assert.match(await frame.locator('#reason').textContent(), /wave caught you/);
  assert.equal(await frame.evaluate(() => window.fixture.effects.at(-1).fingerprint), auditionFingerprints['death.wave'], 'actual chasing-wave death dispatches its distinct cue');
  assert.equal(await frame.evaluate(() => window.fixture.voices.filter(voice => voice.loop && !voice.stops && !voice.ended).length), 0, 'death stops continuous scene audio');

  async function walk(directions, delay = 200) {
    await frame.evaluate(async ({ directions, delay }) => {
      for (const direction of directions) {
        if (!document.querySelector('#result-content').hidden) break;
        document.querySelector(`[data-direction="${direction}"]`).click();
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }, { directions, delay });
  }
  // Sunny has a road escape, so this still exercises a real fatal water path
  // without consuming Butter's newly introduced aquatic rescue first.
  frame = await remount({ saved: JSON.stringify({ selected: 'sunny', travelerVersion: 2, mode: 'arcade', soundPack: 'pond' }) });
  assert.equal(await frame.locator('#character-call').getAttribute('aria-label'), 'Make Sunny cluck (Q)');
  await frame.locator('#play').click();
  await walk(Array(5).fill('forward'));
  // Frame scheduling can place this landing on a log; deliberately step off its side.
  if (!(await frame.locator('#result-content').isVisible())) await walk(Array(6).fill('left'));
  await frame.locator('#result-content').waitFor({ state: 'visible' });
  assert.match(await frame.locator('#reason').textContent(), /Splash/);
  assert.equal(await frame.evaluate(() => window.fixture.effects.at(-1).fingerprint), auditionFingerprints['death.water'], 'falling between platforms dispatches the open-water splash');

  frame = await remount({ saved: JSON.stringify({ selected: 'butter', travelerVersion: 2, mode: 'arcade', soundPack: 'pond' }) });
  await frame.locator('#play').click();
  await walk(['forward', 'forward', 'forward', 'forward', 'left', 'forward', 'forward', 'right', 'forward', 'forward']);
  assert.equal(await frame.locator('#score').textContent(), '8', 'fixture reaches the safe verge before the road');
  await frame.waitForTimeout(1800);
  await walk(['forward']);
  await frame.locator('#result-content').waitFor({ state: 'visible' });
  assert.match(await frame.locator('#reason').textContent(), /traffic/i);
  assert.equal(await frame.evaluate(() => window.fixture.effects.at(-1).fingerprint), auditionFingerprints['death.traffic'], 'actual traffic collision dispatches its distinct impact');
  const gameplayEffects = await frame.evaluate(() => window.fixture.effects);
  const horns = gameplayEffects.filter(voice => voice.hornTone > .4);
  assert.ok(horns.length > 0, 'an approaching driver plays an actual tonal horn on the occupied road');
  assert.ok(horns.some(voice => voice.fingerprint !== auditionFingerprints['traffic.honk']), 'gameplay selects a vehicle-specific horn instead of repeating the default audition');
  for (const horn of horns) {
    const midi = 60 + 12 * Math.log2(horn.rate), note = Math.round(midi);
    assert.ok(Math.abs(midi - note) < 1e-5, 'the built mixer uses exact semitone pitch ratios');
    assert.ok(note >= 48 && note <= 72 && [0, 2, 4, 5, 7, 9, 11].includes(note % 12), 'the horn stays inside the two-octave shared scale');
    assert.equal(horn.score, '9', 'this fixture honks only after the traveler enters the road');
  }
  assert.equal(await frame.evaluate(() => window.fixture.voices.some(voice => voice.loop && voice.duration < 3)), true, 'nearby moving traffic has continuous passing sound');
  console.log('✓ Real gameplay wave, open-water and traffic deaths dispatch correct cues; approaching traffic passes and honks');

  frame = await remount({ saved: JSON.stringify({ mode: 'stroll' }) });
  await sounds(frame); await load(frame, 'music');
  await frame.waitForFunction(() => document.querySelector('#sound-status').textContent.includes('Fixture music selected'));
  assert.match(await frame.locator('#sound-status').textContent(), /1\/35 sounds/, 'shared long file binds to music but is rejected for the three-second hop cue');
  await soundPage(frame, 'preview');
  await frame.locator('#sound-preview-cue').selectOption('music'); await frame.locator('#sound-preview').click();
  assert.ok(Math.abs(await frame.evaluate(() => window.fixture.effects.at(-1).duration) - 4.1) < .001, 'long custom music can be auditioned');
  await frame.locator('#close-drawer').click(); await frame.locator('#play').click();
  await frame.waitForFunction(() => window.fixture.voices.some(voice => voice.loop && Math.abs(voice.duration - 4.1) < .001 && !voice.stops));
  await frame.locator('[data-direction="forward"]').click();
  assert.ok(Math.abs(await frame.evaluate(() => window.fixture.effects.at(-1).duration) - .1) < .001, 'hop retains built-in fallback when the shared custom file exceeds its cue limit');
  assert.equal(await frame.evaluate(() => window.fixture.resources.filter(url => url.includes('/music.')).length), 1, 'shared files are loaded and hashed only once');
  console.log('✓ Shared custom music file loops while oversized effect binding falls back safely');

  frame = await remount({ missing: true });
  assert.equal(await frame.locator('#character-call').textContent(), 'Quack', 'missing keyboard domain retains a correctly labeled call button');
  await audibleCall(frame);
  await frame.waitForFunction(() => window.fixture.effects.length === 1);
  assert.equal(await frame.locator('#score').textContent(), '0');
  await sounds(frame);
  assert.equal(await frame.locator('#sound-load').isDisabled(), true);
  await soundPage(frame, 'pack');
  await frame.locator('#sound-pack').selectOption('arcade');
  await frame.waitForFunction(() => window.fixture.contexts[0]?.state === 'running');
  await soundPage(frame, 'preview');
  await frame.locator('#sound-preview').click();
  assert.ok(await frame.evaluate(() => window.fixture.effects.length) > 0, 'missing optional domains retain built-in sound');
  await page.locator('#napplet').evaluate(iframe => { iframe.style.width = '240px'; iframe.style.height = '240px'; });
  await soundPage(frame, 'preview');
  const compact = await frame.locator('#sound-preview').evaluate(button => {
    const rect = button.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return { inside: rect.x >= 0 && rect.y >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight, reachable: button === hit || button.contains(hit), overflow: document.documentElement.scrollWidth > innerWidth };
  });
  assert.deepEqual(compact, { inside: true, reachable: true, overflow: false }, '240×240 Sounds controls remain reachable');
  console.log('✓ Pause, backgrounding, teardown and unavailable optional domains');
  assert.deepEqual(external, [], 'fixture suite made no external requests');
  assert.deepEqual(errors, [], 'no uncaught page errors');
  console.log('Sound integration fixture suite passed (no live relay claims).');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
