import type { Lane } from '../game.js';
import type { RunSeed } from '../run-seed.js';
import { generateLane as generateLaneV1 } from './v1.js';
import { generateLane as generateLaneV2 } from './v2.js';
import { generateLane as generateLaneV3 } from './v3.js';

/** Keep old implementations addressable when a later schema becomes the default. */
export function generateSeedLane(run: RunSeed, index: number): Lane {
  switch (run.schema) {
    case 1: return generateLaneV1(run.seed, index, run.home, run.gentle);
    case 2: return generateLaneV2(run.seed, index, run.home, run.gentle);
    case 3: return generateLaneV3(run.seed, index, run.home, run.gentle);
    default: throw new RangeError('Unsupported level schema.');
  }
}
