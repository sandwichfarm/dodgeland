import type { World } from '../content.js';
import type { Lane } from '../game.js';
import { TRAIN_LENGTH_V1, WORLDS_V1 } from './v1-content.js';

/** Schema 1: RNG draw order, formulas, and constants are part of the seed contract. */
export const BASE_COIN_CHANCE_V1 = .4;
export const wrap = (n: number, span: number): number => ((n % span) + span) % span;
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a += 0x6d2b79f5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function difficulty(distance: number): number { return 1 + Math.log1p(Math.max(0, distance) / 32); }
export function worldForRow(seed: number, row: number, home: string, worlds: readonly World[] = WORLDS_V1): World {
  const chapter = Math.floor(Math.max(0, row) / 32);
  if (chapter === 0 && home !== 'shuffle') return worlds.find(world => world.id === home) ?? worlds[0]!;
  const offset = home === 'shuffle' ? (seed >>> 0) % worlds.length : worlds.findIndex(w => w.id === home);
  return worlds[wrap(offset + chapter, worlds.length)]!;
}
/** Stateless generation permits content packs and far-distance testing without retaining old rows. */
export function generateLane(seed: number, index: number, home: string, gentle = false, worlds: readonly World[] = WORLDS_V1): Lane {
  const rng = random((seed ^ Math.imul(index + 100, 0x45d9f3b)) >>> 0);
  const world = worldForRow(seed, index, home, worlds);
  const segment = Math.floor(Math.max(0, index) / 8);
  const patternRng = random(seed ^ Math.imul(segment + 1, 9973));
  const pattern = world.patterns[Math.floor(patternRng() * world.patterns.length)]!;
  const slot = wrap(index, 8);
  const kind = index < 3 || slot === 0 || slot === 7 ? 'meadow' : pattern[(slot - 1) % pattern.length]!;
  const d = difficulty(index);
  const relief = segment % 3 === 2 ? .78 : 1;
  const multiplier = gentle && index < 24 ? .65 : 1;
  const speed = (rng() < .5 ? -1 : 1) * Math.min(5.6, .8 + d * .43 + rng() * .65) * relief * multiplier;
  const length = kind === 'river' ? 3.1 + rng() * 1.1 : kind === 'rail' ? TRAIN_LENGTH_V1 : rng() < .3 ? 1.8 : 1.15;
  const spacing = kind === 'river' ? length + 1.2 + rng() * .5 : length + Math.max(2.25, 4.6 - d * .48) + rng() * 1.5;
  const blocked: number[] = [];
  if (kind === 'meadow' && index > 2 && slot !== 0) for (let x = -5; x <= 5; x++) if (Math.abs(x) > 1 && rng() < .17) blocked.push(x);
  const decorations = blocked.map(x => ({ x, variant: Math.floor(rng() * world.scenery.length) }));
  for (const x of [-7, -6, 6, 7]) if (rng() < .65) decorations.push({ x, variant: Math.floor(rng() * world.scenery.length) });
  const coin = index > 2 && kind !== 'river' && kind !== 'rail' && rng() < BASE_COIN_CHANCE_V1 ? Math.floor(rng() * 9) - 4 : null;
  return { index, kind, world, speed, length, spacing, phase: rng() * spacing, variant: Math.floor(rng() * 100), blocked, decorations, coin: blocked.includes(coin ?? 99) ? 0 : coin, period: Math.max(4.8, 10 - d * .65) + rng() * 3, warning: 1.5 };
}
