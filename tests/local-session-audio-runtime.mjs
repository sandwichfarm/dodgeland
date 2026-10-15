// Actual production audio buffers, observed in a muted opaque iframe. No
// application exports, callback substitutes, or simulated player models.
import assert from 'node:assert/strict';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import test from 'node:test';
import { chromium } from 'playwright';

const artifact = new URL('../dist/index.html', import.meta.url);
const built = await readFile(artifact, 'utf8');
const inputs = ['main.ts', 'session-ui.ts', 'session-ui.css', 'session-input.ts', 'keyboard-input.ts', 'audio.ts'];
const dates = await Promise.all(inputs.map(path => stat(new URL(`../src/${path}`, import.meta.url))));
assert.ok((await stat(artifact)).mtimeMs >= Math.max(...dates.map(value => value.mtimeMs)), 'Build current sources before the audio integration test.');

function installRuntime(selected) {
  Math.random = () => 0;
  const evidence = window.sessionAudio = { voices: [], hydrated: false, writes: [] };
  const Native = window.AudioContext;
  window.AudioContext = class extends Native {
    createBufferSource() {
      const source = super.createBufferSource(), start = source.start.bind(source);
      source.start = (...args) => {
        let fingerprint = 2166136261;
        for (const sample of source.buffer?.getChannelData(0) ?? []) fingerprint = Math.imul(fingerprint ^ Math.round(sample * 1e6), 16777619);
        evidence.voices.push({ fingerprint, loop: source.loop });
        return start(...args);
      };
      return source;
    }
  };
  window.napplet = {
    storage: {
      async getItem(key) {
        if (key !== 'puddlehop.progress.v1') return null;
        evidence.hydrated = true;
        return JSON.stringify({ selected, travelerVersion: 2, coins: 1000, best: 1000, mode: 'stroll', muted: false });
      },
      async setItem(key, value) { evidence.writes.push({ key, value }); },
    },
    gamepad: {},
  };
}
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const harness = `<!doctype html><meta charset="utf-8"><body style="margin:0">
<iframe id="napplet" sandbox="allow-scripts" style="border:0;width:900px;height:600px"></iframe><script>
const frame=document.querySelector('iframe'), built=${json(built)}, install=${json(installRuntime.toString())};
window.send=pads=>frame.contentWindow.postMessage({type:'gamepad.state',available:true,focused:true,pads},'*');
addEventListener('message',event=>{if(event.source===frame.contentWindow&&event.data?.type==='gamepad.subscribe')window.send([]);});
const selected=new URLSearchParams(location.search).get('selected');
frame.srcdoc=built.replace('<head>','<head><script>('+install+')('+JSON.stringify(selected)+')<'+'/script>');
</script>`;
const pad = (index, pressed = []) => ({ index, id: `Audio controller ${index + 1}`, mapping: 'standard', connected: true, timestamp: 1,
  axes: [0, 0], buttons: Array.from({ length: 17 }, (_, button) => ({ pressed: pressed.includes(button), touched: false, value: pressed.includes(button) ? 1 : 0 })) });

test('four assigned travelers call independently of the saved solo traveler and each other’s cooldown', { timeout: 60_000 }, async () => {
  const server = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(harness); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const errors = [];
  try {
    browser = await chromium.launch({ args: ['--mute-audio'] });
    async function mount(selected, clock = false) {
      const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
      page.setDefaultTimeout(4000);
      page.on('pageerror', error => errors.push(error.message));
      if (clock) await page.clock.install();
      await page.goto(`http://127.0.0.1:${server.address().port}/?selected=${selected}`, { waitUntil: 'domcontentloaded' });
      const frame = await (await page.locator('#napplet').elementHandle()).contentFrame();
      await frame.waitForFunction(() => window.sessionAudio?.hydrated);
      assert.equal(await frame.evaluate(() => location.origin), 'null');
      await frame.waitForFunction(() => document.querySelector('#character-call')?.getAttribute('aria-label')?.startsWith('Make '));
      return { page, frame };
    }
    const effects = frame => frame.evaluate(() => window.sessionAudio.voices.filter(voice => !voice.loop).map(voice => voice.fingerprint));
    const fingerprints = {};
    // Calibrate through the game's existing solo call control, using the same
    // built artifact and real AudioContext as the multiplayer run below.
    for (const [id, name] of [['sunny', 'Sunny'], ['butter', 'Butter'], ['pip', 'Pip'], ['petal', 'Petal'], ['rust', 'Rust']]) {
      const { page, frame } = await mount(id);
      try {
        await frame.waitForFunction(name => document.querySelector('#character-call')?.getAttribute('aria-label')?.startsWith(`Make ${name} `), name);
        if (!await frame.locator('#character-call').isVisible()) await frame.locator('#play').click();
        const before = (await effects(frame)).length;
        await frame.locator('#character-call').click();
        await frame.waitForFunction(count => window.sessionAudio.voices.filter(voice => !voice.loop).length > count, before);
        const after = await effects(frame);
        assert.equal(after.length, before + 1, `${name} calibration must emit one actual call`);
        fingerprints[id] = after.at(-1);
      } catch (error) {
        await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
        await page.locator('#napplet').screenshot({ path: new URL(`../artifacts/local-session-audio-failure-${id}.png`, import.meta.url).pathname });
        await writeFile(new URL('../artifacts/local-session-audio-failure.json', import.meta.url), JSON.stringify(await frame.evaluate(() => ({
          state: document.querySelector('#app')?.dataset.runState,
          setupHidden: document.querySelector('#local-session-setup')?.hidden,
          boardHidden: document.querySelector('#session-board')?.hidden,
          selectorMatches: document.querySelector('#app')?.matches(':has(#session-board:not([hidden]))'),
          playDisplay: getComputedStyle(document.querySelector('#play')).display,
          readyDisplay: getComputedStyle(document.querySelector('#ready-content')).display,
        })), null, 2));
        throw error;
      } finally { await page.close(); }
    }
    assert.equal(new Set(Object.values(fingerprints)).size, 5, 'the four assigned calls and saved host call have distinct PCM');

    const { page, frame } = await mount('rust', true);
    await frame.waitForFunction(() => document.querySelector('#character-call')?.getAttribute('aria-label')?.startsWith('Make Rust '));
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 50);
    const send = async (first = [], second = []) => {
      await page.evaluate(pads => window.send(pads), [pad(0, first), pad(1, second)]);
      await page.waitForTimeout(20);
      await page.clock.runFor(1);
    };
    await send(); await send([0]); await send(); await send([], [0]); await send();
    assert.equal(await frame.locator('#local-session-setup').isVisible(), true);
    // P2 reserves Butter; choose Sunny for P1 without changing saved Rust.
    for (let attempts = 0; attempts < 7 && (await frame.locator('.session-character-choice strong').innerText()) !== 'Sunny'; attempts++) {
      await frame.getByRole('button', { name: 'Next available traveler' }).click();
    }
    assert.equal(await frame.locator('.session-character-choice strong').innerText(), 'Sunny');
    await frame.getByRole('button', { name: 'Add Keyboard A', exact: true }).click();
    await frame.getByRole('button', { name: 'Add Keyboard B', exact: true }).click();
    for (const [seat, name] of [['p1', 'Sunny'], ['p2', 'Butter'], ['p3', 'Pip'], ['p4', 'Petal']]) {
      assert.match(await frame.locator(`#session-roster [data-seat="${seat}"]`).innerText(), new RegExp(name));
    }
    const countCalls = async () => {
      const values = await effects(frame);
      return Object.fromEntries(Object.entries(fingerprints).map(([id, fingerprint]) => [id, values.filter(value => value === fingerprint).length]));
    };
    const inSetup = await countCalls();
    await send([2], [2]); await send();
    assert.deepEqual(await countCalls(), inSetup, 'controller calls stay gated while choosing the roster');
    await frame.locator('#local-session-start').click();
    await page.clock.runFor(20);
    assert.equal(await frame.locator('#session-seats [data-seat]').count(), 4);
    await frame.locator('#scene').focus();
    const before = await countCalls();
    async function callAll() {
      await page.keyboard.press('q'); await page.keyboard.press('.');
      await send([2], [2]);
      await page.clock.runFor(20);
    }
    await callAll();
    const once = await countCalls();
    for (const id of ['sunny', 'butter', 'pip', 'petal']) assert.equal(once[id], before[id] + 1, `${id} must call once despite other seats calling in the same cooldown window`);
    assert.equal(once.rust, before.rust, 'the saved solo traveler must not replace any assigned call');
    await send([2], [2]);
    assert.deepEqual(await countCalls(), once, 'held controller buttons do not repeat calls');
    await send(); await callAll();
    assert.deepEqual(await countCalls(), once, 'fresh edges inside each seat’s cooldown remain silent');
    await send(); await page.clock.runFor(500); await callAll();
    const twice = await countCalls();
    for (const id of ['sunny', 'butter', 'pip', 'petal']) assert.equal(twice[id], once[id] + 1, `${id} can call again after its own cooldown`);
    assert.equal(twice.rust, before.rust);

    await send(); await frame.locator('#pause').click(); await page.clock.runFor(500);
    assert.equal(await frame.locator('#app').getAttribute('data-run-state'), 'paused');
    await callAll();
    assert.deepEqual(await countCalls(), twice, 'pause blocks calls even after their cooldowns expire');
    // Shared Local Play hides the solo run panel while paused, so its visible
    // pause control is the user-facing resume action.
    await send(); await frame.locator('#pause').click(); await frame.locator('#scene').focus();
    assert.equal(await frame.locator('#app').getAttribute('data-run-state'), 'playing');
    await frame.locator('#sound-toggle').click(); await frame.locator('#scene').focus();
    assert.equal(await frame.locator('#sound-toggle').getAttribute('aria-pressed'), 'true');
    await page.clock.runFor(500); await callAll();
    assert.deepEqual(await countCalls(), twice, 'the real mute control suppresses every assigned call');
    await send(); await frame.locator('#sound-toggle').click(); await frame.locator('#scene').focus();
    await callAll();
    const unmuted = await countCalls();
    for (const id of ['sunny', 'butter', 'pip', 'petal']) assert.equal(unmuted[id], twice[id] + 1, `${id} resumes calling after unmute`);
    assert.deepEqual(errors, []);
    await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
    await writeFile(new URL('../artifacts/local-session-audio-runtime.json', import.meta.url), JSON.stringify({
      artifact: 'built opaque iframe, real AudioContext buffers, muted browser',
      assigned: { p1: 'sunny', p2: 'butter', p3: 'pip', p4: 'petal' }, saved: 'rust', fingerprints,
      scenarios: ['setup call guard', 'four assigned calls', 'independent cooldown', 'held-edge suppression', 'cooldown expiry', 'pause call guard', 'mute and unmute'], errors,
    }, null, 2));
    await page.close();
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
