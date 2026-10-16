import { artifactForCoverage, artifactDirectoryForCoverage, registerRealm, collectRealm } from '../tools/release-coverage/browser.mjs';
// Built-artifact integration in an opaque allow-scripts iframe. Chrome debugger
// scopes supply explicit late-score / clear-meadow scenario fixtures; this is
// not an end-to-end claim that a human or autoplay route survived the first 480
// rows. The shipped module is unchanged. Real controls, game updates, mob AI,
// rendering, messages, persistence, and Web Audio perform every encounter.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const built = await readFile(artifactForCoverage(new URL('../dist/index.html', import.meta.url)), 'utf8');
assert.ok(built.includes('mob.spawn') && built.includes('death.mob'), 'Build the current mob implementation first.');
const output = artifactDirectoryForCoverage(new URL('../artifacts/', import.meta.url), 'mob-runtime');
await mkdir(output, { recursive: true });

function installFixture() {
  Math.random = () => 0;
  const observation = window.mobFixture = { voices: [], writes: [], hydrated: false };
  const Native = window.AudioContext;
  window.AudioContext = class extends Native {
    createBufferSource() {
      const source = super.createBufferSource();
      const voice = { loop: false, fingerprint: 0, duration: 0, stops: 0, ended: false };
      const start = source.start.bind(source), stop = source.stop.bind(source);
      source.start = (...args) => {
        voice.loop = source.loop; voice.duration = source.buffer?.duration ?? 0;
        let fingerprint = 2166136261;
        for (const sample of source.buffer?.getChannelData(0) ?? []) fingerprint = Math.imul(fingerprint ^ Math.round(sample * 1e6), 16777619);
        voice.fingerprint = fingerprint; observation.voices.push(voice);
        return start(...args);
      };
      source.stop = (...args) => { voice.stops++; return stop(...args); };
      source.addEventListener('ended', () => { voice.ended = true; });
      return source;
    }
  };
  window.napplet = {
    storage: {
      async getItem() { observation.hydrated = true; return null; },
      async setItem(key, value) { observation.writes.push({ key, value }); },
    },
  };
}
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const injected = `<script>(${installFixture.toString()})();</script>`;
const harness = `<!doctype html><body style="margin:0"><iframe id="napplet" title="Mob integration fixture" sandbox="allow-scripts" style="border:0;width:900px;height:600px"></iframe><script>
const artifact = ${json(built.replace('<head>', '<head>' + injected))};
window.mount = () => { document.querySelector('iframe').srcdoc = artifact; };
window.mount();</script>`;
const server = createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(harness);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const evidence = { artifact: 'unmodified production module; opaque allow-scripts iframe',
  fixture: 'CDP closure inspection supplies score-minus-one, elapsed run time, earlier encounter history for isolated crab/wasp scenes, expired earlier market invitations, and clear meadow terrain; subsequent controls and simulation are real',
  scenarios: [], errors: [], external: [] };
let browser, frame, identity, generation = 0;
async function beginRealm(page) {
  if (frame) await collectRealm(frame, identity);
  frame = undefined;
  identity = { suite: process.argv[1], scenario: 'mob-runtime', frame: 'opaque-app', generation: generation++, scope: 'current' };
  registerRealm(page, identity);
}
try {
  browser = await chromium.launch({ args: ['--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  page.setDefaultTimeout(8000);
  await page.clock.install();
  const cdp = await page.context().newCDPSession(page), contexts = new Map();
  cdp.on('Runtime.executionContextCreated', ({ context }) => contexts.set(context.id, context));
  cdp.on('Runtime.executionContextDestroyed', ({ executionContextId }) => contexts.delete(executionContextId));
  cdp.on('Runtime.executionContextsCleared', () => contexts.clear());
  await cdp.send('Runtime.enable');
  page.on('pageerror', error => evidence.errors.push(error.message));
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
    evidence.external.push(route.request().url()); return route.abort();
  });
  await beginRealm(page);
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  async function currentFrame() {
    frame = await (await page.locator('#napplet').elementHandle()).contentFrame();
    await frame.locator('#sound-preview-cue option[value="death.mob"]').waitFor({ state: 'attached' });
    await frame.waitForFunction(() => window.mobFixture?.hydrated);
    return frame;
  }
  await currentFrame();
  assert.equal(await frame.evaluate(() => location.origin), 'null');
  assert.equal(await page.locator('iframe').getAttribute('sandbox'), 'allow-scripts');

  // Obtain the actual live Game from the click handler's module scope. No
  // generated variable names, source rewriting, or production debug hook.
  async function gameObject() {
    const { frameTree } = await cdp.send('Page.getFrameTree');
    const frameId = frameTree.childFrames[0].frame.id;
    const context = [...contexts.values()].find(candidate => candidate.auxData?.frameId === frameId && candidate.auxData?.isDefault);
    assert.ok(context, 'opaque app frame has a debugger execution context');
    const { result: handler } = await cdp.send('Runtime.evaluate', {
      contextId: context.id, includeCommandLineAPI: true,
      expression: 'getEventListeners(document.getElementById("pause")).click[0].listener',
    });
    const details = await cdp.send('Runtime.getProperties', { objectId: handler.objectId, ownProperties: true });
    const scopes = details.internalProperties.find(property => property.name === '[[Scopes]]').value;
    const list = await cdp.send('Runtime.getProperties', { objectId: scopes.objectId, ownProperties: true });
    for (const scope of list.result) {
      if (!scope.value?.objectId || scope.value.description === 'Global') continue;
      const bindings = await cdp.send('Runtime.getProperties', { objectId: scope.value.objectId, ownProperties: true });
      for (const binding of bindings.result) {
        if (binding.value?.type !== 'object' || !binding.value.objectId) continue;
        const match = await cdp.send('Runtime.callFunctionOn', {
          objectId: binding.value.objectId, returnByValue: true,
          functionDeclaration: 'function() { return this?.rows instanceof Map && typeof this.move === "function" && typeof this.update === "function" && Array.isArray(this.mobs); }',
        });
        if (match.result.value) return binding.value.objectId;
      }
    }
    throw new Error('Could not locate the actual Game in module debugger scopes.');
  }
  async function onGame(fn, ...args) {
    const result = await cdp.send('Runtime.callFunctionOn', {
      objectId: await gameObject(), functionDeclaration: fn.toString(), returnByValue: true,
      arguments: args.map(value => ({ value })),
    });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  const snapshot = () => onGame(function () {
    return { state: this.state, score: this.maxY, x: this.x, y: this.y, time: this.time, hop: this.hop,
      cause: this.deathCause, warning: this.warning, market: this.run.market, mobs: this.mobs.map(mob => ({ ...mob })) };
  });
  async function advance(ms) { await page.clock.runFor(ms); }
  async function move(direction) { await frame.locator(`[data-direction="${direction}"]`).dispatchEvent('click'); await advance(160); }
  const effects = () => frame.evaluate(() => window.mobFixture.voices.filter(voice => !voice.loop));
  const heard = async fingerprint => (await effects()).filter(voice => voice.fingerprint === fingerprint).length;

  // The built preview controls establish the three expected PCM identities.
  await frame.locator(await frame.locator('#choose').isVisible() ? '#choose' : '#collection').click(); await frame.locator('#sounds-tab').click();
  for (let page = 0; page < 6 && await frame.locator('#drawer').getAttribute('data-collection-sound') !== 'preview'; page++) await frame.locator('#collection-next').click();
  assert.equal(await frame.locator('#sound-preview-cue').isVisible(), true);
  const fingerprints = {};
  for (const cue of ['mob.spawn', 'mob.attack', 'death.mob']) {
    await frame.locator('#sound-preview-cue').selectOption(cue);
    await frame.locator('#sound-preview').click();
    fingerprints[cue] = (await effects()).at(-1).fingerprint;
  }
  assert.equal(new Set(Object.values(fingerprints)).size, 3);
  await frame.locator('#close-drawer').click();
  await page.clock.pauseAt((await frame.evaluate(() => Date.now())) + 50);

  async function stage(threshold, elapsed = 45, priorEncounters = true) {
    await onGame(function (score, time, priorEncounters) {
      this.state = 'ready';
      this.x = this.fromX = 0; this.y = this.fromY = this.maxY = score - 1;
      this.time = time; this.idle = this.hop = 0; this.waveRow = score - 7;
      this.run.advanceScore(score - 1); this.run.tick(16);
      this.mobDirector.introduced = new Set(priorEncounters ? score >= 480 ? ['slime', 'crab'] : score >= 320 ? ['slime'] : [] : []);
      this.ensureRows();
      for (const lane of this.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null });
    }, threshold, elapsed, priorEncounters);
    // Let the normal camera catch up to the fixture's distant ready position
    // before starting simulation; spawn screenshots then show the encounter.
    await advance(1600);
    await frame.locator('#play').click();
    assert.equal((await snapshot()).state, 'playing', 'visible Play starts the staged ready run before movement');
  }
  async function remount() {
    await beginRealm(page);
    await page.evaluate(() => window.mount()); await currentFrame();
    await frame.locator('#character-call').dispatchEvent('click');
    // A previous trusted gesture grants audio on this same iframe/document flow.
    await advance(32);
  }

  // Both gates must hold. Late elapsed time cannot bypass the score gate,
  // and a fast route cannot introduce a mob before 45 simulation seconds.
  await stage(159, 60); await move('forward');
  assert.equal((await snapshot()).mobs.length, 0, '159 points remains peaceful even after 60 seconds');
  await remount(); await stage(160, 10); await move('forward'); await advance(1000);
  assert.equal((await snapshot()).mobs.length, 0, '160 points alone cannot skip the opening time gate');
  evidence.scenarios.push({ gate: 'score and elapsed simulation time', scoreOnly: 160, timeOnly: 60, spawns: 0 });
  await remount(); await stage(320, 45, false); await move('forward');
  const lateDebut = await snapshot();
  assert.equal(lateDebut.mobs.length, 1, JSON.stringify(lateDebut)); assert.equal(lateDebut.mobs[0].kind, 'slime', 'a fast run still meets the gentle species first');
  evidence.scenarios.push({ gate: 'debut order', score: 320, earlierEncounters: [], firstSpecies: lateDebut.mobs[0].kind });
  await remount(); await stage(200); await move('forward');
  const shoppingInvitation = await snapshot();
  assert.equal(shoppingInvitation.market?.milestone, 200);
  assert.equal(shoppingInvitation.mobs.length, 0, 'a fresh market invitation gets attention without a new pursuer');
  assert.equal(await frame.locator('#market-open').isVisible(), true);
  evidence.scenarios.push({ gate: 'market invitation', milestone: 200, spawns: 0 });

  for (const [threshold, kind, name] of [[160, 'slime', 'Moss Slime'], [320, 'crab', 'Snap Crab'], [480, 'wasp', 'Bramble Wasp']]) {
    await remount(); await stage(threshold);
    const before = await snapshot();
    assert.equal(before.score, threshold - 1); assert.equal(before.mobs.length, 0);
    assert.equal(before.market, null, 'fixture expires earlier invitations before staging the encounter');
    const starts = await heard(fingerprints['mob.spawn']);
    await move('forward');
    const spawned = await snapshot();
    assert.equal(spawned.score, threshold); assert.equal(spawned.state, 'playing');
    assert.ok(spawned.time >= 45);
    assert.equal(spawned.mobs.length, 1); assert.equal(spawned.mobs[0].kind, kind);
    assert.equal(spawned.mobs[0].phase, 'spawning');
    assert.ok(spawned.mobs[0].phaseLeft > 1.6, 'arrival leaves almost the full 1.8 second grace period');
    assert.equal(await heard(fingerprints['mob.spawn']), starts + 1, `${kind}: genuine spawn dispatch plays its cue`);
    assert.match(await frame.locator('#toast').textContent(), new RegExp(`${name} spotted!`));
    await page.locator('iframe').screenshot({ path: new URL(`mob-runtime-${kind}-spawn.png`, output).pathname });

    await frame.locator('#pause').dispatchEvent('click');
    const paused = await snapshot(), pausedEffects = (await effects()).length;
    assert.equal(paused.state, 'paused');
    await advance(1800);
    assert.deepEqual(await snapshot(), paused, `${kind}: pause freezes actual mob phases, positions and run clock`);
    assert.equal((await effects()).length, pausedEffects, `${kind}: pause does not emit mob cues`);
    assert.equal(await frame.evaluate(() => window.mobFixture.voices.every(voice => voice.stops || voice.ended)), true, 'pause releases all scene audio');
    await frame.locator('#pause').dispatchEvent('click');
    const attacks = await heard(fingerprints['mob.attack']);
    await advance(1900);
    const walking = await snapshot();
    assert.equal(walking.state, 'playing');
    assert.equal(walking.mobs[0].phase, 'walking', `${kind}: approach begins with continuous walking`);
    await advance(240);
    let active = await snapshot();
    assert.equal(active.mobs[0].phase, 'walking');
    const distance = state => Math.hypot(state.mobs[0].x - state.x, state.mobs[0].y - state.y);
    assert.ok(distance(active) < distance(walking) - .01, `${kind}: walking visibly approaches the duck`);
    assert.equal(await heard(fingerprints['mob.attack']), attacks, `${kind}: ordinary walking emits no attack alert`);
    await page.locator('iframe').screenshot({ path: new URL(`mob-runtime-${kind}-walking.png`, output).pathname });
    const encounter = { threshold, kind, spawn: spawned.mobs[0], walking: active.mobs[0], pausedMs: 1800 };

    if (kind !== 'slime') {
      // Real hop controls approach the attacker until it commits. No fixture
      // injects a windup or invokes its sound/notification callback.
      for (let attempts = 0; attempts < 24 && active.mobs[0]?.phase === 'walking'; attempts++) {
        const mob = active.mobs[0], dx = mob.x - active.x, dy = mob.y - active.y;
        if (Math.hypot(dx, dy) > (kind === 'crab' ? 1.15 : 1.6)) {
          await move(Math.abs(dx) > Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'back' : 'forward');
        } else await advance(80);
        active = await snapshot();
      }
      assert.equal(active.state, 'playing');
      assert.equal(active.mobs[0]?.phase, 'windup', `${kind}: proximity triggers a readable windup ${JSON.stringify(active)}`);
      assert.equal(await heard(fingerprints['mob.attack']), attacks + 1);
      const attack = active.mobs[0];
      assert.ok(Math.hypot(attack.targetX - attack.fromX, attack.targetY - attack.fromY) <= (kind === 'crab' ? 1.4 : 1.9), 'strike is a short committed movement');
      encounter.windup = attack;
      await page.locator('iframe').screenshot({ path: new URL(`mob-runtime-${kind}-windup.png`, output).pathname });

      // Leave the committed path during its generous windup, then inspect the
      // actual eased strike and the stationary recovery that rewards dodging.
      const dx = attack.targetX - attack.fromX, dy = attack.targetY - attack.fromY;
      const evade = Math.abs(dy) >= Math.abs(dx) ? active.x <= 0 ? 'right' : 'left' : 'forward';
      await move(evade); await move(evade);
      active = await snapshot();
      for (let ticks = 0; ticks < 60 && active.mobs[0]?.phase === 'windup'; ticks++) {
        await advance(24); active = await snapshot();
      }
      assert.equal(active.state, 'playing'); assert.equal(active.mobs[0]?.phase, 'moving');
      const moving = active.mobs[0];
      await advance(Math.max(16, moving.phaseDuration * 1000 * .3));
      active = await snapshot();
      const strike = active.mobs[0];
      assert.equal(strike.phase, 'moving');
      const t = 1 - strike.phaseLeft / strike.phaseDuration;
      const eased = kind === 'crab' ? 1 - (1 - t) ** 3 : t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      assert.ok(Math.abs(strike.x - (strike.fromX + (strike.targetX - strike.fromX) * eased)) < .001);
      assert.ok(Math.abs(strike.y - (strike.fromY + (strike.targetY - strike.fromY) * eased)) < .001);
      encounter.strike = { ...strike, progress: t, easing: kind === 'crab' ? 'easeOutCubic' : 'easeInOutCubic' };
      await page.locator('iframe').screenshot({ path: new URL(`mob-runtime-${kind}-strike.png`, output).pathname });
      for (let ticks = 0; ticks < 60 && active.mobs[0]?.phase === 'moving'; ticks++) {
        await advance(24); active = await snapshot();
      }
      assert.equal(active.state, 'playing'); assert.equal(active.mobs[0]?.phase, 'rest');
      const resting = active.mobs[0];
      assert.ok(resting.phaseLeft > (kind === 'crab' ? 1.9 : 2.3));
      await advance(240); active = await snapshot();
      assert.equal(active.mobs[0]?.phase, 'rest');
      assert.equal(active.mobs[0].x, resting.x); assert.equal(active.mobs[0].y, resting.y);
      assert.equal(await heard(fingerprints['mob.attack']), attacks + 1, 'rest does not repeat attack cues');
      encounter.rest = active.mobs[0];
      await page.locator('iframe').screenshot({ path: new URL(`mob-runtime-${kind}-rest.png`, output).pathname });
    }

    const catches = await heard(fingerprints['death.mob']);
    for (let attempts = 0; attempts < 24 && active.state === 'playing'; attempts++) {
      const mob = active.mobs.find(candidate => candidate.kind === kind);
      assert.ok(mob, `${kind}: pursuer survives on the clear encounter meadow`);
      const dx = mob.x - active.x, dy = mob.y - active.y;
      if (Math.abs(dx) > .4 || Math.abs(dy) > .4) {
        await move(Math.abs(dx) > Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'back' : 'forward');
      } else await advance(120);
      active = await snapshot();
    }
    assert.equal(active.state, 'dead', `${kind}: actual mob contact ends the run`);
    assert.equal(active.cause, 'mob');
    assert.match(await frame.locator('#reason').textContent(), new RegExp(`${name} caught you!`));
    assert.equal(await heard(fingerprints['death.mob']), catches + 1, `${kind}: contact plays the contextual death cue once`);
    if (kind === 'slime') assert.equal(await heard(fingerprints['mob.attack']), attacks, 'slime never attacks; walking contact alone is hazardous');
    const deaths = await heard(fingerprints['death.mob']);
    await advance(400);
    assert.equal(await heard(fingerprints['death.mob']), deaths, 'dead simulation cannot repeat the death cue');
    await page.locator('iframe').screenshot({ path: new URL(`mob-runtime-${kind}-caught.png`, output).pathname });
    evidence.scenarios.push(encounter);
    await frame.locator('#play').dispatchEvent('click'); await advance(32);
    const reset = await snapshot();
    assert.equal(reset.score, 0); assert.equal(reset.mobs.length, 0); assert.equal(reset.cause, null);
    assert.equal(reset.state, 'playing');
    assert.equal(await frame.evaluate(() => window.mobFixture.writes.some(write => JSON.parse(write.value).best >= 160)), true, 'a real run result reaches the SDK storage fixture');
  }
  assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  evidence.fingerprints = fingerprints;
  await writeFile(new URL('mob-runtime.json', output), JSON.stringify(evidence, null, 2) + '\n');
  console.log('PASS: built mob integration — late score/time gates, quiet continuous pursuit, two eased close-range attacks with recovery, contextual catches, frozen pause, retry reset and SDK result save.');
} finally {
  try { if (frame) await collectRealm(frame, identity); } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
