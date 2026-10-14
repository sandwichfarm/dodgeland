// Audition the actual production Soundscape -> GameAudio path. Terrain and actor
// trajectories are fixtures; all cue choices, gains, panning and fades are live.
// Usage: node tests/audio-zones.mjs [--source /snapshot/src] [--label before]
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argument = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const sourceRoot = resolve(argument('--source', resolve(root, 'src')));
const label = argument('--label', 'after');
assert.match(label, /^[a-z0-9-]+$/);
const modules = new Map();
const sourceHashes = {};
async function compile(name) {
  if (modules.has(name)) return;
  const source = await readFile(resolve(sourceRoot, `${name}.ts`), 'utf8');
  sourceHashes[`${name}.ts`] = createHash('sha256').update(source).digest('hex');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  modules.set(name, output);
  for (const [, dependency] of output.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+\.js)['"]/g)) {
    await compile(relative(sourceRoot, resolve(sourceRoot, dirname(name), dependency)).replace(/\.js$/, ''));
  }
}
await compile('audio'); await compile('soundscape');
const server = createServer((request, response) => {
  if (request.url === '/') { response.writeHead(200, { 'Content-Type': 'text/html' }); response.end('<!doctype html><title>Production soundscape audition</title>'); return; }
  const source = modules.get(request.url?.slice(1).replace(/\.js$/, ''));
  response.writeHead(source ? 200 : 404, { 'Content-Type': 'text/javascript' }); response.end(source ?? '');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const results = await page.evaluate(async () => {
    const { GameAudio } = await import('/audio.js');
    const { Soundscape } = await import('/soundscape.js');
    const { Game, generateLane, actorPositions } = await import('/game.js');
    const worlds = ['pond', 'orchard', 'bloom', 'dunes', 'frost', 'neon'];
    async function render(kind, ambienceOnly = false) {
      const rate = 24000, duration = 48;
      const context = new OfflineAudioContext(2, duration * rate, rate);
      Object.defineProperty(context, 'state', { get: () => 'running' });
      context.close = async () => {};
      window.AudioContext = function () { return context; };
      const audio = new GameAudio(); audio.unlock(); await audio.prepare();
      // Use the app’s persisted-settings defaults. A second render solos the
      // ambience bus so music and warning horns do not obscure its measurements.
      audio.setMix({ music: ambienceOnly ? 0 : .6, ambience: .65, effects: ambienceOnly ? 0 : 1 });
      const game = new Game(0, 'pond', 'stroll'); game.state = 'playing';
      game.rows.clear(); game.x = game.y = game.fromX = game.fromY = 0;
      const timeline = [], trace = [], events = [];
      const scene = new Soundscape({
        play(cue, options) { events.push({ time: game.time, cue, ...options }); audio.play(cue, options); },
        syncLoops(loops) {
          if (Math.abs(game.time * 4 - Math.round(game.time * 4)) < .01) {
            trace.push({ time: game.time, loops: structuredClone(loops), actors: [...game.rows.values()].filter(lane => lane.kind === 'road').map(lane => ({ row: lane.index, variant: lane.variant, length: lane.length, speed: lane.speed, positions: actorPositions(lane, game.time) })) });
          }
          audio.syncLoops(loops);
        },
      });
      const add = (index, terrain, world, options = {}) => {
        const lane = { ...generateLane(0, index, world), kind: terrain, blocked: [], coin: null, ...options };
        game.rows.set(index, lane); return lane;
      };
      let segment = -1;
      function update(time) {
        game.time = time;
        if (kind === 'zones') {
          const next = time < 10 ? 0 : time < 30 ? 1 : time < 44 ? 2 : 3;
          if (next !== segment) {
            segment = next; game.rows.clear(); add(0, 'meadow', 'pond');
            if (segment === 1) add(0, 'road', 'pond', { length: 1.15, variant: 0, speed: 2.2, spacing: 10, phase: -2.2 * 12 });
            if (segment === 2) add(0, 'river', 'pond', { length: 3.5, spacing: 5.1, speed: .9, phase: 0 });
            timeline.push({ time, label: ['Meadow', 'On the road: visible passing cars', 'On river platforms', 'Return to meadow'][segment] });
          }
        } else if (kind === 'worlds') {
          const next = Math.floor(time / 8);
          if (next !== segment) {
            segment = next; const world = worlds[segment]; game.rows.clear(); add(0, 'meadow', world);
            // A stream at a fixed distance makes biome palettes comparable.
            add(2, 'river', world, { length: 3.5, spacing: 5.1, speed: .9, phase: 0 });
            timeline.push({ time, label: `${world}: meadow beside a stream` });
          }
        } else {
          const next = Math.floor(time / 12);
          if (next !== segment) {
            segment = next; game.rows.clear();
            const profiles = ['compact', 'sedan', 'truck', 'electric'];
            // Choose real lane variants whose deterministic fleet assignment
            // covers all four powertrains, and let Soundscape select the voice.
            const fleetIndex = [0, 1, 0, 3][segment];
            const variant = (Math.imul(1, 73856093) ^ Math.imul(100, 19349663) ^ fleetIndex) >>> 0;
            add(0, 'road', 'pond', { length: segment === 2 ? 1.8 : 1.15, variant, speed: 2, spacing: 100, phase: -2 * (segment * 12 + 6) });
            timeline.push({ time, label: `${profiles[segment]}: one visible car, left to right` });
          }
        }
        scene.update(game);
      }
      update(0);
      const jobs = [];
      for (let frame = 1; frame < duration * 20; frame++) {
        const time = frame / 20;
        jobs.push(context.suspend(time).then(() => { update(time); return context.resume(); }));
      }
      const buffer = await context.startRendering(); await Promise.all(jobs); audio.dispose();
      const bytes = new Uint8Array(buffer.length * 4), view = new DataView(bytes.buffer);
      let peak = 0;
      for (let i = 0; i < buffer.length; i++) for (let channel = 0; channel < 2; channel++) {
        const value = buffer.getChannelData(channel)[i];
        if (!Number.isFinite(value)) throw new Error('Non-finite scene PCM');
        peak = Math.max(peak, Math.abs(value));
        view.setInt16((i * 2 + channel) * 2, Math.round(Math.max(-1, Math.min(1, value)) * 32767), true);
      }
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
      return { kind: `${kind}${ambienceOnly ? '-ambience' : ''}`, rate, duration, peak, timeline, trace, events, pcm: btoa(binary) };
    }
    return [await render('zones'), await render('zones', true), await render('worlds'), await render('worlds', true), await render('vehicles', true)];
  });
  assert.deepEqual(errors, [], 'No runtime exceptions during production scene updates');
  const output = resolve(root, 'artifacts'); await mkdir(output, { recursive: true });
  const report = { source: sourceRoot, sourceHashes, label, fixture: 'Production Soundscape and GameAudio with generated Lane objects, explicit terrain changes and vehicle positions advancing on the run clock. OfflineAudioContext runs actual audio nodes; no fake loop selection or gain envelopes. Full mix uses app defaults (music .6, ambience .65, effects 1); ambience tracks solo the ambience bus. These are reproducible listening fixtures, not a naturally played run. Metrics support contrast and headroom; they do not substitute for a subjective listening review.', renders: [] };
  for (const { pcm, ...rendered } of results) {
    assert.ok(rendered.peak > .005 && rendered.peak < .9, `${rendered.kind}: audible, unclipped production mix`);
    const data = Buffer.from(pcm, 'base64'), header = Buffer.alloc(44);
    header.write('RIFF', 0); header.writeUInt32LE(data.length + 36, 4); header.write('WAVEfmt ', 8);
    header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22);
    header.writeUInt32LE(rendered.rate, 24); header.writeUInt32LE(rendered.rate * 4, 28);
    header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(data.length, 40);
    const file = `audio-${rendered.kind}-${label}.wav`;
    await writeFile(resolve(output, file), Buffer.concat([header, data]));
    const channels = [new Float64Array(data.length / 4), new Float64Array(data.length / 4)];
    for (let frame = 0; frame < channels[0].length; frame++) for (let channel = 0; channel < 2; channel++) channels[channel][frame] = data.readInt16LE(frame * 4 + channel * 2) / 32767;
    const windows = [];
    for (let start = 0; start < rendered.duration; start += .25) windows.push({ time: start, ...measure(channels, rendered.rate, start, start + .25, false) });
    const segments = rendered.timeline.map((entry, index) => ({ ...entry, ...measure(channels, rendered.rate, entry.time + 1, rendered.timeline[index + 1]?.time ?? rendered.duration, true) }));
    report.renders.push({ ...rendered, file, segments, windows });
  }
  if (label !== 'before') {
    const full = report.renders.find(render => render.kind === 'zones');
    const ambience = report.renders.find(render => render.kind === 'zones-ambience');
    const road = ambience.segments[1], water = ambience.segments[2];
    assert.ok(full.segments[1].dynamicDb > 12, 'Passing cars have clear swell and recession in the full mix');
    assert.ok(full.segments[1].quietFraction > .3, 'The full road mix has breaks between cars');
    assert.ok(full.segments[1].rms > full.segments[0].rms * 1.5, 'Road activity is legible above the meadow floor');
    assert.ok(full.segments[2].rms > full.segments[0].rms * 1.2, 'The river has its own audible foreground');
    assert.ok(road.bands['40-150Hz'] + road.bands['150-350Hz'] > .7, 'Traffic is grounded in engines rather than broadband hiss');
    assert.ok(water.bands['350-800Hz'] + water.bands['800-1800Hz'] > .6, 'Water is resonant bubbles and droplets, separated from engine bass');
    assert.ok(cosine(Object.values(road.bands), Object.values(water.bands)) < .45, 'Road and stream spectra remain clearly separated');
    for (const segment of [road, water]) assert.ok(segment.bands['4000-10000Hz'] < .04, 'Broadband high-frequency hiss remains a small detail');
    const vehicles = report.renders.find(render => render.kind === 'vehicles-ambience');
    for (let i = 0; i < vehicles.segments.length; i++) {
      const passage = vehicles.windows.filter(window => window.time >= i * 12 + 4 && window.time < i * 12 + 8);
      assert.ok(Math.min(...passage.map(window => window.stereoBalance)) < -.45 && Math.max(...passage.map(window => window.stereoBalance)) > .45, 'Every visible vehicle passes from left to right in the rendered PCM');
    }
    assert.equal(new Set(vehicles.segments.map(segment => segment.dominantHz)).size, 4, 'Four vehicle classes have distinct dominant engine pitches');
    report.acceptance = 'PASS: finite unclipped PCM, full-mix road swells and gaps, audible terrain foregrounds, low traffic/high water spectral separation, low hiss, stereo passes and four distinct engine pitches.';
  }
  await writeFile(resolve(output, `audio-zones-${label}.json`), JSON.stringify(report, null, 2) + '\n');
  if (label === 'after') {
    let before;
    try { before = JSON.parse(await readFile(resolve(output, 'audio-zones-before.json'), 'utf8')); } catch { /* Baseline is optional for ordinary regression runs. */ }
    if (before) {
      const prior = before.renders.find(render => render.kind === 'zones');
      const current = report.renders.find(render => render.kind === 'zones');
      const oldSolo = before.renders.find(render => render.kind === 'zones-ambience');
      const newSolo = report.renders.find(render => render.kind === 'zones-ambience');
      const percent = value => `${(value * 100).toFixed(1)}%`, db = value => `${value.toFixed(1)} dB`;
      const bass = segment => segment.bands['40-150Hz'] + segment.bands['150-350Hz'];
      const drops = segment => segment.bands['350-800Hz'] + segment.bands['800-1800Hz'];
      await writeFile(resolve(output, 'audio-zone-comparison.md'), `# Production soundscape comparison\n\n${report.fixture}\n\nListen: [before](audio-zones-before.wav), [after](audio-zones-after.wav). Timeline: meadow 0–10 s, passing road traffic 10–30 s, stream 30–44 s, meadow 44–48 s.\n\n| Measurement | Before | After |\n| --- | --- | --- |\n| Full road mix: quieter windows | ${percent(prior.segments[1].quietFraction)} | ${percent(current.segments[1].quietFraction)} |\n| Full road mix: 90th/10th percentile RMS spread | ${db(prior.segments[1].dynamicDb)} | ${db(current.segments[1].dynamicDb)} |\n| Full mix: maximum peak | ${prior.peak.toFixed(3)} | ${current.peak.toFixed(3)} |\n| Road ambience energy at 40–350 Hz | ${percent(bass(oldSolo.segments[1]))} | ${percent(bass(newSolo.segments[1]))} |\n| Stream ambience energy at 350–1800 Hz | ${percent(drops(oldSolo.segments[2]))} | ${percent(drops(newSolo.segments[2]))} |\n| Stream ambience RMS | ${oldSolo.segments[2].rms.toFixed(5)} | ${newSolo.segments[2].rms.toFixed(5)} |\n\nQuiet windows are 250 ms RMS windows below 45% of the segment's 90th percentile level. Spectra use Hann-windowed FFTs and total energy from 40 Hz–10 kHz; these are descriptive measurements, not perceptual loudness scores. Source hashes, exact lane/actor positions, selected voices and raw metrics are in the JSON reports.\n\nAdditional auditions: [six worlds, full mix](audio-worlds-after.wav), [six worlds, ambience solo](audio-worlds-ambience-after.wav), [compact / sedan / truck / electric passages](audio-vehicles-ambience-after.wav), [terrain ambience solo](audio-zones-ambience-after.wav).\n\n${report.acceptance}\n`);
    }
  }
  console.log(JSON.stringify({ label, renders: report.renders.map(({ kind, peak, segments }) => ({ kind, peak, segments: segments.map(({ label, rms, bands, dynamicDb, quietFraction }) => ({ label, rms, bands, dynamicDb, quietFraction })) })) }, null, 2));
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }

function measure(channels, rate, start, end, spectral) {
  const from = Math.round(start * rate), to = Math.min(channels[0].length, Math.round(end * rate));
  const energy = [0, 0], quarterRms = []; let peak = 0;
  for (let sample = from; sample < to; sample++) {
    let sum = 0;
    for (let channel = 0; channel < 2; channel++) { const value = channels[channel][sample]; energy[channel] += value * value; sum += value * value; peak = Math.max(peak, Math.abs(value)); }
    const slot = Math.floor((sample - from) / (rate / 4)); quarterRms[slot] = (quarterRms[slot] ?? 0) + sum / (rate / 2);
  }
  const rms = Math.sqrt((energy[0] + energy[1]) / (2 * (to - from)));
  const levels = quarterRms.map(Math.sqrt).sort((a, b) => a - b);
  const low = levels[Math.floor(levels.length * .1)], high = levels[Math.min(levels.length - 1, Math.floor(levels.length * .9))];
  const result = { rms, peak, stereoBalance: (energy[1] - energy[0]) / Math.max(1e-12, energy[0] + energy[1]), dynamicDb: 20 * Math.log10(Math.max(high, 1e-9) / Math.max(low, 1e-9)), quietFraction: levels.filter(value => value < high * .45).length / levels.length };
  if (spectral) {
    const boundaries = [40, 150, 350, 800, 1800, 4000, 10000], energy = Array(boundaries.length - 1).fill(0);
    const size = 2048;
    const spectrum = new Float64Array(size / 2);
    for (let offset = from; offset + size < to; offset += size * 2) {
      const real = new Float64Array(size), imag = new Float64Array(size);
      for (let i = 0; i < size; i++) real[i] = (channels[0][offset + i] + channels[1][offset + i]) * .5 * (.5 - .5 * Math.cos(2 * Math.PI * i / (size - 1)));
      fft(real, imag);
      for (let bin = 1; bin < size / 2; bin++) {
        const hz = bin * rate / size, band = boundaries.findIndex((limit, index) => index < boundaries.length - 1 && hz >= limit && hz < boundaries[index + 1]);
        const power = real[bin] ** 2 + imag[bin] ** 2;
        if (band >= 0) energy[band] += power;
        // Keep the lowest audible engine fundamental when finding dominant
        // pitch; the truck can fall below the 40 Hz comparison-band floor.
        if (hz >= 20 && hz < 10000) spectrum[bin] += power;
      }
    }
    const total = energy.reduce((sum, value) => sum + value, 0);
    result.bands = Object.fromEntries(energy.map((value, index) => [`${boundaries[index]}-${boundaries[index + 1]}Hz`, value / Math.max(total, 1e-12)]));
    let dominant = 0, weighted = 0;
    for (let bin = 1; bin < spectrum.length; bin++) { if (spectrum[bin] > spectrum[dominant]) dominant = bin; weighted += spectrum[bin] * bin * rate / size; }
    result.dominantHz = dominant * rate / size;
    result.spectralCentroidHz = weighted / Math.max(spectrum.reduce((sum, power) => sum + power, 0), 1e-12);
  }
  return result;
}

function cosine(a, b) {
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  return dot / Math.sqrt(a.reduce((sum, value) => sum + value * value, 0) * b.reduce((sum, value) => sum + value * value, 0));
}

function fft(real, imag) {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
    if (i < j) { [real[i], real[j]] = [real[j], real[i]]; [imag[i], imag[j]] = [imag[j], imag[i]]; }
  }
  for (let span = 2; span <= n; span <<= 1) {
    const angle = -2 * Math.PI / span, c = Math.cos(angle), s = Math.sin(angle);
    for (let offset = 0; offset < n; offset += span) {
      let wr = 1, wi = 0;
      for (let i = 0; i < span / 2; i++) {
        const a = offset + i, b = a + span / 2, br = real[b] * wr - imag[b] * wi, bi = real[b] * wi + imag[b] * wr;
        real[b] = real[a] - br; imag[b] = imag[a] - bi; real[a] += br; imag[a] += bi;
        [wr, wi] = [wr * c - wi * s, wr * s + wi * c];
      }
    }
  }
}
