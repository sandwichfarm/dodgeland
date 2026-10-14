// Deterministic audition artifacts rendered through the production GameAudio mixer.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import ts from 'typescript';

const modules = new Map();
async function compile(name) {
  if (modules.has(name)) return;
  const source = await readFile(new URL(`../src/${name}.ts`, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  modules.set(name, output);
  for (const [, dependency] of output.matchAll(/from ['"]\.\/([^'"]+)\.js['"]/g)) await compile(dependency);
}
await compile('audio');
const server = createServer((request, response) => {
  const source = modules.get(request.url?.slice(1).replace(/\.js$/, ''));
  response.writeHead(source ? 200 : 404, { 'Content-Type': 'text/javascript' }); response.end(source ?? '');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ args: ['--mute-audio'] });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result = await page.evaluate(async () => {
    const { GameAudio, builtinBuffer } = await import('/audio.js');
    async function render(kind) {
      const rate = 24_000, duration = kind === 'scene' ? 32 : 54;
      const context = new OfflineAudioContext(2, duration * rate, rate);
      // Use the exact mixer, voices, panners and envelopes used in real gameplay.
      Object.defineProperty(context, 'state', { get: () => 'running' });
      context.close = async () => {};
      window.AudioContext = function () { return context; };
      const synthesisStart = performance.now(); builtinBuffer(new OfflineAudioContext(2, 1, rate), 'music', 'pond');
      const musicSynthesisMs = performance.now() - synthesisStart;
      const audio = new GameAudio();
      audio.unlock(); await audio.prepare(); audio.setMix({ music: .6, ambience: .65, effects: 1 });
      const timeline = [], jobs = [];
      function at(time, label, action) {
        timeline.push({ time, label });
        if (!time) action();
        else jobs.push(context.suspend(time).then(() => { action(); return context.resume(); }));
      }
      let loops = [];
      function beds(next) { loops = next; audio.syncLoops(loops); }
      const meadow = [{ id: 'music', cue: 'music', gain: 1 }, { id: 'wind', cue: 'ambience.wind', gain: .36 }];
      if (kind === 'scene') {
        at(0, 'Meadow: music and soft wind', () => beds(meadow));
        at(1, 'Distant birds', () => audio.play('ambience.birds', { gain: .45, pan: -.5 }));
        at(2, 'Butter quacks', () => audio.play('call.duck'));
        for (const time of [3, 3.5, 4, 4.5]) at(time, 'Hop', () => audio.play('hop'));
        at(5, 'Car approaches from left', () => beds([...meadow, { id: 'car', cue: 'traffic.pass', gain: .24, pan: -.9, rate: 1.04 }]));
        at(6, 'Car approaches traveler', () => beds([...meadow, { id: 'car', cue: 'traffic.pass', gain: .65, pan: -.3, rate: 1.03 }]));
        at(6.5, 'Nearby driver honks', () => audio.play('traffic.honk', { gain: .55, pan: -.25 }));
        at(7, 'Car passes to the right', () => beds([...meadow, { id: 'car', cue: 'traffic.pass', gain: .55, pan: .4, rate: .95 }]));
        at(8, 'Car recedes', () => beds([...meadow, { id: 'car', cue: 'traffic.pass', gain: .15, pan: .95, rate: .92 }]));
        at(9, 'Road quiets', () => beds(meadow));
        for (const time of [10, 10.5, 11, 11.5]) at(time, 'Crossing bell', () => audio.play('train', { gain: .62, pan: -.45 }));
        at(12, 'Train approaches', () => beds([...meadow, { id: 'train', cue: 'train.pass', gain: .3, pan: -.9, rate: 1.02 }]));
        at(13, 'Train crossing', () => beds([...meadow, { id: 'train', cue: 'train.pass', gain: .8, pan: -.3, rate: 1 }]));
        at(14, 'Train crosses center', () => beds([...meadow, { id: 'train', cue: 'train.pass', gain: .8, pan: .25, rate: .97 }]));
        at(15, 'Train recedes', () => beds([...meadow, { id: 'train', cue: 'train.pass', gain: .3, pan: .85, rate: .93 }]));
        at(16, 'Train leaves', () => beds(meadow));
        at(17, 'Collect coin', () => audio.play('coin'));
        at(18, 'River approaches', () => beds([...meadow, { id: 'water', cue: 'ambience.water', gain: .65, pan: .2 }]));
        at(19, 'Birds across the river', () => audio.play('ambience.birds', { gain: .35, pan: .6 }));
        for (const time of [20, 21, 22]) at(time, 'Hop across logs', () => audio.play('hop'));
        at(23, 'Butter quacks by the water', () => audio.play('call.duck'));
        at(25, 'Wave warning', () => audio.play('idle', { gain: .7 }));
        at(25.6, 'Wave warning', () => audio.play('idle', { gain: .8 }));
        at(26.1, 'Wave warning', () => audio.play('idle', { gain: .9 }));
        at(26.5, 'Wave catches Butter', () => { audio.stop(); audio.play('death.wave'); });
      } else {
        at(0, 'Music arrangement (12 seconds)', () => beds([{ id: 'music', cue: 'music', gain: 1 }]));
        at(12, 'Wind and water beds', () => { audio.stop(); beds([{ id: 'wind', cue: 'ambience.wind', gain: .65 }, { id: 'water', cue: 'ambience.water', gain: .65 }]); });
        at(16, 'Bird ambience', () => { audio.stop(); audio.play('ambience.birds'); });
        const cues = ['call.duck', 'train', 'train.pass', 'traffic.pass', 'traffic.honk', 'death.traffic', 'death.train', 'death.water', 'death.wave', 'death.swept', 'death.trail'];
        cues.forEach((cue, index) => at(19 + index * 3, cue, () => { audio.stop(); audio.play(cue); }));
      }
      const buffer = await context.startRendering(); await Promise.all(jobs); audio.dispose();
      let peak = 0;
      const channelEnergy = [0, 0], secondsRms = [];
      const bytes = new Uint8Array(buffer.length * 4), view = new DataView(bytes.buffer);
      for (let i = 0; i < buffer.length; i++) {
        let frameEnergy = 0;
        for (let ch = 0; ch < 2; ch++) {
          const value = buffer.getChannelData(ch)[i];
          if (!Number.isFinite(value)) throw new Error('Non-finite scene PCM');
          peak = Math.max(peak, Math.abs(value)); channelEnergy[ch] += value ** 2; frameEnergy += value ** 2;
          view.setInt16((i * 2 + ch) * 2, Math.round(Math.max(-1, Math.min(1, value)) * 32767), true);
        }
        const second = Math.floor(i / rate); secondsRms[second] = (secondsRms[second] ?? 0) + frameEnergy / (2 * rate);
      }
      let base64 = '';
      for (let offset = 0; offset < bytes.length; offset += 8192) base64 += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
      return { kind, rate, duration, musicSynthesisMs, peak, channelEnergy, secondsRms: secondsRms.map(Math.sqrt), timeline, pcm: btoa(base64) };
    }
    return [await render('scene'), await render('montage')];
  });
  await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
  const metrics = [];
  for (const { pcm, ...rendered } of result) {
    assert.ok(rendered.peak > .01 && rendered.peak < .9, `${rendered.kind} should have audible, unclipped PCM`);
    const data = Buffer.from(pcm, 'base64'), header = Buffer.alloc(44);
    header.write('RIFF', 0); header.writeUInt32LE(data.length + 36, 4); header.write('WAVEfmt ', 8);
    header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22);
    header.writeUInt32LE(rendered.rate, 24); header.writeUInt32LE(rendered.rate * 4, 28);
    header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(data.length, 40);
    await writeFile(new URL(`../artifacts/soundscape-${rendered.kind}.wav`, import.meta.url), Buffer.concat([header, data]));
    metrics.push(rendered);
  }
  await writeFile(new URL('../artifacts/soundscape-audition.json', import.meta.url), JSON.stringify(metrics, null, 2) + '\n');
  console.log('Rendered artifacts/soundscape-scene.wav, soundscape-montage.wav and audition metrics through GameAudio.');
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
