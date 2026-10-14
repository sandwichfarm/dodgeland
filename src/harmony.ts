/** Shared score clock: eight bars at 80 BPM, also used by nearby car horns. */
export const MUSIC_BEAT_SECONDS = .75;
export const MUSIC_BAR_SECONDS = MUSIC_BEAT_SECONDS * 4;
export const MUSIC_LOOP_SECONDS = MUSIC_BAR_SECONDS * 8;
export const HORN_REFERENCE_MIDI = 60;
export const HORN_MIN_MIDI = 48;
export const HORN_MAX_MIDI = 72;

export interface MusicHarmony {
  readonly scale: string;
  readonly pitchClasses: readonly number[];
  readonly chord: readonly number[];
}

// Relative modes share C major's notes while the chord gives each bar its center.
// Keeping the progression here lets music and horns change together.
const HARMONY: readonly MusicHarmony[] = [
  { scale: 'C Ionian', pitchClasses: [0, 2, 4, 5, 7, 9, 11], chord: [48, 52, 55, 59] },
  { scale: 'A Aeolian', pitchClasses: [9, 11, 0, 2, 4, 5, 7], chord: [45, 48, 52, 55] },
  { scale: 'F Lydian', pitchClasses: [5, 7, 9, 11, 0, 2, 4], chord: [41, 45, 48, 52] },
  { scale: 'G Mixolydian', pitchClasses: [7, 9, 11, 0, 2, 4, 5], chord: [43, 47, 50, 53] },
];
const FINAL_HARMONY: MusicHarmony = { ...HARMONY[3], chord: [43, 47, 50, 55] };

/** Concert-C score; each sound pack transposes the whole arrangement together. */
export function musicHarmonyAt(seconds: number): MusicHarmony {
  const time = Number.isFinite(seconds) ? seconds : 0;
  const position = ((time % MUSIC_LOOP_SECONDS) + MUSIC_LOOP_SECONDS) % MUSIC_LOOP_SECONDS;
  const bar = Math.floor(position / MUSIC_BAR_SECONDS);
  return bar === 7 ? FINAL_HARMONY : HARMONY[bar % HARMONY.length];
}
