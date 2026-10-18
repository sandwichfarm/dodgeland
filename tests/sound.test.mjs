import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test, { after } from 'node:test';
import { chromium } from 'playwright';
import { compileSources } from './source-loader.mjs';
import { registerRealm, collectRealm } from '../tools/release-coverage/browser.mjs';

// Coverage auditions are separate evidence; ordinary artifact paths stay exact.
const coverageConfig=process.env.DOWN_TO_DUCK_COVERAGE_CONFIG
  ? JSON.parse(await readFile(process.env.DOWN_TO_DUCK_COVERAGE_CONFIG,'utf8')) : null;
const artifactRoot=coverageConfig
  ? pathToFileURL(join(coverageConfig.payloadDirectory,'suite-artifacts/sound/'))
  : new URL('../artifacts/',import.meta.url);
await mkdir(artifactRoot,{recursive:true});
const directory = await mkdtemp(join(tmpdir(), 'down-to-duck-sound-test-'));
await writeFile(join(directory, 'package.json'), '{"type":"module"}');
const modules = new Map([...await compileSources(['audio','sound-packs'])].map(([name,code])=>[name.slice(1,-3),code]));
for(const [name,code] of modules) await writeFile(join(directory,`${name}.js`),code);
after(() => rm(directory, { recursive: true, force: true }));
const { parseSoundPack, parseSoundFile, parsePackAddress, MAX_SOUND_BYTES } = await import(pathToFileURL(join(directory, 'sound-packs.js')));
const { GameAudio, SOUND_CUES, GAME_SOUND_CUES, CHARACTER_CALL_CUES, SCENE_SOUND_CUES, MOB_SOUND_CUES, DEATH_SOUND_CUES, HEALTH_SOUND_CUES, SPILL_SOUND_CUES, BUILTIN_PACKS } = await import(pathToFileURL(join(directory, 'audio.js')));
const author = 'a'.repeat(64);
const fileId = 'b'.repeat(64);
const hash = 'c'.repeat(64);
function event(kind, tags) { return { kind, tags, pubkey: author, id: 'd'.repeat(64), content: '', created_at: 1, sig: 'e'.repeat(128) }; }
function pack(extra = []) { return event(30063, [['d', 'pond'], ['title', 'Pond Choir'], ['description', 'Friendly pond sounds'], ['puddlehop:sound-pack', '1'], ['e', fileId], ['puddlehop:cue', 'hop', fileId], ...extra]); }
function file(extra = []) { return event(1063, [['url', 'https://sounds.example/hop.wav'], ['m', 'audio/wav'], ['x', hash], ...extra]); }
function replaceTag(source, name, values) { return { ...source, tags: [...source.tags.filter(tag => tag[0] !== name), ...(values ? [[name, ...values]] : [])] }; }

test('NIP-51 sound lists bind semantic cues to included files and preserve partial packs', () => {
  assert.deepEqual([...GAME_SOUND_CUES], ['hop', 'coin', 'crash', 'splash', 'train', 'idle']);
  assert.deepEqual([...CHARACTER_CALL_CUES], ['call.duck', 'call.chicken', 'call.frog', 'call.axolotl', 'call.robot', 'call.fox', 'call.penguin']);
  assert.deepEqual([...SCENE_SOUND_CUES], ['music', 'ambience.wind', 'ambience.water', 'ambience.birds', 'traffic.pass', 'traffic.honk', 'train.pass']);
  assert.deepEqual([...MOB_SOUND_CUES], ['mob.spawn', 'mob.attack']);
  assert.deepEqual([...DEATH_SOUND_CUES], ['death.traffic', 'death.train', 'death.water', 'death.wave', 'death.swept', 'death.trail', 'death.mob']);
  assert.deepEqual([...HEALTH_SOUND_CUES], ['hurt.rear', 'hurt.side', 'health.restore']);
  assert.deepEqual([...SPILL_SOUND_CUES], ['spill.coin', 'spill.fabric', 'spill.trinket']);
  assert.deepEqual([...SOUND_CUES], [...GAME_SOUND_CUES, ...CHARACTER_CALL_CUES, ...SCENE_SOUND_CUES, ...MOB_SOUND_CUES, ...DEATH_SOUND_CUES, ...HEALTH_SOUND_CUES, ...SPILL_SOUND_CUES]);
  const input = pack([['puddlehop:cue', 'future-cue', 'ignored']]);
  const before = JSON.stringify(input);
  assert.deepEqual(parseSoundPack(input), { name: 'Pond Choir', description: 'Friendly pond sounds', cues: { hop: fileId } });
  assert.equal(JSON.stringify(input), before);
  assert.equal(parseSoundPack(replaceTag(input, 'title', null)).name, 'pond');
  const allCues = pack().tags.filter(tag => tag[0] !== 'puddlehop:cue');
  assert.deepEqual(Object.keys(parseSoundPack(event(30063, [...allCues, ...SOUND_CUES.map(cue => ['puddlehop:cue', cue, fileId])])).cues), [...SOUND_CUES]);
  assert.deepEqual(parseSoundPack(replaceTag(pack(), 'puddlehop:cue', ['call.duck', fileId])).cues, { 'call.duck': fileId }, 'a call-only pack is valid without changing the v1 schema');
  assert.deepEqual(parseSoundPack(replaceTag(pack(), 'puddlehop:cue', ['call.chicken', fileId])).cues, { 'call.chicken': fileId }, 'new traveler calls remain optional v1 pack extensions');
  for (const cue of HEALTH_SOUND_CUES) {
    assert.deepEqual(parseSoundPack(replaceTag(pack(), 'puddlehop:cue', [cue, fileId])).cues, { [cue]: fileId }, 'health cues extend the same partial-pack schema');
  }
  for (const cue of SPILL_SOUND_CUES) {
    assert.deepEqual(parseSoundPack(replaceTag(pack(), 'puddlehop:cue', [cue, fileId])).cues, { [cue]: fileId }, 'material impacts are optional additions to v1 packs');
  }
});

test('sound lists reject incompatible, ambiguous, unbounded and dangling cue definitions', () => {
  const invalid = [
    null, {}, { ...pack(), kind: 30000 },
    replaceTag(pack(), 'd', null), replaceTag(pack(), 'd', ['x'.repeat(201)]),
    replaceTag(pack(), 'puddlehop:sound-pack', null), replaceTag(pack(), 'puddlehop:sound-pack', ['2']),
    pack([['puddlehop:sound-pack', '1']]), pack([['d', 'other']]),
    pack([['puddlehop:cue', 'hop', fileId]]), replaceTag(pack(), 'e', null),
    replaceTag(pack(), 'puddlehop:cue', ['hop', 'bad-id']),
    replaceTag(pack(), 'puddlehop:cue', ['hop', fileId.toUpperCase()]),
    replaceTag(pack(), 'puddlehop:cue', ['future-cue', fileId]),
    { ...pack(), tags: [['d', 4]] }, { ...pack(), tags: Array.from({ length: 129 }, () => ['e', fileId]) },
  ];
  invalid.forEach((input, i) => assert.throws(() => parseSoundPack(input), Error, `invalid sound list ${i}`));
});

test('file metadata accepts bounded audio with HTTPS or Blossom addresses and requires integrity', () => {
  assert.deepEqual(parseSoundFile(file([['size', String(MAX_SOUND_BYTES)]])), { url: 'https://sounds.example/hop.wav', mime: 'audio/wav', hash });
  assert.equal(parseSoundFile(replaceTag(file(), 'url', [`blossom:sha256:${hash}`])).url, `blossom:sha256:${hash}`);
  assert.equal(parseSoundFile(replaceTag(file(), 'm', ['audio/ogg'])).mime, 'audio/ogg');
  const invalid = [
    { ...file(), kind: 1 }, replaceTag(file(), 'url', null),
    ...['http://sounds.example/hop.wav', 'data:audio/wav;base64,AAAA', 'javascript:alert(1)', 'https://user:secret@sounds.example/hop.wav', 'blossom:sha256:nope'].map(url => replaceTag(file(), 'url', [url])),
    replaceTag(file(), 'm', ['text/html']), replaceTag(file(), 'm', null),
    replaceTag(file(), 'x', null), replaceTag(file(), 'x', ['not-a-hash']),
    file([['url', 'https://other.example/hop.wav']]),
    ...['0', '-1', '1.5', 'NaN', String(MAX_SOUND_BYTES + 1)].map(size => file([['size', size]])),
  ];
  invalid.forEach((input, i) => assert.throws(() => parseSoundFile(input), Error, `invalid sound file ${i}`));
});

test('pack addresses preserve colon-containing identifiers and reject the wrong kind or author', () => {
  assert.deepEqual(parsePackAddress(`  30063:${author}:pond:v1  `), { pubkey: author, identifier: 'pond:v1', relays: [] });
  assert.equal(parsePackAddress(`30063:${author}:${'x'.repeat(200)}`).identifier.length, 200);
  for (const input of [`30000:${author}:pond`, `30063:${author.toUpperCase()}:pond`, `30063:invalid:pond`, `30063:${author}:`, `30063:${author}:${'x'.repeat(201)}`, 'naddr1invalid']) {
    assert.throws(() => parsePackAddress(input), Error);
  }
});

test('missing browser audio capabilities preserve silent gameplay and give an explicit decode error', async () => {
  assert.equal(typeof globalThis.AudioContext, 'undefined');
  assert.equal(typeof globalThis.OfflineAudioContext, 'undefined');
  const audio = new GameAudio();
  await audio.prepare();
  audio.unlock();
  audio.play('hop');
  audio.syncLoops([{ id: 'road', cue: 'traffic.pass', gain: .4 }]);
  audio.setMix({ music: .5, ambience: .2, effects: 1 });
  await assert.rejects(audio.decode(new Uint8Array([1, 2, 3]).buffer), /Audio decoding is unavailable/);
  audio.dispose();
  await audio.prepare();
  audio.unlock();
  audio.play('call.duck');
  await assert.rejects(audio.decode(new Uint8Array([1]).buffer), /Audio has been closed/);
});

test('an offline decode completing after disposal cannot return a clip or retain the caller buffer', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'OfflineAudioContext');
  let resolveDecode, received, contexts = 0;
  // Only the browser decoder is deferred. The production GameAudio owns the
  // request, input copy and disposal check, without any playback capability.
  globalThis.OfflineAudioContext = class {
    constructor(channels, length, rate) {
      assert.deepEqual([channels, length, rate], [1, 1, 44_100]);
      contexts++;
    }
    decodeAudioData(bytes) {
      received = bytes;
      return new Promise(resolve => { resolveDecode = resolve; });
    }
  };
  const audio = new GameAudio(), input = new Uint8Array([1, 2, 3, 4]);
  try {
    const pending = audio.decode(input.buffer);
    assert.equal(contexts, 1);
    assert.notEqual(received, input.buffer);
    assert.deepEqual([...new Uint8Array(received)], [1, 2, 3, 4]);
    input.fill(9);
    assert.deepEqual([...new Uint8Array(received)], [1, 2, 3, 4]);
    audio.dispose();
    // Accessing decoded data would mean the stale completion crossed teardown.
    const decoded = new Proxy({}, { get(_target, key) {
      if (key === 'then') return undefined; // Promise resolution checks thenability.
      throw new Error('stale decoded data was inspected');
    } });
    resolveDecode(decoded);
    await assert.rejects(pending, /Audio has been closed/);
    assert.equal(contexts, 1);
  } finally {
    audio.dispose();
    if (original) Object.defineProperty(globalThis, 'OfflineAudioContext', original);
    else delete globalThis.OfflineAudioContext;
  }
});

let browser;
let scenario=0;
const audioRealms=new WeakMap();
const moduleServer = createServer((request, response) => {
  const name = request.url?.slice(1).replace(/\.js$/, '');
  const source = modules.get(name);
  response.writeHead(source ? 200 : 404, { 'Content-Type': 'text/javascript' });
  response.end(source ?? '');
});
const moduleReady = new Promise(resolve => moduleServer.listen(0, '127.0.0.1', resolve));
after(async () => { await browser?.close(); await new Promise(resolve => moduleServer.close(resolve)); });
async function audioPage() {
  await moduleReady;
  browser ??= await chromium.launch({ args: ['--mute-audio'] });
  const page = await browser.newPage();
  const identity={suite:process.argv[1],scenario:`audio-${scenario++}`,frame:'component-page',generation:0,scope:'current'};
  audioRealms.set(page,identity);registerRealm(page,identity);
  await page.goto(`http://127.0.0.1:${moduleServer.address().port}`);
  await page.setContent('<button id="unlock">Enable sound</button>');
  await page.evaluate(async () => { window.audioModule = await import('/audio.js'); });
  return page;
}
async function closeAudioPage(page){try{await collectRealm(page,audioRealms.get(page));}finally{await page.close();}}

test('both packs render every cue with distinct finite PCM, complete musical phrases and seamless beds', async () => {
  const page = await audioPage();
  try {
    const rendered = await page.evaluate(async () => {
      const { SOUND_CUES, BUILTIN_PACKS, renderBuiltinCue, builtinBuffer } = window.audioModule;
      const results = [];
      for (const pack of BUILTIN_PACKS) for (const cue of SOUND_CUES) {
        const probe = new OfflineAudioContext(2, 1, 24_000);
        const raw = builtinBuffer(probe, cue, pack.id);
        const context = new OfflineAudioContext(2, Math.ceil((raw.duration + 0.15) * 24_000), 24_000);
        const voice = renderBuiltinCue(context, cue, pack.id);
        const buffer = await context.startRendering();
        await voice.ended;
        const samples = buffer.getChannelData(0), frameLength = Math.ceil(raw.duration * 24_000);
        let peak = 0, energy = 0, tail = 0, fingerprint = 2166136261;
        const windows = [];
        for (let start = 0; start < frameLength; start += 24_000) {
          let windowEnergy = 0;
          for (let i = start; i < Math.min(start + 24_000, frameLength); i++) windowEnergy += samples[i] ** 2;
          windows.push(Math.sqrt(windowEnergy / Math.min(24_000, frameLength - start)));
        }
        for (let i = 0; i < samples.length; i++) {
          const sample = samples[i];
          if (!Number.isFinite(sample)) throw new Error(`${pack.id}/${cue} has non-finite PCM`);
          peak = Math.max(peak, Math.abs(sample)); energy += sample * sample;
          if (i > frameLength + 64) tail = Math.max(tail, Math.abs(sample));
          fingerprint = Math.imul(fingerprint ^ Math.round(sample * 1e6), 16777619);
        }
        const pcm = raw.getChannelData(0);
        results.push({ pack: pack.id, cue, duration: raw.duration, peak, rms: Math.sqrt(energy / samples.length), tail, fingerprint,
          seam: Math.abs(pcm[0] - pcm.at(-1)), windows });
      }
      return results;
    });
    assert.equal(rendered.length, SOUND_CUES.length * BUILTIN_PACKS.length);
    for (const cue of rendered) {
      assert.ok(cue.peak > 0.001 && cue.peak < 0.5, `${cue.pack}/${cue.cue}: audible with mixing headroom (${cue.peak})`);
      assert.ok(cue.rms > 0.0001, `${cue.pack}/${cue.cue}: non-silent PCM`);
      assert.equal(cue.tail, 0, `${cue.pack}/${cue.cue}: one-shot rendering releases fully`);
      if (cue.cue.startsWith('mob.') || cue.cue === 'death.mob') {
        assert.ok(cue.duration <= 1, `${cue.pack}/${cue.cue}: creature cues remain short during pursuit`);
        assert.ok(cue.seam < 0.00001, `${cue.pack}/${cue.cue}: no abrupt cut at either end`);
      }
      if (HEALTH_SOUND_CUES.includes(cue.cue)) {
        assert.ok(cue.duration <= .7, `${cue.pack}/${cue.cue}: recovery and nonfatal impacts stay brief`);
        assert.ok(cue.seam < .00001, `${cue.pack}/${cue.cue}: no abrupt cut at either end`);
      }
      if (['music', 'ambience.wind', 'ambience.water', 'traffic.pass', 'train.pass'].includes(cue.cue)) {
        assert.ok(cue.seam < 0.003, `${cue.pack}/${cue.cue}: loop seam is click-free (${cue.seam})`);
      }
      if (cue.cue === 'music') {
        assert.ok(cue.duration >= 20, 'music has a full multi-phrase arrangement');
        assert.ok(cue.windows.every(rms => rms > 0.0001), 'music carries through the whole arrangement');
        assert.ok(new Set(cue.windows.map(rms => rms.toFixed(4))).size >= 6, 'phrases vary in orchestration and energy');
      }
    }
    assert.equal(new Set(rendered.map(cue => cue.fingerprint)).size, rendered.length, 'every semantic cue and pack renders distinguishable PCM');
    for (const pack of BUILTIN_PACKS) {
      const cue = name => rendered.find(result => result.pack === pack.id && result.cue === name);
      assert.ok(cue('hurt.rear').peak < cue('hurt.side').peak, 'rear bumper tap is gentler than a side collision');
      assert.ok(cue('hurt.side').peak < cue('death.traffic').peak, 'survivable collisions remain less forceful than fatal traffic');
      assert.ok(cue('hurt.rear').duration < cue('hurt.side').duration && cue('hurt.side').duration < cue('death.traffic').duration, 'short recoverable impacts have no fatal debris tail');
    }
    await mkdir(artifactRoot, { recursive: true });
    await writeFile(new URL('sound-quality.json', artifactRoot), JSON.stringify(rendered, null, 2) + '\n');
    assert.equal(await page.evaluate(async () => {
      const context = new OfflineAudioContext(1, 22_050, 44_100);
      const voice = window.audioModule.renderBuiltinCue(context, 'train', 'pond');
      voice.stop(); voice.stop(); await voice.ended;
      const rendered = await context.startRendering();
      return rendered.getChannelData(0).every(sample => sample === 0);
    }), true, 'stopping a scheduled voice is safe and leaves no audio');
  } finally { await closeAudioPage(page); }
});

test('Sunny has two short clucks, and old or partial sound packs retain the built-in chicken call', async () => {
  const page = await audioPage();
  try {
    await page.evaluate(() => {
      const Native = window.AudioContext;
      window.chickenSources = [];
      window.AudioContext = class extends Native {
        createBufferSource() {
          const source = super.createBufferSource(); window.chickenSources.push(source); return source;
        }
      };
      window.chickenAudio = new window.audioModule.GameAudio();
      document.querySelector('button').onclick = () => window.chickenAudio.unlock();
    });
    await page.locator('#unlock').click();
    const result = await page.evaluate(() => {
      const { builtinBuffer } = window.audioModule, audio = window.chickenAudio;
      const context = new OfflineAudioContext(1, 1, 22_050);
      const calls = ['pond', 'arcade'].map(pack => {
        const buffer = builtinBuffer(context, 'call.chicken', pack), pcm = buffer.getChannelData(0);
        const rms = (from, to) => {
          const samples = pcm.subarray(Math.floor(from * buffer.sampleRate), Math.floor(to * buffer.sampleRate));
          return Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
        };
        return { pack, duration: buffer.duration, first: rms(.025, .095), second: rms(.255, .325), gap: rms(.16, .23),
          endpoints: [pcm[0], pcm.at(-1)] };
      });
      const imported = context.createBuffer(1, 3000, 22_050);
      audio.setClips({ hop: imported }, 'arcade'); audio.play('call.chicken');
      const source = window.chickenSources.at(-1);
      const fallback = source.buffer === builtinBuffer(source.context, 'call.chicken', 'arcade');
      audio.setClips({ 'call.chicken': imported }); audio.play('call.chicken');
      const override = window.chickenSources.at(-1).buffer === imported;
      audio.dispose();
      return { calls, fallback, override };
    });
    assert.equal(result.fallback, true, 'an older partial pack still gives Sunny a cluck');
    assert.equal(result.override, true, 'a chicken cue can be replaced independently');
    for (const call of result.calls) {
      assert.ok(call.duration < .5, `${call.pack}: a brief call leaves room for warnings`);
      assert.ok(call.first > .01 && call.second > .01, `${call.pack}: both clucks are audible`);
      assert.equal(call.gap, 0, `${call.pack}: distinct clucks have a quiet gap`);
      assert.deepEqual(call.endpoints, [0, 0], `${call.pack}: click-free endpoints`);
    }
  } finally { await closeAudioPage(page); }
});

test('spill impacts render brief material-specific PCM, bounded variations and a playable audition', async () => {
  const page = await audioPage();
  try {
    const result = await page.evaluate(async () => {
      const { builtinBuffer, renderBuiltinCue, SPILL_SOUND_CUES } = window.audioModule;
      const probe = new OfflineAudioContext(1, 1, 22_050), rows = [], audition = [];
      function centroid(pcm, rate) {
        const size = 512;
        let total = 0, weighted = 0;
        for (let start = 0; start + size < Math.min(pcm.length, rate * .16); start += size) {
          for (let bin = 1; bin < size / 2; bin++) {
            let re = 0, im = 0;
            for (let i = 0; i < size; i++) {
              const value = pcm[start + i] * (.5 - .5 * Math.cos(2 * Math.PI * i / (size - 1)));
              const phase = 2 * Math.PI * bin * i / size;
              re += value * Math.cos(phase); im += value * Math.sin(phase);
            }
            const power = re * re + im * im;
            total += power; weighted += power * bin * rate / size;
          }
        }
        return weighted / total;
      }
      for (const pack of ['pond', 'arcade']) for (const cue of SPILL_SOUND_CUES) {
        const original = builtinBuffer(probe, cue, pack);
        if (builtinBuffer(probe, cue, pack, 'light') !== original || builtinBuffer(probe, cue, pack, 'arbitrary') !== original) throw new Error('unbounded variant cache');
        for (const variant of ['light', 'mid', 'heavy']) {
          const raw = builtinBuffer(probe, cue, pack, variant), pcm = raw.getChannelData(0);
          const context = new OfflineAudioContext(1, Math.ceil(.5 * 22_050), 22_050);
          const voice = renderBuiltinCue(context, cue, pack, context.destination, { variant });
          const rendered = await context.startRendering(); await voice.ended;
          const output = rendered.getChannelData(0);
          let peak = 0, power = 0, tail = 0, fingerprint = 2166136261;
          for (let i = 0; i < output.length; i++) {
            const sample = output[i];
            if (!Number.isFinite(sample)) throw new Error('non-finite spill PCM');
            peak = Math.max(peak, Math.abs(sample)); power += sample * sample;
            if (i > raw.length + 32) tail = Math.max(tail, Math.abs(sample));
            fingerprint = Math.imul(fingerprint ^ Math.round(sample * 1e6), 16777619);
            audition.push(Math.round(sample * 32767));
          }
          rows.push({ pack, cue, variant, duration: raw.duration, peak, rms: Math.sqrt(power / output.length),
            centroid: centroid(output, 22_050), tail, endpoints: [pcm[0], pcm.at(-1)], fingerprint });
        }
      }
      return { rows, audition };
    });
    assert.equal(result.rows.length, 18);
    assert.equal(new Set(result.rows.map(row => row.fingerprint)).size, 18, 'each material, weight and pack has a distinct impact');
    for (const row of result.rows) {
      assert.ok(row.duration <= .28, `${row.pack}/${row.cue}/${row.variant}: short enough for a bounded impact cascade`);
      assert.ok(row.peak > .025 && row.peak <= .151, 'quiet individual contacts preserve headroom for overlapping drops');
      assert.ok(row.rms > .002, 'a real audible impact is rendered');
      assert.equal(row.tail, 0, 'the impact releases fully');
      assert.ok(row.endpoints.every(sample => sample === 0), 'no discontinuous PCM endpoints');
    }
    for (const pack of ['pond', 'arcade']) for (const variant of ['light', 'mid', 'heavy']) {
      const cue = name => result.rows.find(row => row.pack === pack && row.variant === variant && row.cue === name);
      assert.ok(cue('spill.coin').centroid > cue('spill.trinket').centroid * 1.5, 'coins have a bright metal ring above the hollow accessory contact');
      assert.ok(cue('spill.coin').centroid > cue('spill.fabric').centroid * 1.5, 'soft cloth stays below the metallic register');
      assert.ok(cue('spill.fabric').peak < cue('spill.trinket').peak, 'soft fabric is quieter than solid accessories');
    }
    await mkdir(artifactRoot, { recursive: true });
    await writeFile(new URL('sound-spill-quality.json', artifactRoot), JSON.stringify(result.rows, null, 2) + '\n');
    // Audition order: Pond then Arcade; coin, fabric, accessory; light/mid/heavy.
    const wav = Buffer.alloc(44 + result.audition.length * 2);
    wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
    wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(22_050, 24); wav.writeUInt32LE(44_100, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
    wav.write('data', 36); wav.writeUInt32LE(result.audition.length * 2, 40);
    result.audition.forEach((sample, i) => wav.writeInt16LE(sample, 44 + i * 2));
    await writeFile(new URL('sound-spill-audition.wav', artifactRoot), wav);
  } finally { await closeAudioPage(page); }
});

test('spill cues use partial-pack fallbacks, explicit material overrides, and the existing effects/mute controls', async () => {
  const page = await audioPage();
  try {
    await page.evaluate(() => {
      const Native = window.AudioContext;
      window.spillSources = [];
      window.AudioContext = class extends Native {
        createBufferSource() {
          const source = super.createBufferSource(); window.spillSources.push(source); return source;
        }
      };
      window.spillAudio = new window.audioModule.GameAudio();
      document.querySelector('button').onclick = () => window.spillAudio.unlock();
    });
    await page.locator('#unlock').click();
    const result = await page.evaluate(() => {
      const { builtinBuffer, SPILL_SOUND_CUES } = window.audioModule, audio = window.spillAudio;
      const offline = new OfflineAudioContext(1, 1, 22_050);
      const imported = offline.createBuffer(1, 2205, 22_050);
      imported.getChannelData(0).forEach((_, i, pcm) => { pcm[i] = Math.sin(i * .1) * .1; });
      audio.setClips({ coin: imported, crash: imported }, 'arcade');
      const fallbacks = SPILL_SOUND_CUES.map(cue => {
        audio.play(cue, { variant: 'heavy' }); const source = window.spillSources.at(-1);
        return source.buffer === builtinBuffer(source.context, cue, 'arcade', 'heavy');
      });
      const overrides = SPILL_SOUND_CUES.map(cue => {
        audio.setClips({ [cue]: imported }); audio.play(cue, { variant: 'mid' });
        return window.spillSources.at(-1).buffer === imported;
      });
      audio.stop(); const before = window.spillSources.length;
      audio.setMix({ music: 1, ambience: 1, effects: 0 }); audio.play('spill.coin');
      const effectsMuted = before === window.spillSources.length;
      audio.setMix({ music: 1, ambience: 1, effects: 1 }); audio.setMuted(true); audio.play('spill.fabric');
      const globallyMuted = before === window.spillSources.length;
      audio.setMuted(false); audio.play('spill.trinket');
      const restored = before + 1 === window.spillSources.length;
      audio.dispose();
      return { fallbacks, overrides, effectsMuted, globallyMuted, restored };
    });
    assert.deepEqual(result, { fallbacks: [true, true, true], overrides: [true, true, true], effectsMuted: true, globallyMuted: true, restored: true });
  } finally { await closeAudioPage(page); }
});

test('long imported spill clips have their own voice budget and never steal the contextual death', async () => {
  const page = await audioPage();
  try {
    await page.evaluate(() => {
      const Native = window.AudioContext;
      window.spillBudgetSources = [];
      window.AudioContext = class extends Native {
        createBufferSource() {
          const source = super.createBufferSource(), entry = { source, stops: 0 };
          const stop = source.stop.bind(source);
          source.stop = (...args) => { entry.stops++; stop(...args); };
          window.spillBudgetSources.push(entry); return source;
        }
      };
      window.spillBudgetAudio = new window.audioModule.GameAudio();
      document.querySelector('button').onclick = () => window.spillBudgetAudio.unlock();
    });
    await page.locator('#unlock').click();
    const result = await page.evaluate(async () => {
      const audio = window.spillBudgetAudio, offline = new OfflineAudioContext(1, 1, 22_050);
      const long = offline.createBuffer(1, 3 * 22_050, 22_050);
      long.getChannelData(0).forEach((_, i, pcm) => { pcm[i] = Math.sin(i * .1) * .1; });
      audio.setClips({ 'spill.coin': long, 'spill.fabric': long });
      audio.play('death.wave'); const death = window.spillBudgetSources.at(-1);
      for (let i = 0; i < 30; i++) audio.play(i % 2 ? 'spill.coin' : 'spill.fabric');
      const active = window.spillBudgetSources.filter(entry => !entry.stops);
      const deathKept = death.stops === 0 && active.includes(death);
      const spillActive = active.filter(entry => entry.source.buffer === long).length;
      const total = active.length;
      audio.stop();
      const allStopped = window.spillBudgetSources.every(entry => entry.stops === 1);
      await Promise.resolve();
      const restartAt = window.spillBudgetSources.length;
      audio.play('death.water');
      for (let i = 0; i < 3; i++) audio.play('spill.coin');
      const restarted = window.spillBudgetSources.slice(restartAt).filter(entry => !entry.stops).length;
      audio.dispose();
      const allDisposed = window.spillBudgetSources.every(entry => entry.stops === 1);
      return { deathKept, spillActive, total, allStopped, restarted, allDisposed };
    });
    assert.deepEqual(result, { deathKept: true, spillActive: 3, total: 4, allStopped: true, restarted: 4, allDisposed: true });
  } finally { await closeAudioPage(page); }
});

test('production rendering honors stereo position, distance gain and playback rate without clipping the scene', async () => {
  const page = await audioPage();
  try {
    const result = await page.evaluate(async () => {
      const { renderBuiltinCue, builtinBuffer } = window.audioModule;
      async function render(options) {
        const context = new OfflineAudioContext(2, 4 * 24_000, 24_000);
        renderBuiltinCue(context, 'traffic.honk', 'pond', context.destination, options);
        const buffer = await context.startRendering();
        return Array.from({ length: 2 }, (_, ch) => {
          let energy = 0, last = 0;
          buffer.getChannelData(ch).forEach((sample, i) => { energy += sample * sample; if (Math.abs(sample) > 0.00001) last = i; });
          return { energy, last };
        });
      }
      const left = await render({ pan: -1 }), right = await render({ pan: 1 }), center = await render({ pan: 0 });
      const quiet = await render({ pan: 0, gain: 0.25 }), fast = await render({ pan: 0, rate: 1.2 });
      const scene = new OfflineAudioContext(2, 4 * 24_000, 24_000);
      for (const [cue, gain, pan] of [['music', .6, 0], ['ambience.wind', .4, -.2], ['ambience.water', .4, .25],
        ['traffic.pass', .7, -.4], ['traffic.pass', .5, .6], ['train.pass', .6, .5], ['traffic.honk', .5, -.4], ['call.duck', 1, 0]]) {
        renderBuiltinCue(scene, cue, 'pond', scene.destination, { gain, pan });
      }
      const mixed = await scene.startRendering();
      let peak = 0;
      for (let ch = 0; ch < 2; ch++) for (const sample of mixed.getChannelData(ch)) peak = Math.max(peak, Math.abs(sample));
      return { left, right, center, quiet, fast, peak };
    });
    assert.ok(result.left[0].energy > 100 * result.left[1].energy, 'left-side vehicle is heard on the left');
    assert.ok(result.right[1].energy > 100 * result.right[0].energy, 'right-side vehicle is heard on the right');
    assert.ok(Math.abs(result.center[0].energy / result.center[1].energy - 1) < 0.01);
    assert.ok(Math.abs(result.quiet[0].energy / result.center[0].energy - .25 ** 2) < .003, 'distance gain attenuates actual PCM');
    assert.ok(result.fast[0].last < result.center[0].last * .86, 'passing pitch shift changes actual playback speed');
    assert.ok(result.peak < .9, `busy scene retains headroom (${result.peak})`);
  } finally { await closeAudioPage(page); }
});

test('vehicle horns keep exact musical pitch across packs and registers while varying timbre and rhythm', async () => {
  const page = await audioPage();
  try {
    const { results, audition } = await page.evaluate(async () => {
      const { builtinBuffer, renderBuiltinCue } = window.audioModule;
      const sampleRate = 24_000, results = [], audition = [];
      const variants = ['sedan', 'compact', 'truck', 'electric', 'sedan.alt', 'compact.alt', 'truck.alt', 'electric.alt'];
      // Measure periodicity in the loudest part of the rendered signal. A local
      // correlation peak distinguishes exact tuning from the former pitch glides.
      function pitch(buffer, expected) {
        const pcm = buffer.getChannelData(0), length = Math.floor(sampleRate * .045);
        const minLag = Math.floor(sampleRate / expected * .8), maxLag = Math.ceil(sampleRate / expected * 1.2);
        let start = 0, loudest = 0;
        for (let at = 0; at + length + maxLag < pcm.length; at += 120) {
          let energy = 0;
          for (let i = 0; i < length; i++) energy += pcm[at + i] ** 2;
          if (energy > loudest) { start = at; loudest = energy; }
        }
        const correlation = lag => {
          let product = 0, left = 0, right = 0;
          for (let i = 0; i < length; i++) {
            const a = pcm[start + i], b = pcm[start + i + lag];
            product += a * b; left += a * a; right += b * b;
          }
          return product / Math.sqrt(left * right);
        };
        let best = minLag, strength = -Infinity;
        for (let lag = minLag; lag <= maxLag; lag++) {
          const value = correlation(lag);
          if (value > strength) { best = lag; strength = value; }
        }
        const before = correlation(best - 1), after = correlation(best + 1);
        const lag = best + .5 * (before - after) / (before - 2 * strength + after);
        return { frequency: sampleRate / lag, strength };
      }
      function hornBody(buffer, frequency) {
        const pcm = buffer.getChannelData(0), sr = buffer.sampleRate;
        // Locate the longest press from short RMS windows, independent of each
        // vehicle's authored pulse schedule. Ignore only the silent gaps.
        const step = Math.round(sr * .002), levels = [];
        for (let at = 0; at < pcm.length; at += step) {
          let power = 0;
          for (let i = at; i < Math.min(pcm.length, at + step); i++) power += pcm[i] ** 2;
          levels.push(Math.sqrt(power / step));
        }
        const threshold = Math.max(...levels) * .04;
        let start = 0, longest = [0, 0];
        for (let i = 0; i <= levels.length; i++) {
          if (i < levels.length && levels[i] > threshold) continue;
          if (i - start > longest[1] - longest[0]) longest = [start, i];
          start = i + 1;
        }
        const begin = longest[0] * step, length = (longest[1] - longest[0]) * step;
        function spectrum(fraction) {
          const count = Math.round(sr / frequency * 4), at = Math.round(begin + length * fraction - count / 2);
          const partials = [];
          let power = 0;
          for (let i = 0; i < count; i++) power += pcm[at + i] ** 2;
          for (let harmonic = 1; harmonic <= 12; harmonic++) {
            let sin = 0, cos = 0;
            for (let i = 0; i < count; i++) {
              const phase = Math.PI * 2 * frequency * harmonic * i / sr;
              sin += pcm[at + i] * Math.sin(phase); cos += pcm[at + i] * Math.cos(phase);
            }
            partials.push(sin * sin + cos * cos);
          }
          return { rms: Math.sqrt(power / count), upper: partials.slice(1).reduce((sum, value) => sum + value, 0) / partials[0] };
        }
        const early = spectrum(.3), late = spectrum(.7);
        return { hold: late.rms / early.rms, earlyHarmonics: early.upper, lateHarmonics: late.upper };
      }
      for (const pack of ['pond', 'arcade']) for (const variant of variants) {
        const probe = new OfflineAudioContext(1, 1, sampleRate);
        const raw = builtinBuffer(probe, 'traffic.honk', pack, variant), pcm = raw.getChannelData(0);
        let fingerprint = 2166136261, power = 0, brightness = 0, peak = 0;
        for (let i = 0; i < pcm.length; i++) {
          if (!Number.isFinite(pcm[i])) throw new Error(`${pack}/${variant}: invalid PCM`);
          fingerprint = Math.imul(fingerprint ^ Math.round(pcm[i] * 1e6), 16777619);
          power += pcm[i] ** 2; peak = Math.max(peak, Math.abs(pcm[i]));
          if (i) brightness += (pcm[i] - pcm[i - 1]) ** 2;
        }
        const notes = [];
        // C3, E4, C5 in Pond; D3, F#4, D5 in Arcade: octave limits and
        // an interior major-third degree verify actual semitone transposition.
        for (const semitones of [-12, 4, 12]) {
          const rate = 2 ** (semitones / 12), midi = 60 + (pack === 'arcade' ? 2 : 0) + semitones;
          const expected = 440 * 2 ** ((midi - 69) / 12);
          const context = new OfflineAudioContext(1, Math.ceil((raw.duration / rate + .05) * sampleRate), sampleRate);
          renderBuiltinCue(context, 'traffic.honk', pack, context.destination, { variant, rate });
          const rendered = await context.startRendering();
          notes.push({ midi, expected, ...pitch(rendered, expected) });
          if (semitones === (variant.startsWith('truck') ? -12 : 4)) {
            audition.push({ pack, variant, midi, pcm: Array.from(rendered.getChannelData(0)) });
          }
        }
        results.push({ pack, variant, duration: raw.duration, fingerprint, peak, brightness: Math.sqrt(brightness / power),
          seam: Math.abs(pcm[0] - pcm.at(-1)), body: hornBody(raw, 440 * 2 ** (((pack === 'arcade' ? 62 : 60) - 69) / 12)), notes });
      }
      return { results, audition };
    });
    for (const horn of results) {
      assert.ok(horn.peak > .01 && horn.peak < .3, `${horn.pack}/${horn.variant}: audible with headroom`);
      assert.ok(horn.duration < .6 && horn.seam < 1e-5, `${horn.variant}: brief honk releases cleanly`);
      assert.ok(horn.body.hold > .9 && horn.body.hold < 1.12, `${horn.pack}/${horn.variant}: holds its mechanical body instead of fading like a struck note`);
      assert.ok(horn.body.earlyHarmonics > .55 && horn.body.lateHarmonics > .55,
        `${horn.pack}/${horn.variant}: strong upper harmonics remain through the press, not a soft pure beep`);
      assert.ok(horn.body.lateHarmonics / horn.body.earlyHarmonics > .9,
        `${horn.pack}/${horn.variant}: the horn keeps its bright reed instead of losing its upper partials`);
      for (const note of horn.notes) {
        const cents = 1200 * Math.log2(note.frequency / note.expected);
        assert.ok(Math.abs(cents) < 8, `${horn.pack}/${horn.variant} MIDI ${note.midi}: pitch is within 8 cents (${cents.toFixed(2)})`);
        assert.ok(note.strength > .97, `${horn.pack}/${horn.variant}: stable periodic pitch (${note.strength})`);
      }
    }
    for (const pack of ['pond', 'arcade']) {
      const horns = results.filter(horn => horn.pack === pack), bodies = horns.filter(horn => !horn.variant.endsWith('.alt'));
      assert.equal(new Set(horns.map(horn => horn.fingerprint)).size, 8, `${pack}: eight different finite voices`);
      assert.ok(new Set(horns.map(horn => horn.duration)).size >= 5, `${pack}: phrasing varies beyond transposing one recording`);
      assert.equal(new Set(bodies.map(horn => horn.brightness.toFixed(3))).size, 4, `${pack}: vehicle types have distinct harmonic balances`);
    }
    await mkdir(artifactRoot, { recursive: true });
    await writeFile(new URL('sound-horn-quality.json', artifactRoot), JSON.stringify(results, null, 2) + '\n');
    // A short listening artifact uses the same offline playback inspected above.
    // Lower truck notes and the other vehicles' E/F# notes keep their registers clear.
    const sampleRate = 24_000, spacing = Math.round(sampleRate * 1.2);
    const data = Buffer.alloc(spacing * audition.length * 2), header = Buffer.alloc(44);
    for (let voice = 0; voice < audition.length; voice++) for (let i = 0; i < audition[voice].pcm.length; i++) {
      data.writeInt16LE(Math.round(audition[voice].pcm[i] * 32767), (voice * spacing + i) * 2);
    }
    header.write('RIFF', 0); header.writeUInt32LE(data.length + 36, 4); header.write('WAVEfmt ', 8);
    header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
    header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * 2, 28);
    header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(data.length, 40);
    await writeFile(new URL('sound-horns.wav', artifactRoot), Buffer.concat([header, data]));
    await writeFile(new URL('sound-horns-audition.json', artifactRoot), JSON.stringify(audition.map(({ pcm, ...voice }, index) => ({ at: index * 1.2, ...voice })), null, 2) + '\n');
  } finally { await closeAudioPage(page); }
});

test('horn variants keep a finite buffer cache and imported cue authority', async () => {
  const page = await audioPage();
  try {
    const result = await page.evaluate(() => {
      const { builtinBuffer, GameAudio } = window.audioModule;
      const context = new OfflineAudioContext(1, 24_000, 24_000);
      Object.defineProperty(context, 'state', { get: () => 'running' });
      context.close = async () => {};
      window.AudioContext = function () { return context; };
      const variants = ['sedan', 'compact', 'truck', 'electric', 'sedan.alt', 'compact.alt', 'truck.alt', 'electric.alt'];
      const bounded = ['pond', 'arcade'].map(pack => {
        const fallback = builtinBuffer(context, 'traffic.honk', pack);
        const known = variants.map(variant => builtinBuffer(context, 'traffic.honk', pack, variant));
        return known[0] === fallback && new Set(known).size === 8
          && variants.every((variant, i) => builtinBuffer(context, 'traffic.honk', pack, variant) === known[i])
          && Array.from({ length: 256 }, (_, i) => `unknown:${i}`).every(variant => builtinBuffer(context, 'traffic.honk', pack, variant) === fallback);
      });
      const played = [], create = context.createBufferSource.bind(context);
      context.createBufferSource = () => {
        const source = create(), start = source.start.bind(source);
        source.start = (...args) => { played.push(source); start(...args); };
        return source;
      };
      const imported = context.createBuffer(1, 2400, 24_000);
      imported.getChannelData(0).fill(.1);
      const audio = new GameAudio(); audio.unlock();
      audio.setClips({ 'traffic.honk': imported }, 'arcade');
      variants.forEach(variant => audio.play('traffic.honk', { variant, rate: 2 ** (4 / 12) }));
      const custom = played.length === variants.length && played.every(source => source.buffer === imported);
      const tuned = played.every(source => Math.abs(source.playbackRate.value - 2 ** (4 / 12)) < 1e-6);
      audio.setBuiltin('pond'); audio.play('traffic.honk', { variant: 'truck.alt' });
      const fallback = played.at(-1).buffer === builtinBuffer(context, 'traffic.honk', 'pond', 'truck.alt');
      audio.dispose();
      return { bounded, custom, tuned, fallback };
    });
    assert.deepEqual(result, { bounded: [true, true], custom: true, tuned: true, fallback: true });
  } finally { await closeAudioPage(page); }
});

test('music resumes at the requested harmonic phase without restarting active loops', async () => {
  const page = await audioPage();
  try {
    const result = await page.evaluate(async () => {
      const context = new OfflineAudioContext(1, 24_000, 24_000);
      Object.defineProperty(context, 'state', { get: () => 'running' });
      context.close = async () => {};
      window.AudioContext = function () { return context; };
      const started = [], create = context.createBufferSource.bind(context);
      context.createBufferSource = () => {
        const source = create(), start = source.start.bind(source);
        source.start = (...args) => { started.push({ source, args }); start(...args); };
        return source;
      };
      const audio = new window.audioModule.GameAudio(); audio.unlock(); await audio.prepare();
      const offsets = [];
      for (const offset of [17.25, 41.25, -6.75, 24, NaN, Infinity, undefined]) {
        audio.stop();
        audio.syncLoops([{ id: 'music', cue: 'music', gain: .5, offset }]);
        offsets.push(started.at(-1).args[1]);
      }
      const activeCount = started.length, active = started.at(-1).source;
      audio.syncLoops([{ id: 'music', cue: 'music', gain: .4, offset: 12 }]);
      const uninterrupted = started.length === activeCount && started.at(-1).source === active;
      const carOffsets = [];
      for (const offset of [1, 37]) {
        audio.stop(); audio.syncLoops([{ id: 'car:42', cue: 'traffic.pass', gain: .3, offset }]);
        carOffsets.push(started.at(-1).args[1]);
      }
      audio.stop(); audio.syncLoops([{ id: 'wind', cue: 'ambience.wind', gain: .3, offset: 7 }]);
      const windOffset = started.at(-1).args[1];
      const imported = context.createBuffer(1, 6 * 24_000, 24_000);
      imported.getChannelData(0).fill(.1);
      audio.setClips({ music: imported });
      audio.syncLoops([{ id: 'music', cue: 'music', gain: .5, offset: 17.25 }]);
      const customOffset = started.at(-1).args[1], customDuration = started.at(-1).source.buffer.duration;
      audio.dispose();
      return { offsets, uninterrupted, carOffsets, windOffset, customOffset, customDuration };
    });
    assert.deepEqual(result.offsets, [17.25, 17.25, 17.25, 0, 0, 0, 0]);
    assert.equal(result.uninterrupted, true, 'phase updates do not retrigger a running musical phrase');
    assert.equal(result.carOffsets[0], result.carOffsets[1], 'engine phases retain their emitter-specific offsets');
    assert.ok(result.carOffsets[0] > 0, 'the unchanged engine offset is still staggered');
    assert.equal(result.windOffset, 0, 'environmental beds ignore musical phase requests');
    assert.equal(result.customOffset, 5.25, 'custom music wraps against its own duration');
    assert.equal(result.customDuration, 6);
  } finally { await closeAudioPage(page); }
});

test('missing cancelAndHoldAtTime preserves live automation values across every mixer path', async () => {
  const page = await audioPage();
  try {
    const result = await page.evaluate(async () => {
      // Exercise real AudioParams with precisely the capability absent in Firefox.
      Object.defineProperty(AudioParam.prototype, 'cancelAndHoldAtTime', { configurable: true, value: undefined });
      const context = new OfflineAudioContext(2, 24_000, 24_000);
      Object.defineProperty(context, 'state', { get: () => 'running' });
      context.close = async () => {};
      window.AudioContext = function () { return context; };
      const holds = [], parameters = [];
      function observe(param, kind) {
        const cancel = param.cancelScheduledValues.bind(param), set = param.setValueAtTime.bind(param);
        let pending;
        param.cancelScheduledValues = at => {
          pending = { kind, at, heard: param.value };
          return cancel(at);
        };
        param.setValueAtTime = (value, at) => {
          if (pending) { holds.push({ ...pending, anchored: value, anchorTime: at }); pending = undefined; }
          return set(value, at);
        };
        parameters.push({ kind, param });
      }
      for (const [method, key, kind] of [['createGain', 'gain', 'gain'], ['createStereoPanner', 'pan', 'pan'], ['createBufferSource', 'playbackRate', 'rate']]) {
        const create = context[method].bind(context);
        context[method] = () => { const node = create(); observe(node[key], kind); return node; };
      }
      const buffer = context.createBuffer(1, 2400, 24_000);
      for (let i = 0; i < buffer.length; i++) buffer.getChannelData(0)[i] = Math.sin(i * Math.PI / 40) * .3;
      const audio = new window.audioModule.GameAudio();
      audio.setClips({ 'traffic.pass': buffer }); audio.unlock();
      const request = { id: 'car', cue: 'traffic.pass', gain: .7, pan: -.7, rate: .8 };
      audio.syncLoops([request]);
      const checkpoints = [];
      const schedule = (at, action) => {
        const pending = context.suspend(at);
        checkpoints.push(pending.then(() => { action(); return context.resume(); }));
      };
      schedule(.048, () => audio.syncLoops([{ ...request, gain: .4, pan: .6, rate: 1.3 }]));
      schedule(.192, () => audio.setMix({ music: .3, ambience: .4, effects: .8 }));
      schedule(.32, () => audio.play('hurt.rear'));
      schedule(.4, () => audio.play('health.restore'));
      schedule(.56, () => audio.syncLoops([]));
      const rendered = await context.startRendering();
      await Promise.all(checkpoints);
      const finite = Array.from({ length: 2 }, (_, ch) => rendered.getChannelData(ch).every(Number.isFinite)).every(Boolean);
      const peak = Math.max(...rendered.getChannelData(0).map(Math.abs));
      // Dispose after measuring: stop deliberately resets the bed to 1, not a hold.
      const observed = holds.slice(), kinds = [...new Set(holds.map(hold => hold.kind))];
      audio.dispose();
      return { finite, peak, holds: observed, kinds };
    });
    assert.equal(result.finite, true); assert.ok(result.peak > .001 && result.peak < .5);
    assert.deepEqual(new Set(result.kinds), new Set(['gain', 'pan', 'rate']));
    assert.ok(result.holds.length >= 9, 'gain/pan/rate updates, three buses, repeated ducking and fade-out all use the fallback');
    for (const hold of result.holds) {
      assert.equal(hold.anchorTime, hold.at);
      assert.equal(hold.anchored, hold.heard, `${hold.kind}: automation resumes from its current computed value`);
      assert.ok(Number.isFinite(hold.anchored));
    }
    assert.ok(result.holds.some(hold => hold.kind === 'gain' && hold.at < .1 && hold.heard > 0 && hold.heard < .7), 'interrupted fade-in holds the intermediate gain, not its final target');
  } finally { await closeAudioPage(page); }
});

test('mob cues use pack overrides and mob deaths retain only the imported legacy crash fallback', async () => {
  const page = await audioPage();
  try {
    const result = await page.evaluate(() => {
      const { GameAudio, builtinBuffer } = window.audioModule;
      const context = new OfflineAudioContext(2, 24_000, 24_000);
      Object.defineProperty(context, 'state', { get: () => 'running' });
      context.close = async () => {};
      window.AudioContext = function () { return context; };
      const played = [], original = context.createBufferSource.bind(context);
      context.createBufferSource = () => {
        const source = original(), start = source.start.bind(source);
        source.start = (...args) => { played.push(source.buffer); start(...args); };
        return source;
      };
      const clip = frequency => {
        const buffer = context.createBuffer(1, 2400, 24_000), pcm = buffer.getChannelData(0);
        for (let i = 0; i < pcm.length; i++) pcm[i] = Math.sin(i * 2 * Math.PI * frequency / 24_000) * .4;
        return buffer;
      };
      const crash = clip(220), mob = clip(330), spawn = clip(440), attack = clip(550);
      const audio = new GameAudio(); audio.unlock();
      audio.setClips({ crash }); audio.play('death.mob');
      const legacy = played.at(-1) === crash;
      audio.play('mob.spawn');
      const spawnFallback = played.at(-1) === builtinBuffer(context, 'mob.spawn', 'pond');
      audio.play('mob.attack');
      const attackFallback = played.at(-1) === builtinBuffer(context, 'mob.attack', 'pond');
      audio.setClips({ crash, 'death.mob': mob, 'mob.spawn': spawn, 'mob.attack': attack });
      audio.play('death.mob'); const explicit = played.at(-1) === mob;
      audio.play('mob.spawn'); const customSpawn = played.at(-1) === spawn;
      audio.play('mob.attack'); const customAttack = played.at(-1) === attack;
      audio.setBuiltin('pond'); audio.play('death.mob');
      const ownDefault = played.at(-1) === builtinBuffer(context, 'death.mob', 'pond')
        && played.at(-1) !== builtinBuffer(context, 'crash', 'pond');
      audio.dispose();
      return { legacy, spawnFallback, attackFallback, explicit, customSpawn, customAttack, ownDefault };
    });
    assert.deepEqual(result, { legacy: true, spawnFallback: true, attackFallback: true, explicit: true, customSpawn: true, customAttack: true, ownDefault: true });
  } finally { await closeAudioPage(page); }
});

test('health cues use explicit overrides and retain nonfatal defaults in legacy crash packs', async () => {
  const page = await audioPage();
  try {
    const result = await page.evaluate(() => {
      const { GameAudio, builtinBuffer, HEALTH_SOUND_CUES } = window.audioModule;
      const context = new OfflineAudioContext(2, 24_000, 24_000);
      Object.defineProperty(context, 'state', { get: () => 'running' });
      context.close = async () => {};
      window.AudioContext = function () { return context; };
      const played = [], original = context.createBufferSource.bind(context);
      context.createBufferSource = () => {
        const source = original(), start = source.start.bind(source);
        source.start = (...args) => { played.push(source.buffer); start(...args); };
        return source;
      };
      const clip = frequency => {
        const buffer = context.createBuffer(1, 2400, 24_000), pcm = buffer.getChannelData(0);
        for (let i = 0; i < pcm.length; i++) pcm[i] = Math.sin(i * 2 * Math.PI * frequency / 24_000) * .4;
        return buffer;
      };
      const crash = clip(220), death = clip(330);
      const overrides = Object.fromEntries(HEALTH_SOUND_CUES.map((cue, index) => [cue, clip(440 + index * 110)]));
      const audio = new GameAudio(); audio.unlock();
      const fallback = [];
      for (const pack of ['pond', 'arcade']) {
        audio.setClips({ crash, 'death.traffic': death }, pack);
        for (const cue of HEALTH_SOUND_CUES) {
          audio.play(cue);
          fallback.push(played.at(-1) === builtinBuffer(context, cue, pack) && played.at(-1) !== death && played.at(-1) !== crash);
        }
      }
      audio.setClips({ crash, 'death.traffic': death, ...overrides });
      const explicit = HEALTH_SOUND_CUES.map(cue => { audio.play(cue); return played.at(-1) === overrides[cue]; });
      audio.play('death.traffic'); const fatalUnchanged = played.at(-1) === death;
      const before = played.length;
      audio.setMix({ music: 1, ambience: 1, effects: 0 });
      for (const cue of HEALTH_SOUND_CUES) audio.play(cue);
      const effectsMute = played.length === before;
      audio.dispose();
      return { fallback, explicit, fatalUnchanged, effectsMute };
    });
    assert.deepEqual(result, { fallback: Array(6).fill(true), explicit: Array(3).fill(true), fatalUnchanged: true, effectsMute: true });
  } finally { await closeAudioPage(page); }
});

test('independent music, ambience and effects faders control the actual production mix', async () => {
  const page = await audioPage();
  try {
    const renders = await page.evaluate(async () => {
      async function energy(cue, mix) {
        const context = new OfflineAudioContext(2, 24_000, 24_000);
        Object.defineProperty(context, 'state', { get: () => 'running' });
        context.close = async () => {};
        window.AudioContext = function () { return context; };
        const audio = new window.audioModule.GameAudio();
        audio.setMix(mix); audio.unlock(); await audio.prepare(); audio.play(cue);
        const rendered = await context.startRendering(); audio.dispose();
        let energy = 0;
        for (const value of rendered.getChannelData(0)) energy += value ** 2;
        return energy;
      }
      const all = { music: 1, ambience: 1, effects: 1 }, results = [];
      for (const [cue, group] of [['music', 'music'], ['ambience.water', 'ambience'], ['coin', 'effects']]) {
        const loud = await energy(cue, all), half = await energy(cue, { ...all, [group]: .5 }), silent = await energy(cue, { ...all, [group]: 0 });
        const isolated = await energy(cue, { music: 0, ambience: 0, effects: 0, [group]: 1 });
        results.push({ cue, loud, half, silent, isolated });
      }
      return results;
    });
    for (const result of renders) {
      assert.ok(result.loud > .001, `${result.cue}: production mixer audible`);
      assert.ok(Math.abs(result.half / result.loud - .25) < .01, `${result.cue}: fader scales PCM correctly`);
      assert.equal(result.silent, 0, `${result.cue}: its fader can fully mute the layer`);
      assert.ok(Math.abs(result.isolated / result.loud - 1) < .01, `${result.cue}: other faders do not affect this layer`);
    }
  } finally { await closeAudioPage(page); }
});

test('cold soundscape preparation yields to input and never starts stale audio after stop', async () => {
  const page = await audioPage();
  try {
    const result = await page.evaluate(async () => {
      const context = new OfflineAudioContext(2, 24_000, 24_000);
      Object.defineProperty(context, 'state', { get: () => 'running' });
      context.close = async () => {};
      window.AudioContext = function () { return context; };
      let sources = 0, ticks = 0;
      const original = context.createBufferSource.bind(context);
      context.createBufferSource = () => { sources++; return original(); };
      const heartbeat = setInterval(() => ticks++, 0);
      const audio = new window.audioModule.GameAudio();
      audio.unlock();
      const requests = [{ id: 'music', cue: 'music', gain: .5 }, { id: 'wind', cue: 'ambience.wind', gain: .3 }];
      audio.syncLoops(requests); audio.stop();
      await audio.prepare(); clearInterval(heartbeat);
      const staleSources = sources;
      audio.syncLoops(requests);
      const preparedSources = sources;
      audio.dispose();
      return { ticks, staleSources, preparedSources };
    });
    assert.ok(result.ticks >= 5, 'long music generation yields repeatedly for input and animation');
    assert.equal(result.staleSources, 0, 'finishing preparation does not revive a stopped scene');
    assert.equal(result.preparedSources, 2, 'a fresh scene update starts prepared music and ambience');
  } finally { await closeAudioPage(page); }
});

test('an explicit cold music preview plays once when ready and lifecycle changes cancel it', async () => {
  const page = await audioPage();
  try {
    const results = await page.evaluate(async () => {
      async function scenario(cancel) {
        const context = new OfflineAudioContext(2, 24_000, 24_000);
        Object.defineProperty(context, 'state', { get: () => 'running' });
        context.close = async () => {};
        window.AudioContext = function () { return context; };
        let sources = 0;
        const original = context.createBufferSource.bind(context);
        context.createBufferSource = () => { sources++; return original(); };
        const audio = new window.audioModule.GameAudio();
        audio.unlock(); const ready = audio.prepare(); audio.play('music');
        if (cancel === 'none') { audio.play('music'); audio.play('music'); }
        if (cancel === 'stop') audio.stop();
        if (cancel === 'mute') audio.setMuted(true);
        if (cancel === 'pack') audio.setBuiltin('arcade');
        if (cancel === 'clips') audio.setClips({});
        if (cancel === 'dispose') audio.dispose();
        await ready; await Promise.resolve();
        const started = sources; audio.dispose();
        return { cancel, started };
      }
      const results = [];
      for (const cancel of ['none', 'stop', 'mute', 'pack', 'clips', 'dispose']) results.push(await scenario(cancel));
      return results;
    });
    assert.equal(results[0].started, 1, 'the user-requested preview is heard after preparing');
    for (const result of results.slice(1)) assert.equal(result.started, 0, `${result.cancel} cancels pending preview playback`);
  } finally { await closeAudioPage(page); }
});

test('playback requires unlock, mute drops cues, pack changes stop voices and disposal closes audio', async () => {
  const page = await audioPage();
  try {
    await page.evaluate(() => {
      const NativeAudioContext = window.AudioContext;
      window.audioObservation = { contexts: [], sources: [] };
      window.AudioContext = class extends NativeAudioContext {
        constructor(options) {
          super(options);
          window.audioObservation.contexts.push(this);
        }
        createBufferSource() {
          const source = super.createBufferSource();
          const observation = { source, starts: 0, stops: 0, disconnects: 0 };
          for (const [method, counter] of [['start', 'starts'], ['stop', 'stops'], ['disconnect', 'disconnects']]) {
            const original = source[method].bind(source);
            source[method] = (...args) => { observation[counter]++; return original(...args); };
          }
          window.audioObservation.sources.push(observation);
          return source;
        }
      };
      window.gameAudio = new window.audioModule.GameAudio();
      window.gameAudio.play('hop');
      window.gameAudio.setMuted(true);
      window.gameAudio.unlock();
      document.querySelector('button').onclick = () => { window.gameAudio.setMuted(false); window.gameAudio.unlock(); };
    });
    assert.equal(await page.evaluate(() => window.audioObservation.contexts.length), 0, 'construction, play and muted unlock create no audio context');
    await page.locator('#unlock').click();
    await page.waitForFunction(() => window.audioObservation.contexts[0]?.state === 'running');
    const lifecycle = await page.evaluate(async () => {
      const audio = window.gameAudio, observations = window.audioObservation;
      audio.play('train');
      const first = observations.sources[0];
      audio.setMuted(true); audio.play('coin');
      const muted = { sources: observations.sources.length, stopped: first.stops, disconnected: first.disconnects };
      audio.setMuted(false); audio.setBuiltin('arcade'); audio.play('hop');
      const second = observations.sources[1];
      audio.setBuiltin('pond');
      const changed = { stopped: second.stops, disconnected: second.disconnects };
      const context = observations.contexts[0];
      const imported = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const pcm = imported.getChannelData(0);
      for (let i = 0; i < pcm.length; i++) pcm[i] = Math.sin(i * 0.04) * 0.5;
      audio.setClips({ hop: imported }, 'arcade'); audio.play('hop');
      const customVoice = observations.sources.at(-1);
      audio.play('coin');
      const fallbackVoice = observations.sources.at(-1);
      const external = {
        usesClip: customVoice.source.buffer === imported,
        usesFallback: fallbackVoice.source.buffer !== imported && fallbackVoice.source.buffer.length > 0,
      };
      audio.setBuiltin('pond'); audio.play('hop');
      external.clearsClip = observations.sources.at(-1).source.buffer !== imported;
      external.stopsPrevious = customVoice.stops === 1 && fallbackVoice.stops === 1;
      audio.stop();
      for (let i = 0; i < 8; i++) audio.play('train');
      const capped = observations.sources.slice(-8).filter(source => source.stops === 0).length;
      audio.stop();
      audio.play('train'); audio.stop();
      const stopped = observations.sources.at(-1).stops;
      const beforeDispose = observations.sources.length;
      audio.dispose(); audio.dispose(); audio.unlock(); audio.play('coin');
      await new Promise(resolve => setTimeout(resolve, 0));
      return { muted, changed, external, capped, stopped, beforeDispose, afterDispose: observations.sources.length, contexts: observations.contexts.length, state: context.state };
    });
    assert.deepEqual(lifecycle.muted, { sources: 1, stopped: 1, disconnected: 1 });
    assert.deepEqual(lifecycle.changed, { stopped: 1, disconnected: 1 });
    assert.deepEqual(lifecycle.external, { usesClip: true, usesFallback: true, clearsClip: true, stopsPrevious: true });
    assert.equal(lifecycle.capped, 6, 'rapid cues have bounded polyphony');
    assert.equal(lifecycle.stopped, 1);
    assert.equal(lifecycle.beforeDispose, lifecycle.afterDispose);
    assert.equal(lifecycle.contexts, 1);
    assert.equal(lifecycle.state, 'closed');
  } finally { await closeAudioPage(page); }
});

test('scene loops update in place, bound polyphony, release resources and preserve custom-loop fallbacks', async () => {
  const page = await audioPage();
  try {
    await page.evaluate(() => {
      const Native = window.AudioContext;
      window.loopSources = [];
      window.AudioContext = class extends Native {
        createBufferSource() {
          const source = super.createBufferSource(), observation = { source, starts: 0, stops: 0, disconnects: 0 };
          for (const [method, counter] of [['start', 'starts'], ['stop', 'stops'], ['disconnect', 'disconnects']]) {
            const original = source[method].bind(source);
            source[method] = (...args) => { observation[counter]++; return original(...args); };
          }
          window.loopSources.push(observation); return source;
        }
      };
      window.loopAudio = new window.audioModule.GameAudio();
      document.querySelector('button').onclick = () => window.loopAudio.unlock();
    });
    await page.locator('#unlock').click();
    const first = await page.evaluate(async () => {
      const audio = window.loopAudio;
      await audio.prepare();
      const requests = Array.from({ length: 12 }, (_, i) => ({ id: `car:${i}`, cue: 'traffic.pass', gain: .2, pan: i % 2 ? -.5 : .5 }));
      audio.syncLoops(requests);
      const created = window.loopSources.length;
      audio.syncLoops(requests.map(loop => ({ ...loop, gain: .4, pan: -.2, rate: 1.1 })));
      const afterUpdate = window.loopSources.length;
      for (let i = 0; i < 8; i++) audio.play('train');
      const loops = window.loopSources.filter(voice => voice.source.loop && !voice.stops);
      const effects = window.loopSources.filter(voice => !voice.source.loop && !voice.stops);
      audio.setMix({ music: 1, ambience: 0, effects: 1 });
      const ambienceRetired = loops.every(voice => voice.stops === 1);
      const effectsRetained = effects.every(voice => voice.stops === 0);
      const beforeMutedScene = window.loopSources.length;
      audio.syncLoops(requests);
      const mutedSceneSilent = window.loopSources.length === beforeMutedScene;
      audio.setMix({ music: 1, ambience: 1, effects: 1 });
      // Re-enter a full road scene before the previous fades finish. Retiring
      // sources must share the budget with new sources, without starving it.
      audio.syncLoops(requests.map(loop => ({ ...loop, id: `${loop.id}:return` })));
      const returnedLoops = window.loopSources.filter(voice => voice.source.loop && !voice.stops).length;
      const retiredReleased = loops.every(voice => voice.disconnects === 1);
      audio.syncLoops([]);
      return { created, afterUpdate, loops: loops.length, effects: effects.length,
        ambienceRetired, effectsRetained, mutedSceneSilent, returnedLoops, retiredReleased };
    });
    assert.equal(first.created, 8, 'scene voices have a fixed cap');
    assert.equal(first.afterUpdate, 8, 'position and volume updates retain existing voices');
    assert.equal(first.loops, 8, 'burst effects do not steal continuous beds');
    assert.equal(first.effects, 6);
    assert.equal(first.ambienceRetired, true, 'muting ambience retires each already playing engine');
    assert.equal(first.effectsRetained, true, 'the ambience fader does not stop impact effects');
    assert.equal(first.mutedSceneSilent, true, 'new scene requests cannot restart a muted category');
    assert.equal(first.returnedLoops, 8, 'quickly unmuting restores the full bounded scene');
    assert.equal(first.retiredReleased, true, 'old fading voices release their slots during immediate re-entry');
    await page.waitForTimeout(160);
    assert.equal(await page.evaluate(() => window.loopSources.filter(voice => voice.source.loop && voice.disconnects === 0).length), 0, 'departed emitters finish their fade and disconnect');
    const custom = await page.evaluate(async () => {
      const audio = window.loopAudio;
      audio.stop();
      const offline = new OfflineAudioContext(1, 1, 44_100);
      const imported = offline.createBuffer(1, 44_100, 44_100);
      const pcm = imported.getChannelData(0);
      for (let i = 0; i < pcm.length; i++) pcm[i] = Math.sin(i * 2 * Math.PI * 220 / 44_100) * .5;
      audio.setClips({ music: imported }, 'arcade');
      await audio.prepare();
      const before = window.loopSources.length;
      audio.syncLoops([{ id: 'music', cue: 'music', gain: .5 }, { id: 'wind', cue: 'ambience.wind', gain: .3 }]);
      const voices = window.loopSources.slice(before);
      const played = voices[0].source.buffer;
      const usesClip = played.length === imported.length && played.getChannelData(0)[12345] === pcm[12345] && voices[0].source.loop;
      const safeCopy = played !== imported && Math.abs(pcm.at(-1) - Math.sin((pcm.length - 1) * 2 * Math.PI * 220 / 44_100) * .5) < 1e-7;
      const usesFallback = voices[1].source.buffer !== imported && voices[1].source.loop;
      audio.play('coin');
      audio.setMuted(true);
      const allStopped = window.loopSources.every(voice => voice.stops || voice.disconnects);
      audio.syncLoops([{ id: 'music', cue: 'music', gain: 1 }]); audio.play('hop');
      const mutedCreated = window.loopSources.length - before;
      audio.setMuted(false);
      audio.syncLoops([{ id: 'music', cue: 'music', gain: .5 }]);
      const final = window.loopSources.at(-1);
      audio.dispose();
      return { usesClip, safeCopy, usesFallback, allStopped, mutedCreated, disposedStopped: final.stops, disposedDisconnected: final.disconnects };
    });
    assert.deepEqual(custom, { usesClip: true, safeCopy: true, usesFallback: true, allStopped: true, mutedCreated: 3, disposedStopped: 1, disposedDisconnected: 1 });
  } finally { await closeAudioPage(page); }
});

test('external clip decoding stays offline and rejects corrupt, oversized or overly long audio', async () => {
  const page = await audioPage();
  try {
    const result = await page.evaluate(async () => {
      const { GameAudio, MAX_CLIP_BYTES } = window.audioModule;
      let audibleContexts = 0;
      const NativeAudioContext = window.AudioContext;
      window.AudioContext = class extends NativeAudioContext { constructor(options) { super(options); audibleContexts++; } };
      function wav(seconds, channels = 1) {
        const rate = 8_000, frames = Math.ceil(seconds * rate), size = frames * channels * 2;
        const bytes = new ArrayBuffer(44 + size), view = new DataView(bytes);
        function text(offset, value) { [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0))); }
        text(0, 'RIFF'); view.setUint32(4, 36 + size, true); text(8, 'WAVE'); text(12, 'fmt ');
        view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
        view.setUint32(24, rate, true); view.setUint32(28, rate * channels * 2, true);
        view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, size, true);
        for (let i = 0; i < frames * channels; i++) view.setInt16(44 + i * 2, Math.sin(i * 0.2) * 8_000, true);
        return bytes;
      }
      const audio = new GameAudio();
      const valid = await audio.decode(wav(0.1));
      const music = await audio.decode(wav(24), 'music');
      const ambience = await audio.decode(wav(8), 'ambience.wind');
      audio.setClips({ music, 'ambience.wind': ambience });
      const durations = { music: music.duration, ambience: ambience.duration };
      const rejectedLong = [];
      for (const [seconds, cue] of [[64.1, 'music'], [12.1, 'ambience.water'], [3.1, 'death.water'], [3.1, 'call.duck']]) {
        try { await audio.decode(wav(seconds), cue); rejectedLong.push(false); } catch { rejectedLong.push(true); }
      }
      audio.setClips({ hop: valid }, 'arcade');
      const failures = [];
      for (const bytes of [new ArrayBuffer(0), new ArrayBuffer(MAX_CLIP_BYTES + 1), new Uint8Array([1, 2, 3]).buffer, wav(3.1), wav(0.1, 3)]) {
        try { await audio.decode(bytes); failures.push(false); } catch { failures.push(true); }
      }
      const context = new OfflineAudioContext(1, 100, 44_100);
      const invalid = context.createBuffer(1, 100, 44_100);
      invalid.getChannelData(0)[0] = NaN;
      let rejectsNonFinite = false;
      try { audio.setClips({ coin: invalid }); } catch { rejectsNonFinite = true; }
      audio.dispose();
      let rejectsDisposed = false;
      try { await audio.decode(wav(0.1)); } catch { rejectsDisposed = true; }
      return { duration: valid.duration, durations, rejectedLong, audibleContexts, failures, rejectsNonFinite, rejectsDisposed };
    });
    assert.ok(Math.abs(result.duration - 0.1) < 0.002);
    assert.equal(result.audibleContexts, 0);
    assert.deepEqual(result.durations, { music: 24, ambience: 8 });
    assert.deepEqual(result.rejectedLong, [true, true, true, true]);
    assert.deepEqual(result.failures, [true, true, true, true, true]);
    assert.equal(result.rejectsNonFinite, true);
    assert.equal(result.rejectsDisposed, true);
  } finally { await closeAudioPage(page); }
});

test('engines have tonal bodies, streams have separated droplets, and all world voices stay bounded', async () => {
  const page = await audioPage();
  try {
    const result = await page.evaluate(() => {
      const { builtinBuffer } = window.audioModule;
      const context = new OfflineAudioContext(1, 1, 22_050);
      function metrics(buffer) {
        const pcm = buffer.getChannelData(0), size = 2048, spectrum = new Float64Array(size / 2);
        // Hann-windowed FFT energy across the actual generated PCM, not a fingerprint comparison.
        for (let start = 0; start + size <= pcm.length; start += Math.floor(buffer.sampleRate * .13)) {
          const re = new Float64Array(size), im = new Float64Array(size);
          for (let i = 0; i < size; i++) re[i] = pcm[start + i] * (.5 - .5 * Math.cos(2 * Math.PI * i / (size - 1)));
          for (let i = 1, j = 0; i < size; i++) {
            let bit = size >> 1;
            for (; j & bit; bit >>= 1) j ^= bit;
            j ^= bit;
            if (i < j) [re[i], re[j]] = [re[j], re[i]];
          }
          for (let length = 2; length <= size; length <<= 1) {
            const step = -2 * Math.PI / length;
            for (let offset = 0; offset < size; offset += length) for (let k = 0; k < length / 2; k++) {
              const even = offset + k, odd = even + length / 2, c = Math.cos(step * k), s = Math.sin(step * k);
              const real = re[odd] * c - im[odd] * s, imaginary = re[odd] * s + im[odd] * c;
              re[odd] = re[even] - real; im[odd] = im[even] - imaginary;
              re[even] += real; im[even] += imaginary;
            }
          }
          for (let i = 1; i < spectrum.length; i++) spectrum[i] += re[i] ** 2 + im[i] ** 2;
        }
        let total = 0, bass = 0, treble = 0, weighted = 0, peak = 0;
        for (let i = 1; i < spectrum.length; i++) {
          const hz = i * buffer.sampleRate / size, power = spectrum[i];
          total += power; weighted += power * hz;
          if (hz < 500) bass += power;
          if (hz > 2000) treble += power;
        }
        const windows = [];
        for (let start = 0; start + 2205 <= pcm.length; start += 2205) {
          let power = 0;
          for (let i = start; i < start + 2205; i++) {
            if (!Number.isFinite(pcm[i])) throw new Error('nonfinite variant PCM');
            power += pcm[i] ** 2; peak = Math.max(peak, Math.abs(pcm[i]));
          }
          windows.push(Math.sqrt(power / 2205));
        }
        const average = windows.reduce((a, b) => a + b, 0) / windows.length;
        const deviation = Math.sqrt(windows.reduce((sum, value) => sum + (value - average) ** 2, 0) / windows.length);
        return { duration: buffer.duration, peak, bass: bass / total, treble: treble / total,
          centroid: weighted / total, modulation: deviation / average, rms: average,
          seam: Math.abs(pcm[0] - pcm.at(-1)) };
      }
      const results = [];
      for (const pack of ['pond', 'arcade']) {
        for (const variant of ['compact', 'sedan', 'truck', 'electric']) {
          results.push({ pack, cue: 'traffic.pass', variant, ...metrics(builtinBuffer(context, 'traffic.pass', pack, variant)) });
        }
        for (const variant of ['pond', 'orchard', 'bloom', 'dunes', 'frost', 'neon']) {
          for (const cue of ['ambience.water', 'ambience.wind', 'ambience.birds']) {
            results.push({ pack, cue, variant, ...metrics(builtinBuffer(context, cue, pack, variant)) });
          }
        }
      }
      return results;
    });
    await writeFile(new URL('sound-zone-quality.json', artifactRoot), JSON.stringify(result, null, 2) + '\n');
    for (const voice of result) {
      assert.ok(voice.peak > .001 && voice.peak < .5, `${voice.pack}/${voice.cue}/${voice.variant}: audible headroom`);
      assert.ok(voice.rms > .0001, `${voice.cue}/${voice.variant}: non-silent`);
      assert.ok(voice.seam < .00001, `${voice.cue}/${voice.variant}: click-free endpoints`);
      assert.ok(voice.duration <= (voice.cue.startsWith('ambience.') ? 12 : 3), 'variants respect imported cue duration bounds');
    }
    for (const pack of ['pond', 'arcade']) {
      const metric = (cue, variant) => result.find(row => row.pack === pack && row.cue === cue && row.variant === variant);
      const engines = result.filter(row => row.pack === pack && row.cue === 'traffic.pass');
      for (const engine of engines) {
        assert.ok(engine.bass > .70, `${engine.variant}: harmonic engine body dominates below 500 Hz (${engine.bass})`);
        assert.ok(engine.treble < .025, `${engine.variant}: little tire hiss above 2 kHz (${engine.treble})`);
        assert.ok(engine.modulation < .25, `${engine.variant}: sustained engine, with moderate throttle changes`);
      }
      for (const river of result.filter(row => row.pack === pack && row.cue === 'ambience.water')) {
        assert.ok(river.modulation > .35, `${river.variant}: separated bubbles and laps instead of constant wash (${river.modulation})`);
      }
      assert.ok(metric('ambience.water', 'pond').centroid > metric('traffic.pass', 'sedan').centroid * 2, 'pond occupies a different register from the road');
      assert.ok(metric('traffic.pass', 'electric').centroid > metric('traffic.pass', 'truck').centroid * 1.8, 'electric and heavy truck have distinct spectra, beyond playback-rate changes');
      assert.ok(metric('ambience.water', 'frost').centroid > metric('ambience.water', 'dunes').centroid * 2, 'ice melt and hollow oasis water are distinguishable');
      assert.ok(metric('ambience.wind', 'frost').centroid > metric('ambience.wind', 'neon').centroid * 4, 'ice chimes contrast with electrical hum');
    }
  } finally { await closeAudioPage(page); }
});

test('builtin variants are bounded, crossfade when ready, and preserve imported voices', async () => {
  const page = await audioPage();
  try {
    await page.evaluate(() => {
      const Native = window.AudioContext;
      window.variantSources = [];
      window.AudioContext = class extends Native {
        createBufferSource() {
          const source = super.createBufferSource(), entry = { source, starts: [], stops: 0 };
          const start = source.start.bind(source), stop = source.stop.bind(source);
          source.start = (...args) => { entry.starts.push(args); start(...args); };
          source.stop = (...args) => { entry.stops++; stop(...args); };
          window.variantSources.push(entry); return source;
        }
      };
      window.variantAudio = new window.audioModule.GameAudio();
      document.querySelector('button').onclick = () => window.variantAudio.unlock();
    });
    await page.locator('#unlock').click();
    const result = await page.evaluate(async () => {
      const { builtinBuffer } = window.audioModule, audio = window.variantAudio;
      await audio.prepare();
      audio.syncLoops([{ id: 'wind', cue: 'ambience.wind', gain: .3, variant: 'pond' }]);
      const first = window.variantSources.at(-1), context = first.source.context;
      const unknown = builtinBuffer(context, 'ambience.wind', 'pond', 'not-a-world') === first.source.buffer;
      const defaultAlias = builtinBuffer(context, 'ambience.wind', 'pond', 'pond') === first.source.buffer;
      const nonVariantCue = builtinBuffer(context, 'hop', 'pond', 'frost') === builtinBuffer(context, 'hop', 'pond');
      audio.syncLoops([{ id: 'wind', cue: 'ambience.wind', gain: .3, variant: 'frost' }]);
      const keptWhilePreparing = window.variantSources.length === 1 && first.stops === 0;
      // Flush the exact one deferred preparation job; no playback is queued by it.
      await new Promise(resolve => setTimeout(resolve, 0));
      const noQueuedPlayback = window.variantSources.length === 1;
      audio.syncLoops([{ id: 'wind', cue: 'ambience.wind', gain: .3, variant: 'frost' }]);
      const second = window.variantSources.at(-1);
      const replaced = second !== first && first.stops === 1
        && second.source.buffer === builtinBuffer(context, 'ambience.wind', 'pond', 'frost');
      const previousCount = window.variantSources.length;
      audio.syncLoops([{ id: 'wind', cue: 'ambience.wind', gain: .2, pan: .4, variant: 'frost' }]);
      const sameVariantRetained = window.variantSources.length === previousCount;
      audio.stop();
      audio.syncLoops([{ id: 'water', cue: 'ambience.water', gain: .3, variant: 'neon' }]);
      audio.stop();
      await new Promise(resolve => setTimeout(resolve, 0));
      const stopDuringPreparation = window.variantSources.length === previousCount;
      const imported = context.createBuffer(1, 22050, 22050), pcm = imported.getChannelData(0);
      for (let i = 0; i < pcm.length; i++) pcm[i] = Math.sin(i * 2 * Math.PI * 440 / 22050) * .1;
      audio.setClips({ 'ambience.wind': imported, 'traffic.pass': imported });
      audio.syncLoops([{ id: 'wind', cue: 'ambience.wind', gain: .3, variant: 'frost' }]);
      const custom = window.variantSources.at(-1), customCount = window.variantSources.length;
      audio.syncLoops([{ id: 'wind', cue: 'ambience.wind', gain: .3, variant: 'neon' }]);
      const importedRetained = customCount === window.variantSources.length && !custom.stops;
      audio.play('traffic.pass', { variant: 'truck' });
      const importedOneShot = window.variantSources.at(-1).source.buffer === imported;
      audio.setBuiltin('pond'); await audio.prepare();
      audio.syncLoops([{ id: 'car:1', cue: 'traffic.pass', gain: .3 }, { id: 'car:2', cue: 'traffic.pass', gain: .3 }]);
      const cars = window.variantSources.slice(-2);
      const staggered = cars[0].source.buffer === cars[1].source.buffer && cars[0].starts[0][1] !== cars[1].starts[0][1];
      audio.play('traffic.pass', { variant: 'electric' });
      const oneShotVariant = window.variantSources.at(-1).source.buffer === builtinBuffer(context, 'traffic.pass', 'pond', 'electric');
      audio.dispose();
      return { unknown, defaultAlias, nonVariantCue, keptWhilePreparing, noQueuedPlayback, replaced, sameVariantRetained,
        stopDuringPreparation, importedRetained, importedOneShot, staggered, oneShotVariant };
    });
    assert.deepEqual(result, Object.fromEntries(Object.keys(result).map(key => [key, true])));
  } finally { await closeAudioPage(page); }
});
