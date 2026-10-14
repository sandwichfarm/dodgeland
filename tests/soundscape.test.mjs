import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';
const sources = await loadSources('soundscape');
after(sources.dispose);
const { Game, generateLane } = await sources.import('game');
const { Soundscape, crossingSignal } = await sources.import('soundscape');
const { musicHarmonyAt } = await sources.import('harmony');
const { laneActors } = await sources.import('game');
const { generateLane: generateVariedLane } = await sources.import('levels/v2');
const { composeModeDefinition } = await sources.import('mode-rules');
function fixture(world = 'pond', mode = 'stroll', definition) {
  const game = new Game(0, world, mode, false, [], 'butter', { definition }); game.state = 'playing'; game.rows.clear();
  const plays = [], frames = [];
  const sink = { play(cue, options) { plays.push({ cue, ...options, time: game.time }); }, syncLoops(loops) { frames.push(structuredClone(loops)); } };
  const scene = new Soundscape(sink);
  const add = (index, kind, options = {}) => {
    const lane = { ...generateLane(0, index, world), kind, speed: 2, phase: 0, spacing: 100, length: 1.15, period: 8, warning: 1.5, ...options };
    game.rows.set(index, lane); return lane;
  };
  add(0, 'meadow');
  const at = (time, enabled = true) => { game.time = time; scene.update(game, enabled); return frames.at(-1); };
  return { game, scene, plays, frames, add, at };
}
const cue = (loops, name) => loops.find(loop => loop.cue === name);
const count = (plays, name) => plays.filter(play => play.cue === name).length;

test('music and biome air stay soft, river ambience follows actual proximity, distant traffic stays silent', () => {
  const f = fixture();
  f.add(8, 'road'); f.add(4, 'river');
  const far = f.at(0);
  assert.ok(cue(far, 'music').gain > 0); assert.ok(cue(far, 'ambience.wind').gain > 0);
  assert.equal(cue(far, 'traffic.pass'), undefined);
  assert.equal(cue(far, 'ambience.water'), undefined, 'streams four rows away add no background wash');
  f.add(1, 'river');
  const distantWater = cue(f.at(.05), 'ambience.water').gain;
  f.add(0, 'river'); const near = f.at(.1);
  assert.ok(cue(near, 'ambience.water').gain > distantWater * 10);
  assert.equal(count(f.plays, 'traffic.honk'), 0);
});

test('one car keeps its identity through phase wrapping while gain, pan and pitch follow its passage', () => {
  const f = fixture(); f.add(0, 'road', { phase: 96.5 });
  const approaching = cue(f.at(0), 'traffic.pass'); // x = -3.5
  const close = cue(f.at(1.65), 'traffic.pass'); // x = -.2
  const receding = cue(f.at(3.5), 'traffic.pass'); // x = +3.5 after phase wraps
  assert.equal(approaching.id, close.id); assert.equal(close.id, receding.id);
  assert.equal(approaching.variant, close.variant); assert.equal(close.variant, receding.variant);
  assert.ok(approaching.pan < 0); assert.ok(receding.pan > 0);
  assert.ok(close.gain > approaching.gain * 4);
  assert.ok(close.gain > receding.gain * 4);
  assert.ok(approaching.rate > receding.rate);
  assert.equal(f.at(10).some(loop => loop.id === close.id), false, 'departed car stops instead of looping offscreen');
});

test('trucks sound lower than small cars and faster traffic is more audible', () => {
  const small = fixture(); small.add(0, 'road', { phase: 3, speed: 1 });
  const truck = fixture(); truck.add(0, 'road', { phase: 3, speed: 1, length: 1.8 });
  const fast = fixture(); fast.add(0, 'road', { phase: 3, speed: 4 });
  const car = cue(small.at(0), 'traffic.pass'), bus = cue(truck.at(0), 'traffic.pass'), express = cue(fast.at(0), 'traffic.pass');
  assert.ok(bus.rate < car.rate); assert.ok(bus.gain > car.gain);
  assert.ok(express.rate > car.rate); assert.ok(express.gain > car.gain);
});

test('horns warn of approaching cars in the occupied or landing road, with vehicle and global cooldowns', () => {
  const f = fixture(); f.add(0, 'road', { phase: 97.5 });
  f.at(0); f.at(.1); f.at(.2);
  assert.equal(count(f.plays, 'traffic.honk'), 1);
  assert.ok(f.plays.find(play => play.cue === 'traffic.honk').pan < 0);
  f.at(2.8); assert.equal(count(f.plays, 'traffic.honk'), 1, 'receding car never honks');
  const nearby = fixture(); nearby.add(1, 'road', { phase: 97.5 }); nearby.at(0);
  assert.equal(count(nearby.plays, 'traffic.honk'), 0, 'standing safely beside a road does not trigger horns');
  nearby.game.y = 1; nearby.game.fromY = 0; nearby.game.hop = .14;
  nearby.at(.05); assert.equal(count(nearby.plays, 'traffic.honk'), 1, 'drivers react to the landing tile');
  const reverse = fixture(); reverse.add(0, 'road', { phase: 2.5, speed: -2 }); reverse.at(0);
  assert.equal(count(reverse.plays, 'traffic.honk'), 1);
  assert.ok(reverse.plays.find(play => play.cue === 'traffic.honk').pan > 0);
});

test('three-tile horn radius uses visible ground distance, regardless of speed, size or hop destination', () => {
  for (const direction of [-1, 1]) for (const length of [1.15, 1.8]) {
    for (const distance of [2.99, 3, 3.01, 4, 5]) {
      const f = fixture('pond', 'arcade');
      f.add(0, 'road', { phase: -direction * distance, speed: direction * 4, length });
      f.at(0);
      assert.equal(count(f.plays, 'traffic.honk'), distance <= 3 ? 1 : 0, `${direction}/${length}/${distance}`);
    }
  }
  const landing = fixture('pond', 'arcade');
  landing.add(1, 'road', { phase: -2.9, speed: 4 });
  landing.game.y = 1; landing.game.fromY = 0; landing.game.hop = .14;
  landing.at(0);
  assert.equal(count(landing.plays, 'traffic.honk'), 0, 'landing tile is close but visible duck is over three tiles diagonally away');
  landing.game.hop = .07;
  landing.at(.01);
  assert.equal(count(landing.plays, 'traffic.honk'), 1, 'moving visibly inside the radius enables the warning');

  const lateral = fixture('pond', 'arcade');
  lateral.add(0, 'road', { phase: 4, speed: -4 });
  lateral.game.x = 1; lateral.game.fromX = 0; lateral.game.hop = .14;
  lateral.at(0);
  assert.equal(count(lateral.plays, 'traffic.honk'), 0, 'horizontal destination cannot bypass the radius');
  lateral.game.hop = 0; lateral.at(.01);
  assert.equal(count(lateral.plays, 'traffic.honk'), 1);
});

test('horn phrases stay in scale and range, vary notes and rhythms, and repeat deterministically for the same run', () => {
  function phrases(seed) {
    const f = fixture('pond', 'arcade'); f.game.seed = seed;
    const lane = f.add(0, 'road', { phase: -2.5 });
    for (let bar = 0; bar < 32; bar++) {
      const time = bar * 3;
      // Stage a different physical actor in range once each bar.
      lane.phase = -2.5 - time * lane.speed + bar * lane.spacing;
      const before = structuredClone([...f.game.rows]);
      f.at(time);
      assert.deepEqual([...f.game.rows], before, 'audio does not change generated terrain or actors');
    }
    return f.plays.filter(play => play.cue === 'traffic.honk');
  }
  const plays = phrases(0), pitches = plays.map(play => 60 + 12 * Math.log2(play.rate));
  assert.equal(plays.length, 32);
  for (let i = 0; i < plays.length; i++) {
    const note = Math.round(pitches[i]), harmony = musicHarmonyAt(plays[i].time);
    assert.ok(Math.abs(pitches[i] - note) < 1e-9, 'exact equal-tempered note, no arbitrary pitch multiplier');
    assert.ok(note >= 48 && note <= 72);
    assert.ok(harmony.pitchClasses.includes(note % 12));
    if (i) assert.notEqual(note, Math.round(pitches[i - 1]), 'successive warnings do not repeat one pitch');
  }
  assert.ok(new Set(pitches.map(Math.round)).size >= 6, 'a useful spread of notes');
  assert.ok(new Set(plays.map(play => play.variant)).size >= 4, 'different voices and articulations');
  assert.deepEqual(phrases(0), plays);
  assert.notDeepEqual(phrases(12345), plays, 'another seed changes the musical choices');
});

test('music keeps concert tuning across worlds and resumes at the shared harmony clock in both modes', () => {
  for (const world of ['pond', 'orchard', 'bloom', 'dunes', 'frost', 'neon']) for (const mode of ['arcade', 'stroll']) {
    const f = fixture(world, mode), multiplier = mode === 'stroll' ? .58 : 1;
    const before = cue(f.at(29.25 * multiplier), 'music');
    assert.equal(before.rate, 1, 'biomes cannot detune the backing track');
    assert.ok(Math.abs(before.offset - 29.25) < 1e-9, 'audio receives the full clock so imported loops wrap at their own duration');
    f.game.pause(); f.at(29.25 * multiplier); assert.deepEqual(f.frames.at(-1), []);
    f.game.resume(); const resumed = cue(f.at(29.25 * multiplier), 'music');
    assert.deepEqual(resumed, before, 'no new tonic or restarted bar after pausing');
  }
});

test('mixed traffic audio follows the individual truck and accelerating sports car', () => {
  const observed = new Set();
  for (const [row, kind] of [[153, 'truck'], [165, 'sports']]) {
    const lane = generateVariedLane(31, row, 'orchard');
    const records = [];
    for (let time = 0; time < 30; time += .05) {
      const actor = laneActors(lane, time).find(actor => actor.kind === kind && Math.abs(actor.x) < 3);
      if (!actor) continue;
      const f = fixture('orchard', 'arcade');
      f.game.rows.clear(); f.game.rows.set(row, lane);
      f.game.y = f.game.fromY = row;
      // Keep relative distance fixed to isolate this actor's current engine pace.
      f.game.x = f.game.fromX = actor.x + Math.sign(actor.speed) * 1.9;
      const loops = f.at(time), engine = loops.find(loop => loop.id === `car:${row}:${actor.id}`);
      assert.ok(engine, 'the actual visible vehicle has a matching audio identity');
      assert.equal(engine.variant, kind === 'truck' ? 'truck' : 'compact');
      const horn = f.plays.find(play => play.cue === 'traffic.honk');
      if (horn) assert.ok(horn.variant.startsWith(kind === 'truck' ? 'truck' : 'compact'));
      observed.add(kind); records.push({ id: actor.id, speed: Math.abs(actor.speed), rate: engine.rate });
    }
    if (kind === 'sports') {
      const slow = records.reduce((a, b) => a.speed < b.speed ? a : b);
      const fast = records.filter(record => record.id === slow.id).reduce((a, b) => a.speed > b.speed ? a : b);
      assert.ok(fast.speed > slow.speed * 1.2 && fast.rate > slow.rate + .02, 'the same sports engine audibly rises as its actual speed increases');
    }
  }
  assert.equal(observed.size, 2);
});

test('crossing bells share lamp timing and continue throughout train passage without catching up missed beats', () => {
  const f = fixture('pond', 'arcade'); const rail = f.add(1, 'rail');
  for (const time of [0, .2, .5, 1, 1.5, 2, 3]) f.at(time);
  assert.deepEqual(f.plays.filter(play => play.cue === 'train').map(play => play.time), [0, .5, 1, 1.5, 2, 3]);
  assert.equal(crossingSignal(rail, .1).lit, true);
  assert.equal(crossingSignal(rail, .3).lit, false);
  assert.equal(crossingSignal(rail, 2).active, true, 'warning lights remain active as train crosses');
  f.at(3.3); assert.equal(crossingSignal(rail, 3.3).active, false);
  assert.equal(count(f.plays, 'train'), 6);
  assert.equal(cue(f.frames.at(-1), 'train.pass'), undefined);
  const stroll = fixture(); stroll.add(1, 'rail'); stroll.at(0); stroll.at(.28); stroll.at(.29);
  assert.equal(count(stroll.plays, 'train'), 2, 'Stroll bell retains .5 wall-second cadence');
  const betweenBeats = fixture('pond', 'arcade'); betweenBeats.add(1, 'rail', { phase: .3 });
  betweenBeats.at(0); assert.equal(count(betweenBeats.plays, 'train'), 0, 'entering earshot between flashes does not ring early');
  betweenBeats.at(.2); assert.equal(count(betweenBeats.plays, 'train'), 1);
});

test('train rumble follows the visible body, sweeps stereo in either direction and grows at closest passage', () => {
  for (const direction of [-1, 1]) {
    const f = fixture(); f.add(1, 'rail', { speed: direction });
    assert.equal(cue(f.at(1.5), 'train.pass'), undefined, 'train outside the audible radius is quiet');
    const approach = cue(f.at(1.9), 'train.pass');
    const middle = cue(f.at(2.375), 'train.pass');
    const departure = cue(f.at(2.85), 'train.pass');
    assert.equal(approach.id, middle.id); assert.equal(middle.id, departure.id);
    assert.ok(approach.pan * direction < 0); assert.ok(departure.pan * direction > 0);
    assert.ok(middle.gain > approach.gain); assert.ok(middle.gain > departure.gain);
    assert.ok(approach.rate > departure.rate);
  }
});

test('pause, mute, death and reset stop the scene without queued birds or warning bursts on return', () => {
  const f = fixture(); f.add(1, 'rail'); f.at(0);
  f.game.pause(); f.at(0); assert.deepEqual(f.frames.at(-1), []);
  const oldPlays = f.plays.length; f.at(0); assert.equal(f.plays.length, oldPlays);
  f.game.resume(); f.at(.1); assert.ok(f.frames.at(-1).length); assert.equal(f.plays.length, oldPlays + 1);
  f.at(.2, false); assert.deepEqual(f.frames.at(-1), []);
  f.at(50, false); const mutedPlays = f.plays.length;
  f.at(50); assert.ok(f.plays.length <= mutedPlays + 1, 'no missed bells or bird calls are queued');
  f.game.state = 'dead'; f.at(50); assert.deepEqual(f.frames.at(-1), []);
  f.scene.reset(); assert.deepEqual(f.frames.at(-1), []);
});

test('birds are sparse and biome appropriate, and urgent warnings duck music and ambience', () => {
  const garden = fixture('orchard'); garden.at(0); garden.at(3); garden.at(3.1); garden.at(3.2);
  assert.equal(count(garden.plays, 'ambience.birds'), 1);
  const city = fixture('neon'); city.at(0); city.at(3); city.at(20);
  assert.equal(count(city.plays, 'ambience.birds'), 0);
  const f = fixture('pond', 'arcade'); const normal = cue(f.at(0), 'music').gain;
  f.game.waveRow = -.8;
  const urgent = f.at(5);
  assert.ok(cue(urgent, 'music').gain < normal / 2);
  assert.equal(count(f.plays, 'idle'), 1);
  f.at(5.1); assert.equal(count(f.plays, 'idle'), 1);
  f.at(5.53); assert.equal(count(f.plays, 'idle'), 2);
});

test('dense scenes limit layer power and prioritize one train instead of accumulating rumble', () => {
  const f = fixture();
  for (const index of [-2, -1, 1, 2]) f.add(index, 'road', { spacing: 4 });
  for (const index of [-3, 3, 4]) f.add(index, 'rail');
  f.add(0, 'river'); const loops = f.at(2.375);
  assert.ok(loops.length <= 7);
  assert.ok(loops.filter(loop => loop.cue === 'traffic.pass').length <= 3);
  assert.equal(loops.filter(loop => loop.cue === 'train.pass').length, 1);
  assert.ok(loops.every(loop => Number.isFinite(loop.gain) && loop.gain > 0 && loop.gain <= 1));
  assert.equal(new Set(loops.map(loop => loop.id)).size, loops.length);
  assert.equal(count(f.plays, 'train'), 1, 'overlapping crossings do not produce a wall of bells');
  assert.ok(loops.reduce((sum, loop) => sum + loop.gain ** 2, 0) < .75 ** 2);
});

test('occupied road and river foregrounds dominate their neighboring zone by more than tenfold', () => {
  const f = fixture(); f.add(0, 'road'); f.add(1, 'river'); f.add(2, 'meadow');
  const road = f.at(0);
  assert.ok(cue(road, 'traffic.pass').gain > cue(road, 'ambience.water').gain * 10);
  assert.ok(cue(road, 'traffic.pass').gain > cue(road, 'ambience.wind').gain * 5);
  f.game.y = f.game.fromY = 1;
  const river = f.at(.05);
  assert.ok(cue(river, 'ambience.water').gain > cue(river, 'traffic.pass').gain * 10);
  assert.ok(cue(river, 'ambience.water').gain > cue(river, 'ambience.wind').gain * 5);
  f.game.y = f.game.fromY = 2;
  const meadow = f.at(.1);
  assert.ok(cue(meadow, 'ambience.water').gain < .06);
  assert.ok((cue(meadow, 'traffic.pass')?.gain ?? 0) < .04);
  assert.ok(cue(meadow, 'ambience.wind').gain > cue(river, 'ambience.wind').gain * 2);
});

test('normal traffic has distinct pass peaks, quiet gaps, stable voices, and no unseen distant traffic bed', () => {
  const f = fixture(); f.add(0, 'road', { spacing: 6, phase: 0, speed: 2 });
  const voiceByActor = new Map(), loudness = [];
  for (let time = 0; time <= 12; time += .05) {
    const loops = f.at(time).filter(loop => loop.cue === 'traffic.pass');
    loudness.push(Math.sqrt(loops.reduce((power, loop) => power + loop.gain ** 2, 0)));
    for (const loop of loops) {
      if (voiceByActor.has(loop.id)) assert.equal(loop.variant, voiceByActor.get(loop.id));
      voiceByActor.set(loop.id, loop.variant);
    }
  }
  assert.ok(Math.max(...loudness) > .4);
  assert.ok(Math.min(...loudness) < .065, 'gaps sit at least 16 dB below the closest car');
  assert.ok(loudness.filter(gain => gain < .1).length > loudness.length * .2, 'quiet space occupies a meaningful part of each pass');
  assert.ok(new Set(voiceByActor.values()).size >= 3, 'successive cars have several engine characters');
  const distant = fixture(); distant.add(4, 'road', { spacing: 2 });
  assert.equal(cue(distant.at(0), 'traffic.pass'), undefined);
});

test('all six biomes select distinct air, water and wildlife profiles without restarting stable loop IDs', () => {
  const signatures = new Set();
  for (const world of ['pond', 'orchard', 'bloom', 'dunes', 'frost', 'neon']) {
    const f = fixture(world); f.add(0, 'river');
    const loops = f.at(0); f.at(3);
    const wind = cue(loops, 'ambience.wind'), water = cue(loops, 'ambience.water');
    assert.equal(wind.variant, world); assert.equal(water.variant, world);
    assert.equal(wind.id, 'wind'); assert.equal(water.id, 'water');
    const bird = f.plays.find(play => play.cue === 'ambience.birds');
    if (world === 'neon') assert.equal(bird, undefined); else assert.equal(bird.variant, world);
    signatures.add(JSON.stringify([wind.variant, wind.rate, wind.gain, water.gain, bird?.variant]));
  }
  assert.equal(signatures.size, 6);
});

test('biome and surface audio follow actual hop position instead of switching at input time', () => {
  const f = fixture('pond');
  f.add(31, 'road'); f.add(32, 'river');
  f.game.y = 32; f.game.fromY = 31; f.game.hop = .14;
  const departure = f.at(0);
  assert.equal(cue(departure, 'ambience.wind').variant, 'pond');
  assert.equal(cue(departure, 'ambience.water').variant, 'orchard', 'audible water retains the actual source biome');
  f.game.hop = .08;
  assert.equal(cue(f.at(.06), 'ambience.wind').variant, 'pond');
  f.game.hop = .06;
  assert.equal(cue(f.at(.08), 'ambience.wind').variant, 'orchard');
  f.game.hop = 0;
  const arrival = f.at(.14);
  assert.ok(cue(arrival, 'ambience.water').gain > cue(departure, 'ambience.water').gain * 10);
});

test('dense traffic power stays bounded, and imminent wave warnings also lower engines', () => {
  const f = fixture('pond', 'arcade');
  for (const index of [-2, -1, 0, 1, 2]) f.add(index, 'road', { spacing: 2, speed: 4, length: 1.8 });
  const normal = f.at(1).filter(loop => loop.cue === 'traffic.pass');
  assert.equal(normal.length, 3);
  assert.ok(normal.reduce((sum, loop) => sum + loop.gain ** 2, 0) <= .52 ** 2 + 1e-9);
  assert.ok(normal[1].gain <= normal[0].gain * .6);
  assert.ok(normal[2].gain <= normal[0].gain * .35);
  f.game.waveRow = -.5;
  const urgent = f.at(5).filter(loop => loop.cue === 'traffic.pass');
  assert.ok(urgent.reduce((sum, loop) => sum + loop.gain ** 2, 0) <= (.52 * .35) ** 2 + 1e-9);
  assert.equal(count(f.plays, 'idle'), 1);
});

test('repeated render frames at a frozen simulation time do not change the scene or repeat sound events', () => {
  const f = fixture(); f.add(0, 'road', { phase: 97.5 }); f.add(1, 'river');
  const first = f.at(0), events = f.plays.length;
  for (let frame = 0; frame < 30; frame++) assert.deepEqual(f.at(0), first);
  assert.equal(f.plays.length, events);
  f.game.pause(); f.at(0); assert.deepEqual(f.frames.at(-1), []);
  f.game.resume(); assert.deepEqual(f.at(0), first);
  assert.equal(f.plays.length, events, 'resuming does not replay the same car horn');
});

test('custom world speed drives the real music and bell clocks independently of stored solo identity', () => {
  for (const mode of ['arcade', 'stroll']) {
    const definition = composeModeDefinition({ id: `audio-clock-${mode}`,
      simulation: { worldTimeScale: .4 }, pursuers: { enabled: false } });
    const f = fixture('pond', mode, definition);
    f.add(1, 'rail', { warning: 3 });
    f.at(0);
    // Drive the production Game clock at its actual fixed step. The traveler
    // stays on safe meadow, while the nearby crossing remains in its warning.
    for (let step = 1; step <= 122; step++) {
      f.game.update(1 / 120);
      const loops = f.at(f.game.time);
      assert.ok(Math.abs(cue(loops, 'music').offset - step / 120) < 1e-10,
        `${mode}: music follows active elapsed time rather than the stored mode`);
    }
    const bells = f.plays.filter(play => play.cue === 'train').map(play => play.time);
    assert.equal(bells.length, 3, `${mode}: one bell per half active second`);
    bells.forEach((time, index) => assert.ok(Math.abs(time - index * .2) < 1e-10));
    const playing = cue(f.frames.at(-1), 'music');
    f.game.pause(); f.at(f.game.time);
    assert.deepEqual(f.frames.at(-1), []);
    f.game.resume();
    assert.deepEqual(cue(f.at(f.game.time), 'music'), playing, 'resume retains the music position');
  }
});

test('custom world speed keeps urgent wave warnings at their active-second cadence', () => {
  for (const mode of ['arcade', 'stroll']) {
    const definition = composeModeDefinition({ id: `warning-clock-${mode}`,
      simulation: { worldTimeScale: .4 }, pursuers: { enabled: false } });
    const f = fixture('pond', mode, definition);
    f.game.waveRow = -.2;
    f.at(5);
    assert.equal(count(f.plays, 'idle'), 1, 'fixture is inside the urgent wave warning');
    f.at(5 + .52 * .4 - .000001);
    assert.equal(count(f.plays, 'idle'), 1, 'no early warning');
    f.at(5 + .52 * .4);
    assert.equal(count(f.plays, 'idle'), 2, 'active scale schedules the next warning');
  }
});
