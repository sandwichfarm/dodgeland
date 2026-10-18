import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';
const sources = await loadSources('game', process.env.DOWN_TO_DUCK_GAME_SOURCE_DIR);
after(sources.dispose);
const { Game, generateLane, actorPositions, trainPhase, difficulty, freshProgress, parseProgress, HOP_TIME, WAVE_SPEED, WAVE_GRACE, WAVE_TRAIL } = await sources.import('game');
const { WORLDS, CHARACTERS, DEFAULT_CHARACTER, characterById, box } = await sources.import('content');
function tick(game, duration) { for (let t = 0; t < duration; t += 1 / 120) game.update(1 / 120); }
function lane(game, kind, extras = {}) { const row = { ...game.lane, kind, coin: null, blocked: [], phase: 0, speed: 1, spacing: 6, length: 3.5, ...extras }; game.rows.set(game.y, row); return row; }
test('Butter is the free default duck, saves preserve chosen travelers, and every traveler has a distinct call', () => {
  assert.equal(DEFAULT_CHARACTER, 'butter');
  assert.equal(freshProgress().selected, DEFAULT_CHARACTER);
  assert.equal(freshProgress().travelerVersion, 2);
  assert.equal(parseProgress(null).selected, DEFAULT_CHARACTER);
  assert.equal(parseProgress('corrupt').selected, DEFAULT_CHARACTER);
  assert.equal(parseProgress('{"selected":"unknown-traveler"}').selected, DEFAULT_CHARACTER);
  assert.equal(parseProgress('{"selected":"pebble","coins":0}').selected, DEFAULT_CHARACTER);
  assert.equal(parseProgress('{"selected":"pip","travelerVersion":2}').selected, 'pip');
  assert.equal(parseProgress('{"selected":"sunny","travelerVersion":2,"coins":0,"best":0}').selected, 'sunny', 'the free chicken is selectable from a fresh save');
  assert.equal(parseProgress('{"selected":"pebble","coins":120}').selected, 'pebble');
  const duck = characterById(DEFAULT_CHARACTER);
  assert.equal(CHARACTERS[0], duck);
  assert.equal(duck.home, 'orchard');
  assert.equal(duck.coins, 0); assert.equal(duck.distance, 0);
  assert.equal(duck.call, 'call.duck'); assert.equal(duck.callLabel.toLowerCase(), 'quack');
  assert.equal(characterById('unknown'), duck);
  assert.equal(characterById('pip').coins, 0, 'the original free frog remains available');
  const chicken = characterById('sunny');
  assert.equal(chicken.coins, 0); assert.equal(chicken.distance, 0); assert.equal(chicken.home, 'orchard');
  assert.equal(chicken.call, 'call.chicken'); assert.equal(chicken.callLabel, 'cluck');
  assert.deepEqual(new Set(CHARACTERS.map(character => character.call)), new Set(['call.duck', 'call.chicken', 'call.frog', 'call.axolotl', 'call.robot', 'call.fox', 'call.penguin']));
  assert.ok(CHARACTERS.every(character => character.callLabel.trim()));
});
test('legacy frog defaults migrate once without losing progress or an explicit current traveler choice', () => {
  const legacy = { best: 81, strollBest: 42, coins: 202, runs: 11, selected: 'pip', world: 'home', mode: 'stroll', reduced: true, muted: true, soundPack: 'arcade', soundAddress: '' };
  for (const version of [undefined, 0, 1]) {
    const migrated = parseProgress(JSON.stringify({ ...legacy, travelerVersion: version }));
    assert.deepEqual(migrated, { ...freshProgress(), ...legacy, selected: 'butter', travelerVersion: 2 });
    assert.deepEqual(parseProgress(JSON.stringify(migrated)), migrated, 'migration is stable across a saved reload');
  }
  assert.deepEqual(parseProgress(JSON.stringify({ ...legacy, travelerVersion: 2 })), { ...freshProgress(), ...legacy, travelerVersion: 2 }, 'choosing Pip after migration is preserved');
  for (const selected of ['butter', 'sunny', 'petal', 'beep', 'rust', 'pebble']) {
    assert.equal(parseProgress(JSON.stringify({ ...legacy, selected })).selected, selected, `existing unlocked ${selected} choice is preserved`);
  }
});
test('mix levels migrate with defaults, preserve silence and reject invalid saved values', () => {
  const defaults = freshProgress();
  assert.deepEqual([defaults.musicVolume, defaults.ambienceVolume, defaults.effectsVolume], [.6, .65, 1]);
  const saved = parseProgress(JSON.stringify({ musicVolume: 0, ambienceVolume: .27, effectsVolume: .81 }));
  assert.deepEqual([saved.musicVolume, saved.ambienceVolume, saved.effectsVolume], [0, .27, .81]);
  const invalid = parseProgress(JSON.stringify({ musicVolume: -2, ambienceVolume: 4, effectsVolume: 'loud' }));
  assert.deepEqual([invalid.musicVolume, invalid.ambienceVolume, invalid.effectsVolume], [0, 1, 1]);
});
test('each real loss supplies its cause before onEnd and later updates cannot replace it', () => {
  const cases = [
    ['traffic', g => { g.health = 1; lane(g, 'road', { speed: 0, length: 1.15 }); }],
    ['train', g => lane(g, 'rail', { speed: 1, period: 9, warning: 1.5, phase: 2.375 })],
    ['water', g => lane(g, 'river', { phase: 3, length: 2 })],
    ['wave', g => { g.waveRow = 0; }],
    ['swept', g => { g.x = 5.51; lane(g, 'river', { phase: 5.51, speed: 0 }); }],
    ['trail', g => { g.maxY = 8; }],
  ];
  for (const [cause, setup] of cases) {
    const g = new Game(10, 'pond', cause === 'trail' ? 'stroll' : 'arcade');
    if (cause === 'water' || cause === 'swept') g.setCharacter('sunny');
    g.state = 'playing'; setup(g);
    let heard; let ends = 0; g.onEnd = () => { heard = g.deathCause; ends++; };
    g.update(0);
    assert.equal(g.state, 'dead', cause); assert.equal(heard, cause);
    g.end('Another loss', cause === 'wave' ? 'traffic' : 'wave'); g.update(1);
    assert.equal(g.deathCause, cause); assert.equal(ends, 1);
  }
});
test('seeded streaming has endless variation, safe relief and finite values at extreme distances', () => {
  const fingerprints = new Set(); const kinds = new Set(); const worlds = new Set();
  for (let seed = 0; seed < 80; seed++) {
    const entries = [];
    for (let row = 0; row < 640; row++) {
      const a = generateLane(seed, row, 'pond'); assert.deepEqual(a, generateLane(seed, row, 'pond'));
      assert.ok(a.spacing > a.length); assert.ok(Number.isFinite(a.speed)); assert.ok(a.blocked.every(x => Math.abs(x) > 1));
      if (row % 8 === 0 || row % 8 === 7 || row < 3) assert.equal(a.kind, 'meadow');
      if (a.kind === 'river') assert.ok(a.length >= 3.1 && a.spacing - a.length <= 1.7);
      kinds.add(a.kind); worlds.add(a.world.id); entries.push(`${a.kind}:${a.phase.toFixed(4)}`);
    }
    fingerprints.add(entries.join('|'));
  }
  assert.equal(fingerprints.size, 80); assert.equal(kinds.size, 4); assert.equal(worlds.size, 6);
  for (const row of [10_000, 1_000_000, 1_000_000_000]) { const a = generateLane(123, row, 'shuffle'); assert.ok(Number.isFinite(a.speed)); assert.ok(a.period >= 4.8); }
  assert.ok(difficulty(1_000_000) > difficulty(10_000));
});
test('forward/side/back movement scores unique furthest rows and streams bounded memory', () => {
  const g = new Game(78); assert.ok(g.move('forward')); tick(g, HOP_TIME); assert.equal(g.maxY, 1);
  assert.ok(g.move('left')); tick(g, HOP_TIME); assert.equal(g.x, -1); assert.equal(g.maxY, 1);
  g.move('back'); tick(g, HOP_TIME); assert.equal(g.y, 0); assert.equal(g.maxY, 1);
  g.move('forward'); tick(g, HOP_TIME); assert.equal(g.maxY, 1);
  for (let row = g.maxY; row < 10_000; row++) { g.maxY = row; g.ensureRows(); assert.equal(g.rows.size, 39); }
  assert.ok(g.rows.has(10_027)); assert.ok(!g.rows.has(0));
});
test('bounds, scenery and hop cadence reject illegal movement', () => {
  const g = new Game(1); g.move('forward'); assert.equal(g.move('forward'), false); tick(g, HOP_TIME);
  lane(g, 'meadow', { blocked: [1] }); assert.equal(g.move('right'), false);
  g.x = 5; assert.equal(g.move('right'), false);
  g.x = -5; assert.equal(g.move('left'), false);
});
test('fatal car impacts end once, gaps are safe, and train warnings precede crossing', () => {
  const g = new Game(10); g.state = 'playing'; g.health = 1; let calls = 0; g.onEnd = () => calls++;
  lane(g, 'road', { length: 1.15 }); tick(g, .02); assert.equal(g.state, 'dead'); g.end('again'); assert.equal(calls, 1);
  const safe = new Game(10); safe.state = 'playing'; lane(safe, 'road', { length: 1.15, phase: 3 }); tick(safe, .2); assert.equal(safe.state, 'playing');
  const t = new Game(10); t.state = 'playing'; const rail = lane(t, 'rail', { period: 9, warning: 1.5, length: 13 });
  assert.equal(trainPhase(rail, .2).warning, true); assert.deepEqual(actorPositions(rail, .2), []);
  assert.equal(trainPhase(rail, 2.4).warning, false); assert.ok(actorPositions(rail, 2.4).length);
  tick(t, 2.8); assert.equal(t.state, 'dead'); assert.match(t.reason, /Train/);
});
test('moving platforms carry the traveler; open water and edge drift kill travelers without aquatic rescue', () => {
  const g = new Game(4); g.state = 'playing'; lane(g, 'river'); tick(g, .5); assert.equal(g.state, 'playing'); assert.ok(Math.abs(g.x - .5) < .02);
  const water = new Game(4); water.setCharacter('sunny'); water.state = 'playing'; lane(water, 'river', { phase: 3, length: 2 }); tick(water, .02); assert.equal(water.state, 'dead'); assert.match(water.reason, /Splash/);
  const edge = new Game(4); edge.setCharacter('sunny'); edge.state = 'playing'; edge.x = 5.49; lane(edge, 'river', { phase: 5.49 }); tick(edge, .1); assert.equal(edge.state, 'dead'); assert.match(edge.reason, /Swept/);
});
test('train ends permit visible clearance while actual contact still ends the run', () => {
  // The five visible cars span 12.6 tiles. The former nominal length of 13
  // produced an invisible .2-tile extension at each end of the train.
  for (const mode of ['arcade', 'stroll']) for (const speed of [-1, 1]) for (const side of [-1, 1]) for (const [distance, contact] of [[6.71, false], [6.45, true]]) {
    const g = new Game(1, 'pond', mode); g.state = 'playing';
    const trainX = side * distance;
    const row = lane(g, 'rail', { length: 13, speed, period: 9, warning: 1.5, phase: 1.5 + (trainX * speed + 19) * 1.75 / 38 });
    assert.ok(Math.abs(actorPositions(row, 0)[0] - trainX) < 1e-10);
    g.update(0);
    assert.equal(g.state, contact ? 'dead' : 'playing', `${mode}, direction ${speed}, train center ${trainX}`);
    if (contact) assert.match(g.reason, /Train/);
  }
});
test('landing inside either visible platform edge is safe and open water still splashes', () => {
  for (const mode of ['arcade', 'stroll']) for (const speed of [-1, 0, 1]) for (const side of [-1, 1]) for (const [offset, supported] of [[1.65, true], [1.76, false]]) {
    const g = new Game(4, 'pond', mode); g.setCharacter('sunny'); g.state = 'playing'; g.x = side * offset;
    // The moving log reaches center 0 at the exact moment this hop lands.
    const phase = -speed * HOP_TIME * (mode === 'stroll' ? .58 : 1);
    const destination = { ...g.rows.get(1), kind: 'river', world: WORLDS[0], variant: 0, coin: null, blocked: [], phase, speed, spacing: 6, length: 3.5 };
    g.rows.set(1, destination);
    assert.ok(g.move('forward')); g.update(HOP_TIME);
    assert.equal(g.state, supported ? 'playing' : 'dead', `${mode}, drift ${speed}, landing at ${g.x} beside the visible ±1.75 platform edges`);
    assert.equal(g.x, side * offset, 'a fresh landing does not inherit platform motion from time spent airborne');
    if (!supported) assert.match(g.reason, /Splash/);
  }
});
test('riders at either platform edge keep their relative position in both drift directions', () => {
  for (const edgeDistance of [1.599, 1.749]) for (const mode of ['arcade', 'stroll']) for (const speed of [-1, 1]) for (const side of [-1, 1]) {
    const g = new Game(4, 'pond', mode); g.state = 'playing';
    const offset = side * edgeDistance; g.x = offset;
    lane(g, 'river', { world: WORLDS[0], variant: 0, speed, length: 3.5 });
    // Several seconds of real fixed steps must not turn a supported passenger
    // into open water when the platform advances before its rider is carried.
    for (let step = 0; step < 240; step++) {
      g.update(1 / 120);
      assert.equal(g.state, 'playing', `${mode}, platform direction ${speed}, offset ${offset}, step ${step}`);
      assert.ok(Math.abs((g.x - speed * g.time) - offset) < 1e-10, 'the same point on the platform continues to support the rider');
    }
  }
});
test('supported platforms still sweep riders away beyond either world edge', () => {
  for (const mode of ['arcade', 'stroll']) for (const speed of [-1, 1]) {
    const g = new Game(4, 'pond', mode); g.setCharacter('sunny'); g.state = 'playing'; g.x = speed * 5.49;
    lane(g, 'river', { world: WORLDS[0], variant: 0, phase: g.x, speed, length: 3.5 });
    tick(g, .1);
    assert.equal(g.state, 'dead'); assert.match(g.reason, /Swept/);
  }
});
test('the wave grants a starting grace period, then advances continuously and freezes on pause', () => {
  const g = new Game(3); const start = g.waveRow;
  tick(g, 20); assert.equal(g.time, 0); assert.equal(g.waveRow, start, 'ready screen is safe');
  assert.equal(g.waveGap, 4); assert.equal(g.waveSeconds, WAVE_GRACE + 4 / WAVE_SPEED);
  g.state = 'playing'; g.update(WAVE_GRACE - .1); assert.equal(g.waveRow, start);
  g.update(.2); assert.ok(Math.abs(g.waveRow - (start + .1 * WAVE_SPEED)) < 1e-12, 'only the part after grace advances the front');
  tick(g, 2); assert.equal(g.warning, true);
  g.pause(); const time = g.time, idle = g.idle, front = g.waveRow, seconds = g.waveSeconds;
  tick(g, 20); assert.equal(g.time, time); assert.equal(g.idle, idle); assert.equal(g.waveRow, front); assert.equal(g.waveSeconds, seconds);
  let ends = 0; g.onEnd = () => ends++;
  g.resume(); tick(g, 4.2); assert.equal(g.state, 'dead'); assert.match(g.reason, /wave caught/); assert.equal(g.caughtByWave, true); assert.equal(g.waveSeconds, 0);
  tick(g, 20); assert.equal(ends, 1);
});
test('hops earn actual distance from the wave without resetting its progress', () => {
  const g = new Game(3); g.state = 'playing'; g.time = WAVE_GRACE; g.waveRow = -.5; g.idle = 9.9;
  assert.ok(g.move('forward')); assert.equal(g.waveGap, .5, 'starting a hop does not teleport the feet to the destination');
  g.update(HOP_TIME / 2);
  assert.ok(Math.abs(g.waveGap - (1 - HOP_TIME / 2 * WAVE_SPEED)) < 1e-12, 'clearance follows the visible half-hop');
  g.update(HOP_TIME / 2); const forwardGap = g.waveGap, forwardFront = g.waveRow;
  assert.ok(forwardGap > .5); assert.ok(forwardFront > -.5);
  assert.ok(g.move('left')); tick(g, HOP_TIME);
  assert.equal(g.state, 'playing'); assert.ok(g.waveRow > forwardFront); assert.ok(g.waveGap < forwardGap, 'lateral hopping buys no clearance');
  const sideGap = g.waveGap, sideFront = g.waveRow;
  assert.ok(g.move('back')); tick(g, HOP_TIME);
  assert.ok(g.waveRow > sideFront); assert.ok(g.waveGap < sideGap - 1); assert.equal(g.state, 'playing');
  g.idle = 20; g.update(.01); assert.equal(g.state, 'playing', 'idle counter is no longer a separate invisible death boundary');
});
test('the advancing front catches lateral and backward hops, but permits a last-moment forward escape', () => {
  const make = () => { const g = new Game(3); g.state = 'playing'; g.time = WAVE_GRACE; g.waveRow = -.04; return g; };
  const escape = make(); escape.move('forward'); tick(escape, HOP_TIME);
  assert.equal(escape.state, 'playing'); assert.ok(escape.waveGap > .9); assert.equal(escape.caughtByWave, false);
  const lateral = make(); lateral.move('right'); tick(lateral, HOP_TIME / 2);
  assert.equal(lateral.state, 'dead'); assert.ok(lateral.hop > 0); assert.equal(lateral.caughtByWave, true);
  const back = make(); back.waveRow = -.3; back.move('back'); tick(back, HOP_TIME / 2);
  assert.equal(back.state, 'dead'); assert.ok(back.hop > 0); assert.equal(back.caughtByWave, true);
});
test('the trailing boundary stays visible, never retreats, and Stroll has no pursuing wave', () => {
  const g = new Game(3); g.state = 'playing'; g.maxY = 8; g.y = 8; g.fromY = 8; g.ensureRows(); lane(g, 'meadow');
  g.update(.01); assert.equal(g.waveRow, g.maxY - WAVE_TRAIL, 'rapid progress draws the wave up to the trailing limit');
  g.waveRow += .2; const advancedFront = g.waveRow; g.update(.01); assert.equal(g.waveRow, advancedFront, 'the trailing floor cannot pull the front backward');
  g.y = 3; g.fromY = 3; lane(g, 'meadow'); g.move('back'); tick(g, HOP_TIME);
  assert.equal(g.state, 'dead'); assert.equal(g.caughtByWave, true, 'backtracking meets the rendered wave boundary');
  const stroll = new Game(3, 'pond', 'stroll'); stroll.state = 'playing'; tick(stroll, 20);
  assert.equal(stroll.state, 'playing'); assert.equal(stroll.warning, false); assert.equal(stroll.waveRow, -4); assert.equal(stroll.caughtByWave, false); assert.ok(stroll.time < 12);
  stroll.maxY = 8; stroll.update(.01); assert.equal(stroll.state, 'dead'); assert.match(stroll.reason, /trail moved on/); assert.equal(stroll.caughtByWave, false);
});
test('coins collect exactly once, stored data validates, gentler starts keep later challenge', () => {
  const g = new Game(1); g.state = 'playing'; let count = 0; g.onCoin = () => count++; lane(g, 'meadow', { coin: 0 }); tick(g, 1); assert.equal(g.coins, 1); assert.equal(count, 1);
  const p = parseProgress('{"best":75,"coins":30,"runs":3,"mode":"stroll","reduced":true}'); assert.equal(p.best, 75); assert.equal(p.coins, 30); assert.equal(p.mode, 'stroll');
  assert.equal(parseProgress('corrupt').best, 0); assert.equal(parseProgress('{"best":-4,"coins":1e100}').coins, 0);
  assert.ok(Math.abs(generateLane(1, 10, 'pond', true).speed) < Math.abs(generateLane(1, 10, 'pond').speed));
  assert.equal(generateLane(1, 40, 'pond', true).speed, generateLane(1, 40, 'pond').speed);
});
test('coins stay reachable after river drift in either direction and either mode', () => {
  for (const mode of ['arcade', 'stroll']) for (const kind of ['meadow', 'road']) for (const drift of [-.55, -.51, -.5, -.49, -.45, .45, .49, .5, .51, .55]) {
    const g = new Game(4, 'pond', mode); g.state = 'playing';
    lane(g, 'river', { speed: Math.sign(drift) });
    // Use the real carry update to reproduce the fractional position retained on land.
    const duration = Math.abs(drift) / (mode === 'stroll' ? .58 : 1);
    for (let i = 0; i < 120; i++) g.update(duration / 120);
    assert.equal(g.state, 'playing'); assert.ok(Math.abs(g.x - drift) < 1e-12);
    const bank = { ...g.rows.get(1), kind, blocked: [], coin: 0, phase: 3, speed: 0, spacing: 6, length: 1.15 };
    g.rows.set(1, bank); let calls = 0; g.onCoin = () => calls++;
    assert.ok(g.move('forward')); tick(g, HOP_TIME);
    // The default field moves the coin into contact without correcting the
    // duck's fractional landing position. Allow that visible travel to finish.
    const landedX = g.x; tick(g, .8); assert.equal(g.x, landedX);
    assert.equal(g.coins, 1, `${mode}, ${kind}: coin unreachable after ${drift} tiles of drift`);
    assert.equal(bank.coin, null); assert.equal(calls, 1);
    g.move('right'); tick(g, HOP_TIME); g.move('left'); tick(g, HOP_TIME);
    assert.equal(g.coins, 1); assert.equal(calls, 1);
  }
});
test('explicit zero-gravity pickup requires body contact during land travel and resolves hazards first', () => {
  for (const [x, coin] of [[.5, 0], [.5, 1], [-.5, -1], [-.5, 0]]) {
    const boundary = new Game(1); boundary.state = 'playing'; boundary.x = x; boundary.run.effects.coinRadius = 0;
    lane(boundary, 'meadow', { coin }); tick(boundary, .02);
    assert.equal(boundary.coins, 0, `half-tile boundary ${x}, coin ${coin} has no contact`);
  }
  const g = new Game(1); g.state = 'playing'; g.run.effects.coinRadius = 0;
  const row = lane(g, 'meadow', { coin: 1 });
  g.x = .49; tick(g, .02); assert.equal(g.coins, 0, 'adjacent tile does not collect');
  assert.ok(g.move('right')); tick(g, HOP_TIME / 2);
  assert.equal(g.coins, 1, 'moving the body across a coin collects at contact, before overshooting');
  tick(g, HOP_TIME); assert.equal(g.coins, 1); assert.equal(row.coin, null);
  const hit = new Game(1); hit.state = 'playing'; hit.health = 1;
  const traffic = lane(hit, 'road', { coin: 0 });
  tick(hit, .02); assert.equal(hit.state, 'dead'); assert.equal(hit.coins, 0); assert.equal(traffic.coin, 0);
});
test('content packs add characters and worlds without engine changes', () => {
  const model = [box(0, 0, 0, .5, .5, .5, '#ffffff')];
  const newWorld = { ...WORLDS[0], id: 'test-world', name: 'Test World', scenery: [model], vehicles: [model], platforms: [model], patterns: [['road', 'river', 'meadow']] };
  WORLDS.push(newWorld); CHARACTERS.push({ id: 'test-character', name: 'Test', note: 'Test', home: 'test-world', coins: 0, distance: 0, call: 'call.robot', callLabel: 'Beep', model });
  try { const g = new Game(1, 'test-world'); assert.equal(g.lane.world.id, 'test-world'); assert.equal(generateLane(1, 6, 'test-world').world.vehicles[0], model); }
  finally { WORLDS.pop(); CHARACTERS.pop(); }
});
