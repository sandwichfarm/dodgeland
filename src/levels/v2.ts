import type { Lane } from '../game.js';
import { createActorPattern } from '../actors.js';
import type { ActorDefinition } from '../actors.js';
import { generateLane as generateLaneV1, random } from './v1.js';

/** Schema 2: preserve the warmup, then add a capped variety step every 50 rows. */
export function generateLane(seed: number, index: number, home: string, gentle = false): Lane {
  const lane = generateLaneV1(seed, index, home, gentle);
  if (index < 50 || (lane.kind !== 'road' && lane.kind !== 'river')) return lane;
  const tier = Math.min(8, Math.floor(index / 50));
  const rng = random(seed ^ Math.imul(index + 91, 0x32ab19d));
  if (lane.kind === 'road') {
    const variety = Math.min(1, tier / 6);
    const sportsChance = tier < 3 ? 0 : Math.min(.06, .03 + (tier - 3) * .0075);
    const truckChance = tier < 2 ? 0 : Math.min(.24, .14 + (tier - 2) * .02);
    const slots: ActorDefinition[] = Array.from({ length: 16 }, () => {
      const choice = rng(), variant = Math.floor(rng() * lane.world.vehicles.length);
      const kind = choice < sportsChance ? 'sports' : choice < sportsChance + truckChance ? 'truck' : 'car';
      const jitter = rng(), pace = rng();
      return {
        kind, variant,
        length: kind === 'truck' ? 2.5 + jitter * .7 : kind === 'sports' ? 1.18 + jitter * .14 : 1.05 + jitter * (.55 + variety * .4),
        speedFactor: kind === 'truck' ? .54 + pace * .12 : kind === 'sports' ? 1 + pace * .1 : 1 + (pace * 2 - 1) * (.07 + variety * .12),
        gap: 2.15 + rng() * (1 + variety * .5),
        // The late-course base lane speed also grows. Keep a boosted car readable
        // even on arbitrarily distant seeded rows, before any slowdown cards.
        ...(kind === 'sports' ? { boost: Math.min(1.95 + variety * .25, 7 / Math.abs(lane.speed)) } : {}),
      };
    });
    lane.actors = createActorPattern('traffic', slots, tier);
  } else {
    const variety = Math.min(1, tier / 8);
    const slots: ActorDefinition[] = Array.from({ length: 8 }, () => ({
      kind: 'platform', variant: lane.variant, speedFactor: 1,
      // Early streams barely vary; later streams alternate substantial rafts and
      // short, readable stepping stones. Gaps stay jumpable at every tier.
      length: lane.length * (1 + (rng() * 2 - 1) * .5 * variety),
      gap: Math.max(.75, lane.spacing - lane.length + (rng() * 2 - 1) * .9 * variety),
    }));
    lane.actors = createActorPattern('platforms', slots, tier);
  }
  return lane;
}
