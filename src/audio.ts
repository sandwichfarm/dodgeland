import { DUCK_SAMPLE_RATE, DUCK_PCM_BASE64 } from './duck-sample.js';
import { HORN_REFERENCE_MIDI, MUSIC_BEAT_SECONDS, MUSIC_BAR_SECONDS, MUSIC_LOOP_SECONDS, musicHarmonyAt } from './harmony.js';

/** Semantic cues stay the same when a player changes sound packs. */
export const GAME_SOUND_CUES = ['hop', 'coin', 'crash', 'splash', 'train', 'idle'] as const;
export const CHARACTER_CALL_CUES = [
  'call.duck', 'call.chicken', 'call.frog', 'call.axolotl', 'call.robot', 'call.fox', 'call.penguin',
] as const;
export type CharacterCallCue = typeof CHARACTER_CALL_CUES[number];
export const SCENE_SOUND_CUES = [
  'music', 'ambience.wind', 'ambience.water', 'ambience.birds', 'traffic.pass', 'traffic.honk', 'train.pass',
] as const;
export const MOB_SOUND_CUES = ['mob.spawn', 'mob.attack'] as const;
export const HEALTH_SOUND_CUES = ['hurt.rear', 'hurt.side', 'health.restore'] as const;
export const DEATH_SOUND_CUES = [
  'death.traffic', 'death.train', 'death.water', 'death.wave', 'death.swept', 'death.trail', 'death.mob',
] as const;
export const SPILL_SOUND_CUES = ['spill.coin', 'spill.fabric', 'spill.trinket'] as const;
export const SOUND_CUES = [...GAME_SOUND_CUES, ...CHARACTER_CALL_CUES, ...SCENE_SOUND_CUES, ...MOB_SOUND_CUES, ...DEATH_SOUND_CUES, ...HEALTH_SOUND_CUES, ...SPILL_SOUND_CUES] as const;
export type SoundCue = typeof SOUND_CUES[number];

export const BUILTIN_PACKS = [
  { id: 'pond', name: 'Pond', description: 'Warm wooden melodies, pond wildlife, and a living roadside.' },
  { id: 'arcade', name: 'Pocket Arcade', description: 'A soft chiptune arrangement with playful electronic scenery.' },
] as const;

export const MAX_CLIP_BYTES = 1024 * 1024;
export const MAX_CLIP_SECONDS = 3;
const MAX_VOICES = 6;
const MAX_SPILL_VOICES = 3;
const MAX_LOOPS = 8;
const VOICE_PEAK = 0.16;
const TAU = Math.PI * 2;
const ARCADE_TRANSPOSE = 2;
const midiFrequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export interface PlayOptions { gain?: number; pan?: number; rate?: number; variant?: string }
export interface LoopRequest extends PlayOptions {
  id: string;
  cue: SoundCue;
  gain: number;
  /** Initial score position in seconds. Only music uses it; updates never seek. */
  offset?: number;
}
export interface AudioMix { music: number; ambience: number; effects: number }

/** Music and environmental beds need room to breathe; ordinary effects stay short. */
export function maxDurationForCue(cue?: SoundCue): number {
  return cue === 'music' ? 64 : cue?.startsWith('ambience.') ? 12 : MAX_CLIP_SECONDS;
}

function category(cue: SoundCue): keyof AudioMix {
  return cue === 'music' ? 'music'
    : cue.startsWith('ambience.') || cue === 'traffic.pass' || cue === 'train.pass' ? 'ambience' : 'effects';
}

function cuePeak(cue: SoundCue): number {
  if (cue === 'music') return 0.14;
  if (cue === 'ambience.wind') return 0.10;
  if (cue === 'ambience.water') return 0.18;
  if (cue === 'ambience.birds') return 0.10;
  if (cue === 'traffic.pass') return 0.32;
  if (cue === 'train.pass') return 0.40;
  if (cue === 'traffic.honk') return 0.25;
  if (cue === 'train') return 0.23;
  if (cue === 'hurt.rear') return 0.17;
  if (cue === 'hurt.side') return 0.22;
  if (cue === 'spill.coin') return 0.15;
  if (cue === 'spill.fabric') return 0.10;
  if (cue === 'spill.trinket') return 0.13;
  if (cue.startsWith('death.')) return 0.27;
  return VOICE_PEAK;
}

const clamp = (value: number | undefined, fallback: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.max(min, Math.min(max, value!)) : fallback;

export interface AudioVoice {
  stop(): void;
  readonly ended: Promise<void>;
}

interface Tone {
  at: number;
  duration: number;
  frequency: number;
  to?: number;
  gain: number;
  wave?: 'sine' | 'triangle' | 'square' | 'noise';
}

type LegacyCue = typeof GAME_SOUND_CUES[number] | CharacterCallCue;
type CueScore = Record<Exclude<LegacyCue, 'call.duck' | 'call.chicken' | 'train'>, readonly Tone[]>;

const pond: CueScore = {
  hop: [{ at: 0, duration: 0.1, frequency: 260, to: 640, gain: 0.8 }],
  coin: [
    { at: 0, duration: 0.18, frequency: 880, gain: 0.6 },
    { at: 0.07, duration: 0.25, frequency: 1320, gain: 0.45 },
    { at: 0, duration: 0.08, frequency: 1760, gain: 0.1 },
  ],
  crash: [
    { at: 0, duration: 0.22, frequency: 170, to: 48, gain: 0.7, wave: 'triangle' },
    { at: 0, duration: 0.14, frequency: 700, gain: 0.4, wave: 'noise' },
  ],
  splash: [
    { at: 0, duration: 0.33, frequency: 1500, to: 180, gain: 0.7, wave: 'noise' },
    { at: 0.045, duration: 0.16, frequency: 420, to: 130, gain: 0.5 },
    { at: 0.17, duration: 0.12, frequency: 260, to: 520, gain: 0.3 },
  ],
  idle: [
    { at: 0, duration: 0.1, frequency: 700, to: 900, gain: 0.45 },
    { at: 0.14, duration: 0.1, frequency: 700, to: 900, gain: 0.45 },
  ],
  'call.frog': [
    { at: 0, duration: 0.18, frequency: 155, to: 105, gain: 0.6, wave: 'triangle' },
    { at: 0, duration: 0.12, frequency: 460, to: 260, gain: 0.26, wave: 'square' },
    { at: 0.2, duration: 0.28, frequency: 135, to: 75, gain: 0.7, wave: 'triangle' },
    { at: 0.2, duration: 0.21, frequency: 360, to: 210, gain: 0.28, wave: 'square' },
  ],
  // A playful invented bubble chirp for Petal.
  'call.axolotl': [
    { at: 0, duration: 0.11, frequency: 480, to: 1150, gain: 0.65 },
    { at: 0.13, duration: 0.13, frequency: 640, to: 1450, gain: 0.55 },
    { at: 0.29, duration: 0.13, frequency: 1250, to: 710, gain: 0.45 },
  ],
  'call.robot': [
    { at: 0, duration: 0.1, frequency: 440, gain: 0.4, wave: 'square' },
    { at: 0.12, duration: 0.1, frequency: 880, gain: 0.4, wave: 'square' },
    { at: 0.24, duration: 0.15, frequency: 660, gain: 0.4, wave: 'square' },
  ],
  'call.fox': [
    { at: 0, duration: 0.075, frequency: 510, to: 1150, gain: 0.5, wave: 'triangle' },
    { at: 0.055, duration: 0.19, frequency: 1150, to: 530, gain: 0.55, wave: 'triangle' },
    { at: 0.015, duration: 0.14, frequency: 2600, to: 950, gain: 0.19, wave: 'noise' },
  ],
  'call.penguin': [
    { at: 0, duration: 0.12, frequency: 1370, to: 1600, gain: 0.6 },
    { at: 0.015, duration: 0.09, frequency: 2055, to: 2400, gain: 0.15 },
    { at: 0.18, duration: 0.16, frequency: 1510, to: 1220, gain: 0.55 },
  ],
};

const arcade: CueScore = {
  hop: [
    { at: 0, duration: 0.055, frequency: 440, gain: 0.4, wave: 'square' },
    { at: 0.04, duration: 0.055, frequency: 660, gain: 0.35, wave: 'square' },
  ],
  coin: [
    { at: 0, duration: 0.08, frequency: 659, gain: 0.4, wave: 'square' },
    { at: 0.065, duration: 0.08, frequency: 988, gain: 0.4, wave: 'square' },
    { at: 0.13, duration: 0.16, frequency: 1319, gain: 0.5, wave: 'triangle' },
  ],
  crash: [
    { at: 0, duration: 0.09, frequency: 220, gain: 0.5, wave: 'square' },
    { at: 0.07, duration: 0.09, frequency: 147, gain: 0.5, wave: 'square' },
    { at: 0.14, duration: 0.17, frequency: 73, to: 40, gain: 0.6, wave: 'triangle' },
    { at: 0, duration: 0.09, frequency: 2200, gain: 0.3, wave: 'noise' },
  ],
  splash: [
    { at: 0, duration: 0.2, frequency: 880, to: 110, gain: 0.4, wave: 'square' },
    { at: 0.09, duration: 0.2, frequency: 1400, to: 120, gain: 0.7, wave: 'noise' },
  ],
  idle: [
    { at: 0, duration: 0.085, frequency: 523, gain: 0.4, wave: 'triangle' },
    { at: 0.13, duration: 0.085, frequency: 784, gain: 0.4, wave: 'triangle' },
  ],
  'call.frog': [
    { at: 0, duration: 0.095, frequency: 165, gain: 0.5, wave: 'square' },
    { at: 0.075, duration: 0.12, frequency: 110, gain: 0.55, wave: 'triangle' },
    { at: 0.23, duration: 0.1, frequency: 147, gain: 0.5, wave: 'square' },
    { at: 0.31, duration: 0.16, frequency: 73, gain: 0.65, wave: 'triangle' },
  ],
  'call.axolotl': [
    { at: 0, duration: 0.065, frequency: 523, to: 1047, gain: 0.5, wave: 'triangle' },
    { at: 0.11, duration: 0.065, frequency: 784, to: 1568, gain: 0.45, wave: 'triangle' },
    { at: 0.22, duration: 0.085, frequency: 1319, gain: 0.28, wave: 'square' },
    { at: 0.3, duration: 0.095, frequency: 1047, gain: 0.4, wave: 'triangle' },
  ],
  'call.robot': [
    { at: 0, duration: 0.085, frequency: 220, gain: 0.4, wave: 'square' },
    { at: 0.1, duration: 0.085, frequency: 1760, gain: 0.3, wave: 'square' },
    { at: 0.2, duration: 0.085, frequency: 330, gain: 0.4, wave: 'square' },
    { at: 0.3, duration: 0.13, frequency: 1320, gain: 0.32, wave: 'square' },
  ],
  'call.fox': [
    { at: 0, duration: 0.06, frequency: 659, to: 1319, gain: 0.4, wave: 'square' },
    { at: 0.055, duration: 0.08, frequency: 1175, gain: 0.4, wave: 'square' },
    { at: 0.12, duration: 0.11, frequency: 784, to: 392, gain: 0.5, wave: 'triangle' },
    { at: 0, duration: 0.11, frequency: 2400, gain: 0.15, wave: 'noise' },
  ],
  'call.penguin': [
    { at: 0, duration: 0.075, frequency: 1568, gain: 0.3, wave: 'square' },
    { at: 0.055, duration: 0.08, frequency: 1760, gain: 0.42, wave: 'triangle' },
    { at: 0.2, duration: 0.085, frequency: 1568, gain: 0.3, wave: 'square' },
    { at: 0.27, duration: 0.1, frequency: 1319, gain: 0.42, wave: 'triangle' },
  ],
};


const builtinBuffers = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();

/** Local orchestration only: imported packs still supply one file per semantic cue. */
const WORLD_VOICES = ['pond', 'orchard', 'bloom', 'dunes', 'frost', 'neon'] as const;
const ENGINE_VOICES = ['sedan', 'compact', 'truck', 'electric'] as const;
const HORN_VOICES = [...ENGINE_VOICES, ...ENGINE_VOICES.map(voice => `${voice}.alt`)];
const SPILL_VOICES = ['light', 'mid', 'heavy'] as const;
function builtinVariant(cue: SoundCue, variant?: string): string {
  const choices: readonly string[] = cue === 'traffic.pass' ? ENGINE_VOICES
    : cue === 'traffic.honk' ? HORN_VOICES
    : cue.startsWith('spill.') ? SPILL_VOICES
    : cue === 'ambience.water' || cue === 'ambience.wind' || cue === 'ambience.birds' ? WORLD_VOICES : [];
  // Defaults keep their original cache keys; arbitrary variant strings never grow the cache.
  return variant && variant !== choices[0] && choices.includes(variant) ? variant : '';
}
function bufferKey(pack: string, cue: SoundCue, variant?: string): string {
  const voice = builtinVariant(cue, variant);
  return `${pack}:${cue}${voice ? `:${voice}` : ''}`;
}

/** Match the ends without a fade to silence. The short bridge removes loop clicks. */
function joinLoop(pcm: Float32Array, sampleRate: number): void {
  const frames = Math.min(Math.floor(sampleRate * 0.012), Math.floor(pcm.length / 4));
  const seam = (pcm[0] + pcm[pcm.length - 1]) * 0.5;
  for (let i = 0; i < frames; i++) {
    const t = i / frames;
    const ease = t * t * (3 - 2 * t);
    pcm[i] = seam * (1 - ease) + pcm[i] * ease;
    const end = pcm.length - 1 - i;
    pcm[end] = seam * (1 - ease) + pcm[end] * ease;
  }
}

function normalize(buffer: AudioBuffer, peak: number): void {
  let maximum = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    for (const sample of buffer.getChannelData(ch)) maximum = Math.max(maximum, Math.abs(sample));
  }
  if (!maximum) return;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const pcm = buffer.getChannelData(ch);
    for (let i = 0; i < pcm.length; i++) pcm[i] *= peak / maximum;
  }
}

function randomStream(seed: number): () => number {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return ((seed >>> 0) / 0x100000000) * 2 - 1;
  };
}

interface Note {
  at: number; duration: number; frequency: number; gain: number;
  to?: number; attack?: number; decay?: number; harmonics?: readonly number[]; pan?: number;
}

/** A struck/reeded voice; writing through the wrap preserves the last bar's tails. */
function addNote(buffer: AudioBuffer, note: Note, wrap = false): void {
  const sr = buffer.sampleRate;
  const start = Math.floor(note.at * sr);
  const count = Math.floor(note.duration * sr);
  const harmonics = note.harmonics ?? [1, 0.18, 0.04];
  const pan = note.pan ?? 0;
  let phase = 0;
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  const channelGains = channels.map((_, ch) => channels.length === 1 ? 1 : Math.sqrt((ch ? 1 + pan : 1 - pan) * 0.5));
  for (let i = 0; i < count; i++) {
    const index = wrap ? (start + i) % buffer.length : start + i;
    if (index >= buffer.length) break;
    const time = i / sr;
    const fraction = i / count;
    const frequency = note.frequency * ((note.to ?? note.frequency) / note.frequency) ** fraction;
    phase += frequency / sr;
    let sample = 0;
    for (let h = 0; h < harmonics.length; h++) {
      // Upper partials of a wooden/metallic instrument die away before its body.
      sample += Math.sin(TAU * phase * (h + 1)) * harmonics[h] * Math.exp(-h * 1.5 * fraction);
    }
    const attack = Math.min(1, time / (note.attack ?? 0.006));
    const release = Math.min(1, (count - i - 1) / (sr * 0.03));
    const envelope = attack * release * Math.exp(-(note.decay ?? 4.2) * fraction);
    for (let ch = 0; ch < channels.length; ch++) channels[ch][index] += sample * envelope * note.gain * channelGains[ch];
  }
}

function addNoise(buffer: AudioBuffer, at: number, duration: number, gain: number, frequency: number, seed: number, decay = 3.5): void {
  const pcm = buffer.getChannelData(0), sr = buffer.sampleRate, random = randomStream(seed);
  const start = Math.floor(at * sr), count = Math.min(Math.floor(duration * sr), pcm.length - start);
  const alpha = 1 - Math.exp(-TAU * frequency / sr);
  let low = 0, rumble = 0;
  for (let i = 0; i < count; i++) {
    low += alpha * (random() - low);
    rumble += 0.015 * (low - rumble);
    const envelope = Math.min(1, i / (sr * 0.004)) * Math.min(1, (count - i - 1) / (sr * 0.05)) * Math.exp(-decay * i / count);
    pcm[start + i] += (low - rumble * 0.5) * gain * envelope;
  }
}

function* musicSteps(context: BaseAudioContext, arcade: boolean): Generator<void, AudioBuffer> {
  // An original eight-bar A/A'/B/A melody at 80 BPM, over C–Am–F–G.
  // Bass, soft chord answers and a spare shaker give it space around gameplay.
  const sr = 22_050, beat = MUSIC_BEAT_SECONDS, bar = MUSIC_BAR_SECONDS;
  const buffer = context.createBuffer(2, sr * MUSIC_LOOP_SECONDS, sr);
  const melodies: readonly (readonly [number, number, number][])[] = [
    [[0, 72, .8], [1, 76, .7], [1.75, 79, 1.1], [3, 76, .8]],
    [[.5, 74, .6], [1.25, 72, .7], [2.5, 69, 1.2]],
    [[0, 69, .8], [1.5, 72, .6], [2.25, 76, 1.25]],
    [[.5, 74, .8], [2, 71, .65], [3, 67, .8]],
    [[0, 72, .8], [1, 76, .6], [1.75, 79, .6], [2.5, 81, .65], [3.25, 79, .6]],
    [[.5, 76, 1], [2, 72, .65], [3, 69, .7]],
    [[0, 69, .6], [.75, 72, .75], [2, 76, .7], [3, 74, .7]],
    [[0, 71, .75], [1.5, 74, .65], [2.5, 72, 1.3]],
  ];
  const frequency = (midi: number) => midiFrequency(midi + (arcade ? ARCADE_TRANSPOSE : 0));
  for (let b = 0; b < 8; b++) {
    const at = b * bar, chord = musicHarmonyAt(at).chord;
    for (const step of [0, 2]) {
      addNote(buffer, { at: at + step * beat, duration: 1.2, frequency: frequency(chord[0] - 12), gain: .13, attack: .025, decay: 3, harmonics: [1, .18], pan: 0 }, true);
      yield;
    }
    for (let n = 0; n < chord.length; n++) {
      addNote(buffer, { at: at + .03 * n, duration: 2.8, frequency: frequency(chord[n]), gain: .022, attack: .14, decay: 1.5, harmonics: arcade ? [1, 0, .10] : [1, .08], pan: n % 2 ? .45 : -.45 }, true);
      yield;
      addNote(buffer, { at: at + 2.5 * beat + .018 * n, duration: .62, frequency: frequency(chord[n] + 12), gain: .024, harmonics: [1, .12], pan: .28 }, true);
      yield;
    }
    for (const [offset, pitch, length] of melodies[b]) {
      addNote(buffer, { at: at + offset * beat, duration: length * beat + .26, frequency: frequency(pitch), gain: .11, attack: arcade ? .008 : .012, decay: 4,
        harmonics: arcade ? [1, 0, .19, 0, .055] : [1, .24, .065], pan: -.18 }, true);
      yield;
      // A quiet room reflection, not a competing second melody.
      addNote(buffer, { at: at + offset * beat + .14, duration: length * beat + .3, frequency: frequency(pitch), gain: .017, attack: .03, harmonics: [1], pan: .42 }, true);
      yield;
    }
  }
  const random = randomStream(0x5fa87);
  for (let ch = 0; ch < 2; ch++) {
    const pcm = buffer.getChannelData(ch);
    let smooth = 0;
    for (let i = 0; i < pcm.length; i++) {
      if (i % 4096 === 0) yield;
      const phase = (i / sr) % (beat * .5), length = .045;
      const noise = random(); smooth += .25 * (noise - smooth);
      if (phase < length) pcm[i] += (noise - smooth) * .012 * Math.sin(Math.PI * phase / length) * Math.exp(-4 * phase / length);
    }
    joinLoop(pcm, sr);
  }
  return buffer;
}

function musicBuffer(context: BaseAudioContext, arcade: boolean): AudioBuffer {
  const steps = musicSteps(context, arcade);
  let next = steps.next();
  while (!next.done) next = steps.next();
  return next.value;
}

/** Engines are harmonic, mechanically pulsed sources. Tires are a quiet detail. */
function engineBuffer(context: BaseAudioContext, variant: string, arcade: boolean): AudioBuffer {
  const sr = 22_050, duration = 2.8;
  const buffer = context.createBuffer(1, sr * duration, sr), pcm = buffer.getChannelData(0);
  const kind = ENGINE_VOICES.indexOf(variant as typeof ENGINE_VOICES[number]);
  const random = randomStream(0x79ea1 + (kind + 1) * 919 + (arcade ? 47 : 0));
  const electric = variant === 'electric', truck = variant === 'truck', compact = variant === 'compact';
  const rpm = electric ? 235 : truck ? 46 : compact ? 116 : 78;
  const partials = electric ? [1, .08, .025, .015] : truck ? [1, .72, .48, .31, .18, .12]
    : compact ? [1, .30, .50, .12, .16] : [1, .44, .20, .11, .045];
  let phase = 0, tire = 0, rumble = 0;
  for (let i = 0; i < pcm.length; i++) {
    const t = i / sr, cycle = t / duration;
    const throttle = Math.sin(TAU * cycle - .4);
    // A gentle rise, gear change and recovery. Vehicle position supplies the pass-by envelope.
    const shift = Math.exp(-(((cycle - .57) / .075) ** 2));
    const rev = rpm * (1 + .075 * throttle - (electric ? .015 : .11) * shift);
    phase += rev * (arcade ? 1.04 : 1) / sr;
    const firing = electric ? 1 : .79 + .16 * Math.sin(TAU * phase * (truck ? .25 : .5))
      + (truck ? .09 : .045) * Math.sin(TAU * phase * .125);
    let motor = 0;
    for (let h = 0; h < partials.length; h++) motor += Math.sin(TAU * phase * (h + 1)) * partials[h];
    const noise = random(); tire += .035 * (noise - tire); rumble += .006 * (noise - rumble);
    const gear = electric ? .09 * Math.sin(TAU * phase * 2.53) : .035 * Math.sin(TAU * phase * 7.13);
    pcm[i] = (motor * firing + gear) * .24 * (1 - .14 * shift)
      + (tire - rumble) * (electric ? .06 : .045);
    if (arcade) pcm[i] += Math.sin(TAU * phase * 3) * .025;
  }
  joinLoop(pcm, sr);
  return buffer;
}

/** Separated resonant droplets and low lapping replace the old broadband water bed. */
function waterBuffer(context: BaseAudioContext, world: number, arcade: boolean): AudioBuffer {
  const sr = 22_050, duration = 8;
  const buffer = context.createBuffer(1, sr * duration, sr), pcm = buffer.getChannelData(0);
  const random = randomStream(0x315ac + world * 3109 + (arcade ? 101 : 0));
  const unit = () => (random() + 1) * .5;
  // Pond gulps; orchard rills; garden droplets; hollow oasis glugs; ice melt; neon plinks.
  const profiles = [
    { count: 27, pitch: 520, spread: 440, length: .20, lap: 130 },
    { count: 42, pitch: 820, spread: 650, length: .13, lap: 185 },
    { count: 24, pitch: 1150, spread: 750, length: .16, lap: 225 },
    { count: 16, pitch: 340, spread: 280, length: .28, lap: 100 },
    { count: 19, pitch: 1480, spread: 930, length: .23, lap: 165 },
    { count: 28, pitch: 660, spread: 550, length: .17, lap: 220 },
  ];
  const profile = profiles[world];
  for (let n = 0; n < profile.count; n++) {
    const at = (n + unit() * .75) * duration / profile.count;
    const frequency = (profile.pitch + unit() * profile.spread) * (arcade ? 1.09 : 1);
    const length = profile.length * (.55 + unit() * .8);
    // A quickly falling cavity resonance reads as a bubble, with actual quiet between clusters.
    addNote(buffer, { at, duration: length, frequency, to: frequency * (world === 4 ? .94 : .56),
      gain: .13 + unit() * .13, attack: .002, decay: 4.7,
      harmonics: arcade ? [1, 0, .08] : [1, .09] }, true);
    if (n % 3 === 0) addNote(buffer, { at: at + .045, duration: length * .7,
      frequency: frequency * .73, to: frequency * .52, gain: .06, attack: .003, decay: 5, harmonics: [1] }, true);
  }
  for (let n = 0; n < 7; n++) {
    const at = n * 1.1 + unit() * .25;
    addNote(buffer, { at, duration: .42 + unit() * .25, frequency: profile.lap * (.8 + unit() * .4),
      to: profile.lap * 1.4, gain: .055, attack: .065, decay: 2.5, harmonics: [1, .22, .08] }, true);
    addNoise(buffer, at, .35, .023, world === 1 ? 1250 : 700, 541 + n * 13 + world * 71, 2.5);
  }
  // A very low, slowly undulating undercurrent connects the laps without a wall of hiss.
  let low = 0;
  for (let i = 0; i < pcm.length; i++) {
    low += .012 * (random() - low);
    pcm[i] += low * .022 * (.55 + .45 * Math.sin(TAU * i / pcm.length * 3) ** 2);
  }
  joinLoop(pcm, sr);
  return buffer;
}

/** Quiet, sparse local character: each world has its own sound floor. */
function windBuffer(context: BaseAudioContext, world: number, arcade: boolean): AudioBuffer {
  const sr = 22_050, duration = 8;
  const buffer = context.createBuffer(1, sr * duration, sr), pcm = buffer.getChannelData(0);
  const random = randomStream(0x661c3 + world * 1217 + (arcade ? 233 : 0));
  let low = 0, deep = 0;
  for (let i = 0; i < pcm.length; i++) {
    const t = i / sr, noise = random();
    low += (world === 3 ? .011 : .027) * (noise - low); deep += .003 * (noise - deep);
    const gust = Math.max(0, Math.sin(TAU * (t / duration * 2 - .12))) ** 2;
    pcm[i] = (low - deep) * gust * (world === 3 ? .10 : world === 5 ? .008 : .036);
    if (world === 2) { // A soft insect wing flutter among the flowers.
      const flutter = Math.max(0, Math.sin(TAU * (t / duration * 3 - .16))) ** 4;
      pcm[i] += (Math.sin(TAU * 174 * t) + .25 * Math.sin(TAU * 348 * t)) * .016 * flutter
        * (.72 + .28 * Math.sin(TAU * 27 * t));
    } else if (world === 5) { // Electrical hum and a slow scan, without nature recordings.
      pcm[i] += (Math.sin(TAU * 110 * t) + .20 * Math.sin(TAU * 330 * t)) * .018
        * (.65 + .25 * Math.sin(TAU * t / duration));
    }
  }
  if (world === 0) {
    for (const at of [.65, 4.7]) {
      addNote(buffer, { at, duration: .55, frequency: 2180, to: 2250, gain: .022, attack: .10, decay: 1.6, harmonics: [1] });
      addNote(buffer, { at: at + .7, duration: .38, frequency: 2390, to: 2280, gain: .014, attack: .08, harmonics: [1] });
    }
  } else if (world === 1) {
    for (const [n, at] of [.55, .69, .82, 3.3, 3.44, 6.6].entries()) {
      addNoise(buffer, at, .12, .028, 1500, 491 + n, 4);
      addNote(buffer, { at, duration: .13, frequency: 740 + n * 55, to: 610, gain: .022, attack: .005, harmonics: [1, .2] });
    }
  } else if (world === 3) {
    for (const [at, frequency] of [[.3, 235], [4.4, 310]]) {
      addNote(buffer, { at, duration: 2.7, frequency, to: frequency * .82, gain: .035, attack: .6, decay: .7, harmonics: [1, .06] });
    }
  } else if (world === 4) {
    for (const [at, frequency] of [[.35, 1175], [3.1, 1760], [6.2, 1397]]) {
      addNote(buffer, { at, duration: 1.4, frequency, gain: .034, attack: .008, decay: 5.8, harmonics: [1] });
      addNote(buffer, { at, duration: .6, frequency: frequency * 2.71, gain: .01, attack: .004, decay: 7, harmonics: [1] });
    }
  } else if (world === 5) {
    for (const at of [1.2, 5.4]) addNote(buffer, { at, duration: 1.1, frequency: arcade ? 587 : 523,
      to: arcade ? 1175 : 1047, gain: .018, attack: .24, decay: 1.4, harmonics: [1, .04] });
  }
  joinLoop(pcm, sr);
  return buffer;
}

function environmentalBuffer(context: BaseAudioContext, cue: SoundCue, arcade: boolean, variant: string): AudioBuffer {
  if (cue === 'traffic.pass') return engineBuffer(context, variant || 'sedan', arcade);
  const world = Math.max(0, WORLD_VOICES.indexOf(variant as typeof WORLD_VOICES[number]));
  if (cue === 'ambience.water') return waterBuffer(context, world, arcade);
  if (cue === 'ambience.wind') return windBuffer(context, world, arcade);
  const sr = 22_050, buffer = context.createBuffer(1, sr * 2.4, sr), pcm = buffer.getChannelData(0);
  const random = randomStream(arcade ? 0x7a21f : 0x5f812);
  let low = 0, high = 0, bass = 0;
  for (let i = 0; i < pcm.length; i++) {
    const t = i / sr, noise = random();
    low += .16 * (noise - low); high += .47 * (noise - high); bass += .006 * (noise - bass);
    const joint = t % .4;
    const rattle = Math.exp(-joint * 60) + .65 * Math.exp(-Math.max(0, joint - .095) * 80) * (joint >= .095 ? 1 : 0);
    pcm[i] = bass * 1.3 + low * .65 + (high - low) * (.15 + .52 * rattle)
      + Math.sin(TAU * 42.5 * t) * .10 + Math.sin(TAU * 85 * t) * .045
      + Math.sin(TAU * (arcade ? 425 : 350) * t) * rattle * .075;
  }
  joinLoop(pcm, sr);
  return buffer;
}

/** A held diaphragm/reed tone, not a struck musical note. Resonant harmonics
 * make the car horn recognizable while its fundamental stays on the score. */
function hornBuffer(context: BaseAudioContext, variant: string, arcade: boolean): AudioBuffer {
  const profiles = {
    sedan: { partials: [.70, 1, .86, .38, .44, .30, .18, .14, .10, .07, .05, .03], attack: .005, release: .014, breath: .035,
      pulses: [[0, .115], [.18, .165]], alternate: [[0, .24]] },
    compact: { partials: [.55, .34, 1, .24, .66, .16, .40, .12, .23, .08, .12, .05], attack: .003, release: .012, breath: .025,
      pulses: [[0, .12]], alternate: [[0, .085], [.14, .105]] },
    truck: { partials: [1, .82, .54, .24, .20, .12, .09, .055, .035, .02], attack: .012, release: .025, breath: .07,
      pulses: [[0, .39]], alternate: [[0, .15], [.22, .24]] },
    electric: { partials: [.70, .85, .60, .38, .28, .19, .16, .10, .065, .04], attack: .004, release: .014, breath: .025,
      pulses: [[0, .075], [.16, .12]], alternate: [[0, .18]] },
  };
  const name = variant.replace(/\.alt$/, '') as keyof typeof profiles;
  const profile = profiles[name] ?? profiles.sedan;
  const pulses = variant.endsWith('.alt') ? profile.alternate : profile.pulses;
  const sr = 22_050, duration = Math.max(...pulses.map(([at, length]) => at + length)) + .012;
  const buffer = context.createBuffer(1, Math.ceil(sr * duration), sr), pcm = buffer.getChannelData(0);
  const frequency = midiFrequency(HORN_REFERENCE_MIDI + (arcade ? ARCADE_TRANSPOSE : 0));
  // Both packs keep a mechanical horn body. Arcade brightens upper resonances
  // slightly instead of replacing them with a soft, almost sinusoidal beep.
  const harmonics = profile.partials.map((gain, index) => arcade && index >= 4 ? gain * 1.12 : gain);
  const random = randomStream(0x40a51 + ENGINE_VOICES.indexOf(name));
  const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
  for (const [at, length] of pulses) {
    const start = Math.round(at * sr), count = Math.round(length * sr);
    for (let i = 0; i < count; i++) {
      const time = i / sr, phase = TAU * frequency * time;
      let reed = 0;
      for (let h = 0; h < harmonics.length; h++) reed += Math.sin(phase * (h + 1)) * harmonics[h];
      // A saturated diaphragm keeps its bright body through the entire press;
      // no decaying upper partials, detuned companion tone, or pitch glide.
      const body = Math.tanh(reed * .8);
      const envelope = smooth(time / profile.attack) * smooth((count - i - 1) / (sr * profile.release));
      // Only the valve/contact onset has breath, never a continuous noise bed.
      const onset = random() * profile.breath * Math.max(0, 1 - time / .018);
      pcm[start + i] += (body + onset) * envelope;
    }
  }
  return buffer;
}

function eventBuffer(context: BaseAudioContext, cue: SoundCue, arcade: boolean, variant: string): AudioBuffer {
  const sr = 22_050;
  const duration = cue === 'ambience.birds' ? 2.8 : cue === 'train' ? .46
    : cue === 'mob.spawn' ? .56 : cue === 'mob.attack' ? .40 : cue === 'death.mob' ? .95
    : cue === 'hurt.rear' ? .28 : cue === 'hurt.side' ? .48 : cue === 'health.restore' ? .66
    : cue === 'death.wave' ? 1.55 : cue === 'death.swept' ? 1.15 : cue === 'death.trail' ? .95 : cue === 'death.train' ? 1 : .85;
  const buffer = context.createBuffer(1, Math.ceil(sr * duration), sr);
  const pitch = arcade ? 1.08 : 1;
  const note = (at: number, duration: number, frequency: number, gain: number, extra: Partial<Note> = {}) =>
    addNote(buffer, { at, duration, frequency: frequency * pitch, gain, ...extra });
  if (cue === 'train') {
    // One impact, with inharmonic bell modes. The director owns the crossing cadence.
    for (const [frequency, gain, length] of [[830, .6, .46], [1387, .38, .31], [2211, .17, .22], [3061, .09, .12]]) {
      note(0, length, frequency, gain, { attack: .0015, decay: 5, harmonics: [1] });
    }
    addNoise(buffer, 0, .024, .3, 4300, 171);
  } else if (cue === 'ambience.birds') {
    const world = Math.max(0, WORLD_VOICES.indexOf(variant as typeof WORLD_VOICES[number]));
    const phrases = [
      [[.12, 2450, 3600, .11], [.31, 3500, 2850, .12], [1.72, 2700, 3900, .14], [1.94, 3800, 2550, .16]],
      [[.08, 1580, 2410, .22], [.42, 2410, 1880, .20], [.76, 1740, 2580, .24], [1.9, 2160, 1610, .30]],
      [[.18, 3520, 4100, .08], [.35, 3700, 4250, .09], [.54, 3900, 3250, .13], [1.7, 4200, 3650, .13]],
      [[.3, 1050, 890, .43], [1.65, 940, 790, .50]],
      [[.18, 1870, 2710, .11], [.44, 2700, 1840, .15], [1.84, 2250, 2880, .12]],
      [[.12, 880, 880, .12], [.42, 1320, 1320, .12], [1.76, 1760, 880, .2]],
    ];
    for (const [at, from, to, length] of phrases[world]) {
      note(at, length, from, .12, { to: to * pitch, attack: world === 5 ? .004 : .025, decay: 1.2, harmonics: world === 5 ? [1, 0, .12] : [1, .04] });
    }
  } else if (cue === 'mob.spawn') {
    // A rustle and two questioning chirps announce a creature before it can move.
    addNoise(buffer, 0, .28, .16, 1250, 473, 2);
    const harmonics = arcade ? [1, .08, .32, .05] : [1, .28, .09];
    note(.025, .19, 410, .45, { to: 720 * pitch, attack: .022, decay: 1.8, harmonics });
    note(.25, .26, 560, .40, { to: 840 * pitch, attack: .025, decay: 2.3, harmonics });
  } else if (cue === 'mob.attack') {
    // A brief breathy growl and rising swipe distinguish a pounce from an impact.
    addNoise(buffer, .035, .28, .25, 1800, 617, 1.6);
    note(0, .27, 175, .55, { to: 112 * pitch, attack: .025, decay: 1.6, harmonics: arcade ? [1, .10, .40, .16] : [1, .46, .25, .08] });
    note(.09, .22, 430, .14, { to: 920 * pitch, attack: .035, decay: 1.1, harmonics: [1, .08] });
  } else if (cue === 'death.mob') {
    // Two creature snaps, then a falling reed: separate from vehicle and water deaths.
    const harmonics = arcade ? [1, .06, .36, .14] : [1, .48, .19, .07];
    for (const [at, frequency, gain] of [[0, 250, .5], [.2, 180, .42]]) {
      note(at, .26, frequency, gain, { to: frequency * .64 * pitch, attack: .015, decay: 2.2, harmonics });
      addNoise(buffer, at + .015, .14, .24, 1500, 911 + Math.round(at * 100), 3);
    }
    note(.36, .54, 490, .31, { to: 145 * pitch, attack: .045, decay: 2.5, harmonics: [1, .16, .06] });
  } else if (cue === 'hurt.rear') {
    // A rounded bumper tap: short and recoverable, without a fatal debris tail.
    note(0, .24, 175, .65, { to: 100 * pitch, attack: .007, decay: 4.6, harmonics: arcade ? [1, .05, .28] : [1, .25, .07] });
    addNoise(buffer, 0, .055, .18, 800, 107, 6);
  } else if (cue === 'hurt.side') {
    // A heavier body thud with a brief tire-like scrape distinguishes two lost Pluck.
    note(0, .32, 130, .65, { to: 64 * pitch, attack: .005, decay: 4, harmonics: arcade ? [1, .08, .32] : [1, .30, .10] });
    addNoise(buffer, .025, .33, .44, 1650, 283, 2.8);
    note(.04, .25, 620, .13, { to: 330 * pitch, attack: .02, decay: 3.5, harmonics: [1, .08] });
  } else if (cue === 'health.restore') {
    // A warm ascending pair makes score-based recovery audible during a run.
    const harmonics = arcade ? [1, .05, .22, .02] : [1, .22, .07];
    note(0, .4, 392, .4, { attack: .022, decay: 2.5, harmonics });
    note(.16, .46, 587.33, .45, { attack: .025, decay: 2.8, harmonics });
    note(.16, .4, 293.66, .14, { attack: .035, decay: 3, harmonics: [1] });
  } else if (cue === 'death.traffic') {
    addNoise(buffer, 0, .2, 1, 2800, 37, 6);
    note(0, .32, 94, .8, { to: 39, harmonics: [1, .3], decay: 5 });
    addNoise(buffer, .03, .55, .28, 800, 91, 5);
    note(.045, .22, 930, .12, { to: 550, harmonics: [1], decay: 3 });
  } else if (cue === 'death.train') {
    addNoise(buffer, 0, .86, 1.1, 700, 3, 5);
    note(0, .7, 61, .9, { to: 31, decay: 3.6, harmonics: [1, .26] });
    for (const [at, frequency] of [[0, 530], [.065, 887], [.15, 1441]]) note(at, .35, frequency, .3, { to: frequency * .94, harmonics: [1], decay: 4 });
  } else if (cue === 'death.water') {
    addNoise(buffer, 0, .42, .9, 2100, 44, 4);
    note(.045, .2, 420, .45, { to: 100, harmonics: [1], decay: 2.3 });
    note(.27, .17, 195, .23, { to: 370, harmonics: [1] });
    note(.52, .16, 135, .17, { to: 245, harmonics: [1] });
  } else if (cue === 'death.wave') {
    // A broad breaking wave, then a receding low wash; no collision thud.
    addNoise(buffer, 0, 1.5, .82, 1400, 217, 1.8);
    addNoise(buffer, .08, .7, .6, 3900, 923, 2.3);
    note(.16, .85, 95, .22, { to: 44, attack: .12, decay: 2, harmonics: [1] });
    note(.66, .22, 245, .12, { to: 90, harmonics: [1] });
  } else if (cue === 'death.swept') {
    addNoise(buffer, 0, .8, .48, 2300, 881, 1.2);
    note(0, .38, 690, .16, { to: 220, attack: .035, decay: 1, harmonics: [1, .15] });
    addNoise(buffer, .46, .56, .8, 900, 311, 3);
    note(.52, .28, 230, .25, { to: 82, harmonics: [1] });
  } else {
    // Leaving the safe trail: soft retreating footfalls and a falling woodwind sigh.
    for (const [at, gain] of [[0, .6], [.18, .35], [.38, .19]]) addNoise(buffer, at, .11, gain, 730, 55 + Math.floor(at * 100), 5);
    note(.1, .75, 390, .30, { to: 155, attack: .055, decay: 2.8, harmonics: [1, .12] });
  }
  return buffer;
}

/** A bundled mallard recording gives Butter a real quack in every built-in pack. */
function duckBuffer(context: BaseAudioContext, arcade: boolean): AudioBuffer {
  const bytes = atob(DUCK_PCM_BASE64);
  const pitch = arcade ? 1.055 : 1;
  const frames = Math.floor(bytes.length / 2 / pitch);
  const buffer = context.createBuffer(1, frames, DUCK_SAMPLE_RATE), pcm = buffer.getChannelData(0);
  const sample = (index: number) => {
    const value = bytes.charCodeAt(index * 2) | bytes.charCodeAt(index * 2 + 1) << 8;
    return (value >= 0x8000 ? value - 0x10000 : value) / 32768;
  };
  for (let i = 0; i < frames; i++) {
    const position = i * pitch, index = Math.floor(position), fraction = position - index;
    const value = sample(index) * (1 - fraction) + sample(Math.min(bytes.length / 2 - 1, index + 1)) * fraction;
    pcm[i] = arcade ? Math.tanh(value * 1.4) / 1.4 : value;
  }
  return buffer;
}

/** Two short, throaty clucks: a glottal onset, nasal body, and quick falling pitch. */
function chickenBuffer(context: BaseAudioContext, arcade: boolean): AudioBuffer {
  const sr = 22_050, buffer = context.createBuffer(1, Math.ceil(.43 * sr), sr);
  const pcm = buffer.getChannelData(0), random = randomStream(0xc10c);
  const pitch = arcade ? 1.12 : 1;
  for (const [at, duration, frequency, gain] of [[.015, .13, 490, 1], [.245, .165, 450, .9]]) {
    const start = Math.floor(at * sr), count = Math.floor(duration * sr);
    let phase = 0, air = 0;
    for (let i = 0; i < count; i++) {
      const time = i / sr, fraction = i / count;
      // The first few milliseconds catch in the throat before the vocal body drops.
      const catchPitch = .74 + .26 * Math.min(1, time / .012);
      phase += frequency * pitch * catchPitch * Math.exp(-.9 * fraction) / sr;
      air += .34 * (random() - air);
      const throat = Math.sin(TAU * phase) + .82 * Math.sin(TAU * phase * 2)
        + .64 * Math.sin(TAU * phase * 3) + .22 * Math.sin(TAU * phase * 5);
      const flutter = .86 + .14 * Math.sin(TAU * 42 * time);
      const envelope = Math.min(1, time / .004) * Math.min(1, (count - i - 1) / (sr * .018)) * Math.exp(-4 * fraction);
      pcm[start + i] += (Math.tanh(throat * 1.1) * flutter + air * .18) * envelope * gain;
    }
  }
  return buffer;
}

/** A single floor contact, not a reward jingle. The spill clock supplies the
 * individual impacts and quieter bounces; these short tails can overlap safely. */
function spillBuffer(context: BaseAudioContext, cue: SoundCue, arcade: boolean, variant: string): AudioBuffer {
  const weight = variant === 'heavy' ? 2 : variant === 'mid' ? 1 : 0;
  const sr = 22_050, duration = (cue === 'spill.fabric' ? .18 : .22) + weight * .025;
  const buffer = context.createBuffer(1, Math.ceil(duration * sr), sr);
  const pitch = [1.08, .96, .85][weight] * (arcade ? 1.11 : 1);
  const seed = 0x5f111 + weight * 137 + (arcade ? 71 : 0);
  const strike = (frequency: number, gain: number, decay: number, length = duration): void => {
    addNote(buffer, { at: 0, duration: length, frequency: frequency * pitch,
      gain, attack: .0015, decay, harmonics: arcade ? [1, .025, .12] : [1] });
  };
  if (cue === 'spill.coin') {
    // Inharmonic disk modes ring together immediately; no ascending coin reward.
    strike(1730, .50, 5);
    strike(2877, .29, 7);
    strike(4204, .13, 9);
    strike(215, .10, 7, .065);
    addNoise(buffer, 0, .035, .25, 3600, seed, 6);
  } else if (cue === 'spill.fabric') {
    // Soft cloth body followed by a tiny dry fold/rustle, never a metallic ping.
    strike(108, .18, 7, .09);
    addNoise(buffer, 0, duration, .85, arcade ? 1150 : 850, seed, 5.5);
    addNoise(buffer, .028, .075, .16, 2350, seed + 23, 5);
    const pcm = buffer.getChannelData(0), alpha = 1 - Math.exp(-TAU * 1100 / sr);
    let soft = 0;
    for (let i = 0; i < pcm.length; i++) {
      soft += alpha * (pcm[i] - soft);
      pcm[i] = soft * Math.min(1, (pcm.length - i - 1) / (sr * .018));
    }
  } else {
    // A light solid accessory: hollow contact with a short glassy edge.
    strike(680, .52, 6);
    strike(1523, .20, 7);
    strike(2536, .10, 8);
    addNoise(buffer, 0, .045, .24, 1800, seed, 5);
  }
  return buffer;
}

/** Deterministic local PCM. Long beds use 22 kHz, with no network or autoplay. */
export function builtinBuffer(context: BaseAudioContext, cue: SoundCue, packId: string, variant?: string): AudioBuffer {
  let cache = builtinBuffers.get(context);
  if (!cache) { cache = new Map(); builtinBuffers.set(context, cache); }
  const pack = packId === 'arcade' ? 'arcade' : 'pond', voice = builtinVariant(cue, variant), key = bufferKey(pack, cue, voice);
  const cached = cache.get(key);
  if (cached) return cached;
  let buffer: AudioBuffer;
  if (cue === 'call.duck') buffer = duckBuffer(context, pack === 'arcade');
  else if (cue === 'call.chicken') buffer = chickenBuffer(context, pack === 'arcade');
  else if (cue.startsWith('spill.')) buffer = spillBuffer(context, cue, pack === 'arcade', voice);
  else if (cue === 'music') buffer = musicBuffer(context, pack === 'arcade');
  else if (cue === 'traffic.honk') buffer = hornBuffer(context, voice, pack === 'arcade');
  else if (cue === 'ambience.wind' || cue === 'ambience.water' || cue === 'traffic.pass' || cue === 'train.pass') {
    buffer = environmentalBuffer(context, cue, pack === 'arcade', voice);
  } else if (cue === 'train' || cue === 'ambience.birds' || cue.startsWith('mob.') || cue.startsWith('death.') || cue.startsWith('hurt.') || cue === 'health.restore') {
    buffer = eventBuffer(context, cue, pack === 'arcade', voice);
  } else {
    const score = (pack === 'arcade' ? arcade : pond)[cue as Exclude<LegacyCue, 'call.duck' | 'call.chicken' | 'train'>];
    const duration = Math.max(...score.map(tone => tone.at + tone.duration));
    buffer = context.createBuffer(1, Math.ceil(duration * context.sampleRate), context.sampleRate);
    const pcm = buffer.getChannelData(0), random = randomStream(0x51f15e);
    for (const tone of score) {
      let phase = 0, filteredNoise = 0;
      const start = Math.round(tone.at * context.sampleRate);
      const count = Math.min(Math.floor(tone.duration * context.sampleRate), pcm.length - start);
      for (let i = 0; i < count; i++) {
        const fraction = i / count;
        const frequency = tone.frequency * ((tone.to ?? tone.frequency) / tone.frequency) ** fraction;
        phase += frequency / context.sampleRate;
        let sample: number;
        switch (tone.wave) {
          case 'square': sample = phase % 1 < .5 ? .8 : -.8; break;
          case 'triangle': sample = 1 - 4 * Math.abs(Math.round(phase) - phase); break;
          case 'noise': filteredNoise += (1 - Math.exp(-TAU * frequency / context.sampleRate)) * (random() - filteredNoise); sample = filteredNoise * 2; break;
          default: sample = Math.sin(phase * TAU);
        }
        const envelope = Math.min(1, i / (context.sampleRate * .004)) * Math.min(1, (count - i - 1) / (context.sampleRate * .018)) * Math.exp(-3.5 * fraction);
        pcm[start + i] += sample * tone.gain * envelope;
      }
    }
  }
  normalize(buffer, cuePeak(cue));
  cache.set(key, buffer);
  return buffer;
}

interface BufferVoice extends AudioVoice {
  update(options: PlayOptions): void;
  fadeOut(): void;
}

/** Retarget only at context.currentTime, preserving the value currently heard.
 * Firefox lacks cancelAndHoldAtTime. Read the computed value before removing
 * automation, then anchor it so the following target/ramp starts continuously.
 * This fallback deliberately does not attempt to sample a future hold time. */
function holdAudioParam(param: AudioParam, now: number): void {
  if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(now);
  else {
    const current = param.value;
    param.cancelScheduledValues(now);
    param.setValueAtTime(current, now);
  }
}

/** One source per persistent voice: updating proximity never restarts an engine. */
function playBuffer(context: BaseAudioContext, buffer: AudioBuffer, destination: AudioNode,
  options: PlayOptions = {}, baseGain = 1, loop = false, offset = 0): BufferVoice {
  const source = context.createBufferSource(), envelope = context.createGain(), spatial = context.createStereoPanner();
  source.buffer = buffer;
  source.loop = loop;
  source.connect(envelope); envelope.connect(spatial); spatial.connect(destination);
  const now = context.currentTime;
  const gain = clamp(options.gain, 1, 0, 1) * baseGain;
  const rate = clamp(options.rate, 1, .5, 2);
  source.playbackRate.value = rate;
  spatial.pan.value = clamp(options.pan, 0, -1, 1);
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(gain, now + (loop ? .14 : Math.min(.006, buffer.duration / rate / 3)));
  if (!loop) {
    const duration = buffer.duration / rate, fade = Math.min(.008, duration / 3);
    envelope.gain.setValueAtTime(gain, now + duration - fade);
    envelope.gain.linearRampToValueAtTime(0, now + duration);
  }
  let finished = false, fading = false;
  let lastGain = gain, lastPan = spatial.pan.value, lastRate = rate;
  let finish!: () => void;
  const ended = new Promise<void>(resolve => { finish = resolve; });
  const cleanup = () => {
    if (finished) return;
    finished = true;
    source.disconnect(); envelope.disconnect(); spatial.disconnect();
    source.onended = null;
    finish();
  };
  source.onended = cleanup;
  source.start(now, offset);
  return {
    ended,
    update(next) {
      if (finished || fading || !loop) return;
      const at = context.currentTime;
      const gain = clamp(next.gain, 1, 0, 1) * baseGain;
      const pan = clamp(next.pan, 0, -1, 1), rate = clamp(next.rate, 1, .5, 2);
      // Retarget from the value already being heard, including during fade-in.
      // Holding also bounds the automation timeline over an endless run.
      if (Math.abs(gain - lastGain) > .001) {
        holdAudioParam(envelope.gain, at); envelope.gain.setTargetAtTime(gain, at, .055); lastGain = gain;
      }
      if (Math.abs(pan - lastPan) > .004) {
        holdAudioParam(spatial.pan, at); spatial.pan.setTargetAtTime(pan, at, .055); lastPan = pan;
      }
      if (Math.abs(rate - lastRate) > .002) {
        holdAudioParam(source.playbackRate, at); source.playbackRate.setTargetAtTime(rate, at, .075); lastRate = rate;
      }
    },
    fadeOut() {
      if (finished || fading) return;
      fading = true;
      const at = context.currentTime;
      holdAudioParam(envelope.gain, at);
      envelope.gain.linearRampToValueAtTime(0, at + .09);
      try { source.stop(at + .095); } catch { cleanup(); }
    },
    stop() {
      if (finished) return;
      try { source.stop(); } catch { /* A context teardown may already have stopped it. */ }
      cleanup();
    },
  };
}

/** The same buffer and envelope path used by live play and offline auditions. */
export function renderBuiltinCue(context: BaseAudioContext, cue: SoundCue, packId: string,
  destination: AudioNode = context.destination, options: PlayOptions = {}): AudioVoice {
  return playBuffer(context, builtinBuffer(context, cue, packId, options.variant), destination, options);
}

function clipPeak(buffer: AudioBuffer, cue?: SoundCue): number {
  const duration = maxDurationForCue(cue);
  if (!Number.isFinite(buffer.duration) || buffer.duration <= 0 || buffer.duration > duration ||
    buffer.numberOfChannels < 1 || buffer.numberOfChannels > 2 ||
    buffer.length * buffer.numberOfChannels > 2 * duration * 48_000) {
    throw new Error(`Sound clips must be mono or stereo and no longer than ${duration} seconds for this cue.`);
  }
  let peak = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    for (const sample of buffer.getChannelData(channel)) {
      if (!Number.isFinite(sample)) throw new Error('Sound clip contains invalid audio samples.');
      peak = Math.max(peak, Math.abs(sample));
    }
  }
  return peak;
}

const deathAliases: Partial<Record<SoundCue, SoundCue>> = {
  'death.traffic': 'crash', 'death.train': 'crash', 'death.trail': 'crash', 'death.mob': 'crash',
  'death.water': 'splash', 'death.wave': 'splash', 'death.swept': 'splash',
};

type Clip = { buffer: AudioBuffer; gain: number; loopBuffer?: AudioBuffer };
type LoopVoice = { voice: BufferVoice; cue: SoundCue; variant: string };

export class GameAudio {
  /** Context labels map through the same preference-aware graph and samples. */
  sessionEvent(event:'pressure-warning'|'pressure-damage'|'offensive-item'|'defensive-item'|'returned'|'disconnected'|'finished'|'rank'):void {
    const cues:Record<typeof event,SoundCue>={'pressure-warning':'idle','pressure-damage':'hurt.side','offensive-item':'splash','defensive-item':'coin',returned:'health.restore',disconnected:'idle',finished:'coin',rank:'coin'};
    this.play(cues[event]);
  }

  private context?: AudioContext;
  private decoder?: OfflineAudioContext;
  private master?: GainNode;
  private limiter?: DynamicsCompressorNode;
  private beds?: GainNode;
  private buses?: Record<keyof AudioMix, GainNode>;
  private mix: AudioMix = { music: .65, ambience: .8, effects: 1 };
  private muted = false;
  private disposed = false;
  private builtin = 'pond';
  private clips: Partial<Record<SoundCue, Clip>> = {};
  private voices = new Set<AudioVoice>();
  private spillVoices = new Set<AudioVoice>();
  private loops = new Map<string, LoopVoice>();
  private retiring = new Set<BufferVoice>();
  private preparations = new Map<string, Promise<void>>();
  private variantPreparations = new Map<string, Promise<void>>();
  private pendingMusicPreview?: { context: AudioContext; pack: string; options: PlayOptions };

  /** Call directly inside a pointer/button/key gesture. Never queues a sound. */
  unlock(): void {
    if (this.disposed || this.muted) return;
    try {
      if (!this.context) {
        if (typeof AudioContext === 'undefined') return;
        const context = new AudioContext({ latencyHint: 'interactive' });
        const master = context.createGain(), limiter = context.createDynamicsCompressor(), beds = context.createGain();
        master.gain.value = .8;
        limiter.threshold.value = -10; limiter.knee.value = 10; limiter.ratio.value = 8;
        limiter.attack.value = .004; limiter.release.value = .14;
        master.connect(limiter); limiter.connect(context.destination); beds.connect(master);
        const buses = { music: context.createGain(), ambience: context.createGain(), effects: context.createGain() };
        for (const name of ['music', 'ambience', 'effects'] as const) {
          buses[name].gain.value = this.mix[name];
          buses[name].connect(name === 'effects' ? master : beds);
        }
        this.context = context; this.master = master; this.limiter = limiter; this.beds = beds; this.buses = buses;
      }
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
      void this.prepare();
    } catch { /* Audio support and browser autoplay policy must never block play. */ }
  }

  /** Build long beds in small tasks. This prepares PCM only; it never starts sound. */
  prepare(): Promise<void> {
    const context = this.context, pack = this.builtin;
    if (!context || this.disposed) return Promise.resolve();
    const existing = this.preparations.get(pack);
    if (existing) return existing;
    const turn = () => new Promise<void>(resolve => setTimeout(resolve, 0));
    const work = async () => {
      // Let input and its first visual update finish before doing any long work.
      await turn();
      for (const cue of ['ambience.wind', 'traffic.pass', 'ambience.water', 'train.pass'] as const) {
        if (this.disposed || this.context !== context) return;
        builtinBuffer(context, cue, pack);
        await turn();
      }
      if (this.disposed || this.context !== context) return;
      const steps = musicSteps(context, pack === 'arcade');
      let next = steps.next();
      while (!next.done) {
        const deadline = performance.now() + 5;
        do { next = steps.next(); } while (!next.done && performance.now() < deadline);
        await turn();
        if (this.disposed || this.context !== context) return;
      }
      normalize(next.value, cuePeak('music'));
      // Preparing the environmental buffers above has established the cache.
      builtinBuffers.get(context)!.set(`${pack}:music`, next.value);
      for (const cue of SOUND_CUES) {
        await turn();
        if (this.disposed || this.context !== context) return;
        builtinBuffer(context, cue, pack);
      }
    };
    const pending = work().catch(() => {
      // Leave a failed optional audio build retryable; never reject gameplay.
      this.preparations.delete(pack);
    });
    this.preparations.set(pack, pending);
    return pending;
  }

  /** A scene request only schedules PCM work. It never queues audible playback. */
  private prepareVariant(context: AudioContext, cue: SoundCue, variant: string): void {
    if (!variant) { void this.prepare(); return; }
    const pack = this.builtin, key = bufferKey(pack, cue, variant);
    if (this.variantPreparations.has(key)) return;
    const pending = new Promise<void>(resolve => setTimeout(resolve, 0)).then(() => {
      if (!this.disposed && this.context === context) builtinBuffer(context, cue, pack, variant);
    }).catch(() => {}).finally(() => this.variantPreparations.delete(key));
    this.variantPreparations.set(key, pending);
  }

  setMix(mix: AudioMix): void {
    this.mix = { music: clamp(mix.music, this.mix.music, 0, 1), ambience: clamp(mix.ambience, this.mix.ambience, 0, 1), effects: clamp(mix.effects, this.mix.effects, 0, 1) };
    if (!this.context || !this.buses) return;
    for (const name of ['music', 'ambience', 'effects'] as const) {
      holdAudioParam(this.buses[name].gain, this.context.currentTime);
      this.buses[name].gain.setTargetAtTime(this.mix[name], this.context.currentTime, .035);
    }
    for (const [id, loop] of this.loops) if (this.mix[category(loop.cue)] === 0) this.retireLoop(id, loop);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.stop();
  }

  setBuiltin(id: string): void {
    this.stop();
    this.builtin = id === 'arcade' ? 'arcade' : 'pond';
    this.clips = {};
  }

  setClips(clips: Partial<Record<SoundCue, AudioBuffer>>, fallbackId = this.builtin): void {
    const next: typeof this.clips = {};
    for (const cue of SOUND_CUES) {
      const buffer = clips[cue];
      if (!buffer) continue;
      const peak = clipPeak(buffer, cue);
      next[cue] = { buffer, gain: peak ? cuePeak(cue) / peak : 0 };
    }
    this.stop();
    this.builtin = fallbackId === 'arcade' ? 'arcade' : 'pond';
    this.clips = next;
  }

  /** Offline decoding cannot unlock playback or create an audible context. */
  async decode(bytes: ArrayBuffer, cue?: SoundCue): Promise<AudioBuffer> {
    if (this.disposed) throw new Error('Audio has been closed.');
    if (!bytes.byteLength || bytes.byteLength > MAX_CLIP_BYTES) throw new Error('Sound clips must be no larger than 1 MiB.');
    if (typeof OfflineAudioContext === 'undefined') throw new Error('Audio decoding is unavailable in this browser.');
    this.decoder ??= new OfflineAudioContext(1, 1, 44_100);
    const buffer = await this.decoder.decodeAudioData(bytes.slice(0));
    if (this.disposed) throw new Error('Audio has been closed.');
    clipPeak(buffer, cue);
    return buffer;
  }

  private source(cue: SoundCue, context: BaseAudioContext, loop = false, variant?: string): { buffer: AudioBuffer; gain: number } {
    const alias = deathAliases[cue];
    const clip = this.clips[cue] ?? (alias ? this.clips[alias] : undefined);
    if (!clip) return { buffer: builtinBuffer(context, cue, this.builtin, variant), gain: 1 };
    if (!loop) return clip;
    // Never mutate a caller's clip. External loops receive the same seam treatment.
    if (!clip.loopBuffer) {
      clip.loopBuffer = context.createBuffer(clip.buffer.numberOfChannels, clip.buffer.length, clip.buffer.sampleRate);
      for (let ch = 0; ch < clip.buffer.numberOfChannels; ch++) {
        const pcm = clip.loopBuffer.getChannelData(ch);
        pcm.set(clip.buffer.getChannelData(ch)); joinLoop(pcm, clip.buffer.sampleRate);
      }
    }
    return { buffer: clip.loopBuffer, gain: clip.gain };
  }

  private duckBeds(cue: SoundCue): void {
    if (!this.context || !this.beds || !(cue.startsWith('call.') || cue.startsWith('death.') || cue.startsWith('mob.') || cue.startsWith('hurt.') || cue === 'health.restore' || cue === 'train' || cue === 'idle')) return;
    const death = cue.startsWith('death.'), brief = cue.startsWith('mob.') || cue.startsWith('hurt.') || cue === 'health.restore', now = this.context.currentTime;
    const gain = this.beds.gain;
    holdAudioParam(gain, now);
    gain.setTargetAtTime(death ? .24 : brief ? .78 : .52, now, .025);
    gain.setTargetAtTime(1, now + (death ? 1 : brief ? .18 : cue === 'train' ? .32 : .45), .20);
  }

  play(cue: SoundCue, options: PlayOptions = {}): void {
    const context = this.context, bus = this.buses?.[category(cue)];
    if (this.disposed || this.muted || !context || context.state !== 'running' || !bus || !this.mix[category(cue)] || options.gain === 0) return;
    try {
      if (cue === 'music' && !this.clips.music && !builtinBuffers.get(context)?.has(`${this.builtin}:music`)) {
        // An explicit audition may wait for PCM, but there is only one latest
        // request. Scene loops never use this path or leave a playback backlog.
        const pending = this.pendingMusicPreview;
        if (pending?.context === context && pending.pack === this.builtin) pending.options = { ...options };
        else {
          const request = { context, pack: this.builtin, options: { ...options } };
          this.pendingMusicPreview = request;
          void this.prepare().then(() => {
            if (this.pendingMusicPreview !== request) return;
            this.pendingMusicPreview = undefined;
            if (this.context === request.context && this.builtin === request.pack && builtinBuffers.get(context)?.has(`${request.pack}:music`)) this.play('music', request.options);
          });
        }
        return;
      }
      // Even a pack with long impact clips must leave room for the fatal cue.
      const spill = cue.startsWith('spill.');
      while (spill && this.spillVoices.size >= MAX_SPILL_VOICES) {
        const oldest = this.spillVoices.values().next().value;
        if (!oldest) break;
        oldest.stop(); this.spillVoices.delete(oldest); this.voices.delete(oldest);
      }
      while (this.voices.size >= MAX_VOICES) {
        const oldest = this.voices.values().next().value;
        if (!oldest) break;
        oldest.stop(); this.voices.delete(oldest); this.spillVoices.delete(oldest);
      }
      const clip = this.source(cue, context, false, options.variant);
      const voice = playBuffer(context, clip.buffer, bus, options, clip.gain);
      this.voices.add(voice);
      if (spill) this.spillVoices.add(voice);
      this.duckBeds(cue);
      void voice.ended.then(() => { this.voices.delete(voice); this.spillVoices.delete(voice); });
    } catch { /* A failed sound never interrupts simulation or input. */ }
  }

  private retireLoop(id: string, loop: LoopVoice): void {
    this.loops.delete(id);
    this.retiring.add(loop.voice);
    loop.voice.fadeOut();
    void loop.voice.ended.then(() => this.retiring.delete(loop.voice));
  }

  /** Reconcile the currently audible scene; no pending playback survives a stop. */
  syncLoops(requests: readonly LoopRequest[]): void {
    const context = this.context;
    if (this.disposed || this.muted || !context || context.state !== 'running' || !this.buses) return;
    const wanted = new Map<string, LoopRequest>();
    for (const request of requests) {
      if (wanted.size >= MAX_LOOPS) break;
      if (request.id && !wanted.has(request.id) && Number.isFinite(request.gain) && request.gain > .001 && this.mix[category(request.cue)] > 0) wanted.set(request.id, request);
    }
    for (const [id, loop] of this.loops) {
      const request = wanted.get(id);
      const variant = request && !this.clips[request.cue] ? builtinVariant(request.cue, request.variant) : '';
      if (request?.cue === loop.cue && variant !== loop.variant && !this.clips[request.cue]
        && !builtinBuffers.get(context)?.has(bufferKey(this.builtin, request.cue, variant))) {
        // Keep the old landscape audible while the replacement is prepared,
        // then retire/start together on the next scene update for a real crossfade.
        this.prepareVariant(context, request.cue, variant); continue;
      }
      if (!request || request.cue !== loop.cue || variant !== loop.variant) this.retireLoop(id, loop);
    }
    for (const [id, request] of wanted) {
      const active = this.loops.get(id);
      if (active) { active.voice.update(request); continue; }
      try {
        // Include fading sources in the budget, even during rapid scene changes.
        while (this.loops.size + this.retiring.size >= MAX_LOOPS) {
          const oldest = this.retiring.values().next().value;
          if (!oldest) break;
          oldest.stop(); this.retiring.delete(oldest);
        }
        if (this.loops.size >= MAX_LOOPS) continue;
        const variant = this.clips[request.cue] ? '' : builtinVariant(request.cue, request.variant);
        if (!this.clips[request.cue] && !builtinBuffers.get(context)?.has(bufferKey(this.builtin, request.cue, variant))) {
          this.prepareVariant(context, request.cue, variant); continue;
        }
        const clip = this.source(request.cue, context, true, variant);
        // Similar cars still have independent piston/gear phases when they enter together.
        let phase = 0;
        if (request.cue === 'traffic.pass') for (const char of id) phase = (Math.imul(phase, 31) + char.charCodeAt(0)) >>> 0;
        const scorePosition = Number.isFinite(request.offset) ? request.offset! : 0;
        const offset = request.cue === 'traffic.pass' ? (phase % 997) / 997 * clip.buffer.duration
          : request.cue === 'music' ? ((scorePosition % clip.buffer.duration) + clip.buffer.duration) % clip.buffer.duration : 0;
        const voice = playBuffer(context, clip.buffer, this.buses[category(request.cue)], request, clip.gain, true, offset);
        this.loops.set(id, { voice, cue: request.cue, variant });
        void voice.ended.then(() => { if (this.loops.get(id)?.voice === voice) this.loops.delete(id); });
      } catch { /* Malformed optional sounds cannot stop the rest of the scene. */ }
    }
  }

  stop(): void {
    this.pendingMusicPreview = undefined;
    for (const voice of this.voices) voice.stop();
    for (const { voice } of this.loops.values()) voice.stop();
    for (const voice of this.retiring) voice.stop();
    this.voices.clear(); this.spillVoices.clear(); this.loops.clear(); this.retiring.clear();
    if (this.context && this.beds) {
      this.beds.gain.cancelScheduledValues(this.context.currentTime);
      this.beds.gain.setValueAtTime(1, this.context.currentTime);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    for (const bus of Object.values(this.buses ?? {})) bus.disconnect();
    this.beds?.disconnect(); this.master?.disconnect(); this.limiter?.disconnect();
    if (this.context) void this.context.close().catch(() => {});
    this.context = undefined; this.master = undefined; this.limiter = undefined; this.beds = undefined;
    this.buses = undefined; this.decoder = undefined; this.clips = {}; this.preparations.clear();
  }
}
