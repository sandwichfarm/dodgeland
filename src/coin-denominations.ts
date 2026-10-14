import { random } from './levels/v1.js';

export type CoinDenominationId = 'coin' | 'bar' | 'small-sack' | 'big-sack' | 'huge-sack';
export interface CoinDenomination {
  readonly id: CoinDenominationId;
  readonly name: string;
  readonly value: number;
  /** Exact chance per spawned pickup, independent of how often coins spawn. */
  readonly probability: number;
  readonly oneIn: number | null;
  readonly width: number;
  readonly depth: number;
}
const rare = [
  { id: 'bar', name: 'Bigger Bar', value: 2, oneIn: 35, width: .36, depth: .18 },
  { id: 'small-sack', name: 'Small Sack', value: 5, oneIn: 100, width: .40, depth: .32 },
  { id: 'big-sack', name: 'Big Sack', value: 10, oneIn: 500, width: .52, depth: .40 },
  { id: 'huge-sack', name: 'Huge Sack', value: 25, oneIn: 1234, width: .64, depth: .48 },
] as const;
/** Part of schema 3's released course contract. Preserve these odds and roll order. */
export const COIN_DENOMINATIONS: readonly CoinDenomination[] = Object.freeze([
  Object.freeze({ id: 'coin' as const, name: 'Coin', value: 1, oneIn: null,
    probability: 1 - rare.reduce((sum, item) => sum + 1 / item.oneIn, 0), width: .24, depth: .11 }),
  ...rare.map(item => Object.freeze({ ...item, probability: 1 / item.oneIn })),
]);
export function coinDenomination(id: CoinDenominationId = 'coin'): CoinDenomination {
  return COIN_DENOMINATIONS.find(item => item.id === id) ?? COIN_DENOMINATIONS[0]!;
}
/** One exclusive draw: a sack never loses probability to a previous lottery. */
export function coinDenominationAtRoll(roll: number): CoinDenominationId {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new RangeError('Coin roll must be in [0, 1).');
  let boundary = 0;
  for (const item of COIN_DENOMINATIONS.slice(1)) {
    boundary += item.probability;
    if (roll < boundary) return item.id;
  }
  return 'coin';
}
export function coinDenominationForRow(seed: number, row: number): CoinDenominationId {
  return coinDenominationAtRoll(random(seed ^ Math.imul(row + 173, 0x6b43a9d) ^ 0xc01a57e1)());
}
/** The duck's body must reach the rendered pickup, including wider sacks. */
export function touchesCoin(id: CoinDenominationId | undefined, dx: number, dy: number): boolean {
  if (!id || id === 'coin') return Math.hypot(dx, dy) <= .32;
  const item = coinDenomination(id);
  return (dx / (.2 + item.width / 2)) ** 2 + (dy / (.2 + item.depth / 2)) ** 2 <= 1;
}
