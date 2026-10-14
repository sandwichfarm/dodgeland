import type { CosmeticDefinition } from './market/types.js';

/** Give the fallen belongings time to land before the result screen appears. */
export const DEATH_SPILL_REVEAL = 1.1;
export const MAX_SPILL_COINS = 192;

export interface SpillDrop {
  readonly kind: 'coin' | 'cosmetic';
  /** Grouped coins retain their exact value without unbounded render work. */
  readonly amount: number;
  readonly item?: CosmeticDefinition;
  readonly originX: number;
  readonly originY: number;
  readonly surface: number;
  readonly height: number;
  readonly lift: number;
  readonly landing: number;
  readonly firstBounce: number;
  readonly secondBounce: number;
  readonly slide: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly yaw: number;
  readonly spin: number;
  readonly tilt: number;
  readonly restTilt: number;
}

export interface DeathSpill {
  wallet: number;
  cosmetics: readonly CosmeticDefinition[];
  age: number;
  drops: SpillDrop[];
}

const GRAVITY = 14;
const FIRST_FRICTION = .52;
const SECOND_FRICTION = .22;
const LAST_FRICTION = .1;
const finite = (value: number, fallback = 0): number => Number.isFinite(value) ? value : fallback;

/** A private stream: dying cannot advance the level, market, or sound RNG. */
function spillRandom(seed: number): () => number {
  let state = (finite(seed) >>> 0) ^ 0x6a09e667;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ state >>> 15, 1 | state);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 0x100000000;
  };
}

/** Snapshot belongings before inventory cleanup; trajectories never mutate. */
export function createDeathSpill(
  wallet: number, cosmetics: readonly CosmeticDefinition[],
  x: number, y: number, surface: number, seed: number,
): DeathSpill {
  const total = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(finite(wallet))));
  const owned = [...cosmetics];
  const drops: SpillDrop[] = [];
  const random = spillRandom(seed);
  const makeDrop = (kind: SpillDrop['kind'], amount: number, item?: CosmeticDefinition): SpillDrop => {
    const angle = random() * Math.PI * 2;
    const radius = .65 + Math.sqrt(random()) * 2.15;
    const height = kind === 'coin' ? .34 : .65;
    const lift = 2.6 + random() * 1.7;
    const impact = Math.sqrt(lift * lift + 2 * GRAVITY * height);
    const landing = (lift + impact) / GRAVITY;
    const rebound = impact * (.25 + random() * .08);
    const style = item?.appearance.style;
    return {
      kind, amount, ...(item ? { item } : {}),
      originX: finite(x), originY: finite(y), surface: finite(surface),
      height, lift, landing,
      firstBounce: 2 * rebound / GRAVITY,
      secondBounce: 2 * rebound * .28 / GRAVITY,
      slide: .18 + random() * .12,
      offsetX: Math.cos(angle) * radius, offsetY: Math.sin(angle) * radius,
      yaw: random() * Math.PI * 2,
      spin: (random() < .5 ? -1 : 1) * (2 + random() * 4),
      tilt: (random() - .5) * .6,
      restTilt: kind === 'coin' || style === 'shirt' ? Math.PI / 2 : (random() - .5) * .32,
    };
  };
  const count = Math.min(total, MAX_SPILL_COINS);
  const base = count ? Math.floor(total / count) : 0;
  const remainder = total - base * count;
  for (let index = 0; index < count; index++) drops.push(makeDrop('coin', base + (index < remainder ? 1 : 0)));
  for (const item of owned) drops.push(makeDrop('cosmetic', 0, item));
  return { wallet: total, cosmetics: owned, age: 0, drops };
}

/** Two smaller ballistic bounces, then a short frictional roll to rest. */
export function spillPose(drop: SpillDrop, age: number, reduced = false): { x: number; y: number; z: number; yaw: number; tilt: number } {
  const bounced = drop.landing + drop.firstBounce + drop.secondBounce;
  const settled = bounced + drop.slide;
  const time = reduced || age === Infinity ? settled : Math.min(settled, Math.max(0, finite(age)));
  // Integrate horizontal velocity, reducing it on each impact and during the roll.
  const first = Math.min(time, drop.landing);
  const second = Math.min(Math.max(0, time - drop.landing), drop.firstBounce);
  const third = Math.min(Math.max(0, time - drop.landing - drop.firstBounce), drop.secondBounce);
  const roll = Math.min(Math.max(0, time - bounced), drop.slide);
  const travel = first + second * FIRST_FRICTION + third * SECOND_FRICTION
    + LAST_FRICTION * (roll - roll * roll / (2 * drop.slide));
  const distance = drop.landing + drop.firstBounce * FIRST_FRICTION + drop.secondBounce * SECOND_FRICTION
    + LAST_FRICTION * drop.slide / 2;
  const progress = travel / distance;
  let altitude = 0;
  if (time < drop.landing) altitude = drop.height + drop.lift * time - GRAVITY * time * time / 2;
  else if (time < drop.landing + drop.firstBounce) altitude = GRAVITY * second * (drop.firstBounce - second) / 2;
  else if (time < bounced) altitude = GRAVITY * third * (drop.secondBounce - third) / 2;
  const landingProgress = Math.max(0, (time - drop.landing) / (settled - drop.landing));
  const tumble = drop.tilt + Math.sin(time * 11) * (1 - landingProgress) * 1.15;
  return {
    x: drop.originX + drop.offsetX * progress,
    y: drop.originY + drop.offsetY * progress,
    z: drop.surface + Math.max(0, altitude),
    yaw: drop.yaw + drop.spin * progress,
    tilt: tumble * (1 - landingProgress) + drop.restTilt * landingProgress,
  };
}
