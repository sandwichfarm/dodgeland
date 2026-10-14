import type { Lane } from '../game.js';
import { coinDenominationForRow } from '../coin-denominations.js';
import { generateLane as generateLaneV2 } from './v2.js';

/** Schema 3 adds coin denominations without consuming the course RNG stream. */
export function generateLane(seed: number, index: number, home: string, gentle = false): Lane {
  const lane = generateLaneV2(seed, index, home, gentle);
  if (lane.coin !== null) {
    const denomination = coinDenominationForRow(seed, index);
    if (denomination !== 'coin') lane.coinDenomination = denomination;
  }
  return lane;
}
