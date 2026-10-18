import { TRAIN_BOUNDS } from './content.js';
import { laneActors, trainPhase, wrap } from './game.js';
import type { Game, Lane, LaneActor, Mode } from './game.js';
import type { SoundCue } from './audio.js';
import { HORN_MIN_MIDI, HORN_MAX_MIDI, HORN_REFERENCE_MIDI, musicHarmonyAt } from './harmony.js';
import { soloModeDefinition } from './mode-rules.js';

interface SoundOptions { gain?: number; pan?: number; rate?: number; variant?: string }
interface SceneLoop extends SoundOptions { id: string; cue: SoundCue; gain: number; offset?: number }
interface AudioSink {
  play(cue: SoundCue, options?: SoundOptions): unknown;
  syncLoops(loops: SceneLoop[]): void;
}

const clamp = (n: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, n));
const reach = (distance: number, radius: number): number => clamp(1 - distance / radius) ** 2;
// Match the horizontal skew of the isometric camera, relative to the listener.
const panAt = (dx: number, dy: number): number => clamp((dx + dy * .3) / 6, -.94, .94);

/** Compatibility entry point for callers using the released solo identities. */
export function crossingSignal(lane: Lane, time: number, mode: Mode = 'arcade'): { active: boolean; lit: boolean; beat: number } {
  return crossingSignalAtScale(lane, time, soloModeDefinition(mode).rules.simulation.worldTimeScale);
}

/** The bell and crossing lamps share a clock, including the train's passage.
 * Vehicle speed can vary, but the crossing bell still strikes every .5 s. */
export function crossingSignalAtScale(lane: Lane, time: number, worldTimeScale: number): { active: boolean; lit: boolean; beat: number } {
  const phase = trainPhase(lane, time);
  const clock = wrap(time + lane.phase, lane.period) / worldTimeScale;
  const active = phase.warning || phase.x !== null;
  // Wrapping can put an exact boundary a few ulps below its intended beat.
  return { active, lit: active && (clock + 1e-9) % .5 < .25, beat: Math.floor((clock + 1e-9) / .5) };
}

const palettes: Record<string, { wind: number; water: number; air: number; birds: number }> = {
  pond: { wind: .13, water: .52, air: .96, birds: .33 },
  orchard: { wind: .11, water: .46, air: 1, birds: .40 },
  bloom: { wind: .09, water: .49, air: 1.06, birds: .36 },
  dunes: { wind: .20, water: .40, air: .92, birds: .12 },
  frost: { wind: .17, water: .42, air: 1.08, birds: .10 },
  neon: { wind: .065, water: .34, air: 1, birds: 0 },
};

/** A vehicle's voice belongs to its physical lattice identity, never its
 * wrapped draw index. Long vehicles have a diesel body; the city has more EVs. */
function vehicleVoice(lane: Lane, actor: LaneActor, seed: number): string {
  if (actor.kind === 'truck' || !lane.actors && actor.length > 1.5) return 'truck';
  if (actor.kind === 'sports') return 'compact';
  const identity = (Math.imul(actor.id + 1, 73856093) ^ Math.imul(lane.index + 100, 19349663) ^ actor.variant ^ seed) >>> 0;
  const fleet = lane.world.id === 'neon' ? ['electric', 'electric', 'compact', 'sedan'] : ['compact', 'sedan', 'compact', 'electric'];
  return fleet[identity % fleet.length]!;
}

/** Choose concert-pitch notes; each pack transposes its horn and music together.
 * Chord tones lead, scale tones add color, and nearby notes keep the line gentle. */
function hornNote(clock: number, voice: string, variation: number, previous: number | null): number {
  const harmony = musicHarmonyAt(clock);
  const minimum = voice === 'truck' ? HORN_MIN_MIDI : voice === 'electric' ? 60 : 55;
  const maximum = voice === 'truck' ? 60 : HORN_MAX_MIDI;
  const notes: number[] = [];
  for (let note = minimum; note <= maximum; note++) {
    if (harmony.pitchClasses.includes(note % 12) && note !== previous) notes.push(note);
  }
  const nearby = previous === null ? notes : notes.filter(note => Math.abs(note - previous) <= 7);
  const pool = nearby.length ? nearby : notes;
  const chordTones = pool.filter(note => harmony.chord.some(chordNote => chordNote % 12 === note % 12));
  const choices = variation % 4 && chordTones.length ? chordTones : pool;
  return choices[(variation >>> 2) % choices.length]!;
}

/** Independent audio variation never consumes the level generator's RNG. */
function hornVariation(id: string, seed: number, sequence: number): number {
  let value = (seed ^ Math.imul(sequence + 1, 0x9e3779b9)) >>> 0;
  for (const char of id) value = Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0;
  value = Math.imul(value ^ value >>> 16, 0x85ebca6b);
  return (value ^ value >>> 13) >>> 0;
}

/** Reserve a fixed amount of headroom regardless of how many roads overlap.
 * Secondary vehicles remain audible details, rather than a traffic noise bed. */
function limitPower(loops: SceneLoop[], maximum: number): void {
  const power = Math.sqrt(loops.reduce((sum, loop) => sum + loop.gain ** 2, 0));
  if (power > maximum) for (const loop of loops) loop.gain *= maximum / power;
}

/** Sound follows visible actors and the run clock; it never changes gameplay. */
export class Soundscape {
  private run: Game | null = null;
  private time = -1;
  private active = false;
  private bellBeats = new Map<number, number>();
  private honked = new Map<string, number>();
  private cars = new Set<string>();
  private nextHonk = 0;
  private nextBird = 0;
  private nextWave = 0;
  private hornSequence = 0;
  private lastHornNote: number | null = null;

  constructor(private audio: AudioSink) {}

  reset(): void {
    this.audio.syncLoops([]);
    this.run = null; this.time = -1; this.active = false;
    this.bellBeats.clear(); this.honked.clear(); this.cars.clear();
    this.nextHonk = 0; this.nextBird = 0; this.nextWave = 0;
    this.hornSequence = 0; this.lastHornNote = null;
  }

  update(game: Game, enabled = true): void {
    if (this.run !== game || game.time < this.time) this.reset();
    this.run = game; this.time = game.time;
    if (!enabled || game.state !== 'playing') {
      if (this.active) this.audio.syncLoops([]);
      this.active = false;
      this.bellBeats.clear(); this.cars.clear();
      // Never accumulate scheduled events while paused, muted or in a drawer.
      this.nextBird = game.time + 3 + (game.seed >>> 0) % 5;
      this.nextWave = game.time;
      return;
    }
    if (!this.active) {
      this.nextBird = game.time + 3 + (game.seed >>> 0) % 5;
      this.nextWave = game.time;
      this.active = true;
    }

    const px = game.groundX, py = game.groundY;
    // Simulation speed never detunes music. Pauses freeze this shared clock.
    const worldTimeScale = game.rules.simulation.worldTimeScale;
    const musicClock = game.time / worldTimeScale;
    // The destination changes at key-down; the listener crosses a biome only
    // when its visible ground position does. The audio mixer crossfades voices.
    const world = game.rows.get(Math.round(py))?.world.id ?? game.lane.world.id;
    const palette = palettes[world] ?? palettes.pond!;
    const traffic: SceneLoop[] = [], trains: SceneLoop[] = [];
    const bells: { lane: Lane; gain: number; pan: number; beat: number; lit: boolean }[] = [];
    const horns: { id: string; gain: number; pan: number; variant: string; arrival: number }[] = [];
    let roadFocus = 0, riverFocus = 0;
    for (const lane of game.rows.values()) {
      const focus = reach(Math.abs(lane.index - py), 1.15);
      if (lane.kind === 'road') roadFocus = Math.max(roadFocus, focus);
      if (lane.kind === 'river') riverFocus = Math.max(riverFocus, focus);
    }
    let water = 0, waterPan = 0, waterWorld = world;
    for (const lane of game.rows.values()) {
      const dy = lane.index - py;
      if (Math.abs(dy) > 7) continue;
      if (lane.kind === 'river') {
        const gain = reach(Math.abs(dy), 2.4) * (palettes[lane.world.id]?.water ?? palette.water)
          * (.2 + .8 * riverFocus) * (1 - .72 * roadFocus);
        if (gain > water) { water = gain; waterPan = panAt(0, dy); waterWorld = lane.world.id; }
      }
      if (lane.kind === 'road') {
        for (const actor of laneActors(lane, game.time)) {
          const { x, length, speed } = actor;
          const dx = x - px;
          const id = `car:${lane.index}:${actor.id}`;
          const variant = vehicleVoice(lane, actor, game.seed);
          const along = Math.max(0, Math.abs(dx) - length / 2);
          // A tight cubic pass envelope leaves audible gaps between vehicles.
          // Adjacent roads stay distant, especially while riding the stream.
          const envelope = clamp(1 - along / 4.3) ** 3 * reach(Math.abs(dy), 3.2);
          const gain = envelope * (.40 + Math.min(Math.abs(speed), 5) * .025 + (length > 1.5 ? .07 : 0))
            * (.23 + .77 * roadFocus) * (1 - .8 * riverFocus);
          const approaching = -Math.sign(speed) * dx / Math.hypot(dx, 2);
          const rate = clamp(.90 + Math.abs(speed) * .035 - (length > 1.5 ? .13 : 0) + approaching * .075, .72, 1.3);
          if (gain > .004) traffic.push({ id, cue: 'traffic.pass', gain, pan: panAt(dx, dy), rate, variant });

          // Drivers react only to the occupied/landing road and an approaching
          // vehicle that will reach the traveler soon. Passing traffic is quiet.
          const occupied = lane.index === game.y || game.hop > 0 && lane.index === game.fromY && Math.abs(dy) < .35;
          const gap = (game.x - x) * Math.sign(speed) - length / 2 - .23;
          const arrival = gap / Math.abs(speed);
          // Actual two-dimensional distance, including during a hop. Speed and
          // a long bumper must never let a distant car bypass the three tiles.
          if (occupied && Math.hypot(dx, dy) <= 3 && arrival > .18 && arrival < 1.35 && game.time >= (this.honked.get(id) ?? -100) + 10) {
            horns.push({ id, gain: .62 + .18 * reach(arrival, 1.35), pan: panAt(dx, dy), variant, arrival });
          }
        }
      }
      if (lane.kind === 'rail') {
        const phase = trainPhase(lane, game.time);
        const signal = crossingSignalAtScale(lane, game.time, worldTimeScale);
        if (signal.active && Math.abs(dy) < 4.5) {
          bells.push({ lane, gain: .20 + .58 * reach(Math.abs(dy), 4.5), pan: panAt(0, dy), beat: signal.beat, lit: signal.lit });
        }
        if (phase.x !== null) {
          const dx = phase.x - px;
          const nearest = clamp(px, phase.x + TRAIN_BOUNDS.minX, phase.x + TRAIN_BOUNDS.maxX);
          const distance = Math.hypot(nearest - px, dy * 1.2);
          const gain = reach(distance, 9) * .70;
          const cycle = Math.floor((game.time + lane.phase) / lane.period);
          const approaching = -Math.sign(lane.speed) * dx / Math.hypot(dx, 5);
          if (gain > .008) trains.push({ id: `train:${lane.index}:${cycle}`, cue: 'train.pass', gain, pan: panAt(dx * .6, dy), rate: 1 + approaching * .11 });
        }
      }
    }

    bells.sort((a, b) => b.gain - a.gain);
    const bell = bells[0];
    if (bell?.lit && this.bellBeats.get(bell.lane.index) !== bell.beat) {
      this.audio.play('train', { gain: bell.gain, pan: bell.pan });
    }
    this.bellBeats.clear();
    if (bell) this.bellBeats.set(bell.lane.index, bell.beat);

    if (game.time >= this.nextHonk && horns.length) {
      const horn = horns.sort((a, b) => a.arrival - b.arrival)[0]!;
      const variation = hornVariation(horn.id, game.seed, this.hornSequence++);
      const note = hornNote(musicClock, horn.variant, variation, this.lastHornNote);
      this.lastHornNote = note;
      this.audio.play('traffic.honk', { gain: horn.gain, pan: horn.pan,
        rate: 2 ** ((note - HORN_REFERENCE_MIDI) / 12), variant: `${horn.variant}${variation & 1 ? '.alt' : ''}` });
      this.honked.set(horn.id, game.time); this.nextHonk = game.time + 2.7;
    }
    for (const [id, time] of this.honked) if (game.time - time > 24) this.honked.delete(id);

    if (game.warning && game.time >= this.nextWave) {
      this.audio.play('idle', { gain: .65 + .2 * reach(game.waveSeconds, 5) });
      this.nextWave = game.time + (game.waveSeconds <= 2 ? .52 : .96) * worldTimeScale;
    } else if (!game.warning) this.nextWave = game.time;

    const urgency = game.warning ? .35 : bell ? .6 : 1;
    if (game.time >= this.nextBird) {
      if (palette.birds && !game.warning && !bell && roadFocus < .2) {
        this.audio.play('ambience.birds', { gain: palette.birds * (1 - .25 * riverFocus), pan: Math.sin(game.time * .73 + game.seed) * .7, rate: palette.air, variant: world });
      }
      this.nextBird = game.time + 7 + 5 * (Math.sin(game.time * .37 + game.seed) + 1) / 2;
    }
    // Retain almost-equally-close vehicles rather than restarting at every tie.
    traffic.sort((a, b) => b.gain * (this.cars.has(b.id) ? 1.12 : 1) - a.gain * (this.cars.has(a.id) ? 1.12 : 1));
    const cars = traffic.slice(0, 3);
    this.cars = new Set(cars.map(car => car.id));
    trains.sort((a, b) => b.gain - a.gain);
    const train = trains[0];
    const trainPriority = 1 - .72 * clamp((train?.gain ?? 0) / .7);
    cars.forEach((car, index) => { car.gain *= [1, .5, .25][index]! * urgency * trainPriority; });
    limitPower(cars, .52 * urgency * trainPriority);
    // Scene automation operates beneath the user's saved mixer settings.
    // The occupied surface leads; air and music leave room for its details.
    const surface = Math.max(roadFocus, riverFocus);
    const loops: SceneLoop[] = [
      { id: 'music', cue: 'music', gain: .30 * (1 - .32 * surface) * urgency, rate: 1, offset: musicClock },
      { id: 'wind', cue: 'ambience.wind', gain: palette.wind * (1 - .6 * surface) * urgency * trainPriority, rate: palette.air, variant: world },
    ];
    if (water > .004) loops.push({ id: 'water', cue: 'ambience.water', gain: water * urgency * trainPriority, pan: waterPan, variant: waterWorld });
    if (train) { train.gain *= game.warning ? .4 : 1; loops.push(train); }
    this.audio.syncLoops([...loops, ...cars]);
  }
}
