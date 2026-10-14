import { box } from './content.js';
import type { Model, Voxel } from './content.js';
import type { Lane } from './game.js';

export interface MarketScenery {
  model: Model;
  footprint: number;
  size: 'counter' | 'cart' | 'stall';
  milestone: number;
}

type Stand = Omit<MarketScenery, 'milestone'>;
type Bounds = { minX: number; maxX: number; minY: number; maxY: number; height: number };
const COLORS = ['#c85e51', '#d3a33e', '#428d86', '#99658d'] as const;
const CREAM = '#ffedbe', WOOD = '#a77545', DARK_WOOD = '#795239';
// Twelve reusable looks per source asset, never one cache entry per map row.
const stands = new WeakMap<Model, Map<number, Stand>>();

function bounds(model: Model): Bounds {
  return {
    minX: Math.min(...model.map(v => v.x - v.w / 2)),
    maxX: Math.max(...model.map(v => v.x + v.w / 2)),
    minY: Math.min(...model.map(v => v.y - v.d / 2)),
    maxY: Math.max(...model.map(v => v.y + v.d / 2)),
    height: Math.max(...model.map(v => v.z + v.h)),
  };
}

/** This visual hash consumes no level or gameplay RNG state. */
function decorationHash(seed: number, row: number, x: number, variant: number): number {
  let value = seed ^ Math.imul(row, 0x45d9f3b) ^ Math.imul(Math.round(x * 65536), 0x27d4eb2d) ^ Math.imul(variant + 1, 0x165667b1);
  value = Math.imul(value ^ value >>> 16, 0x7feb352d);
  value = Math.imul(value ^ value >>> 15, 0x846ca68b);
  return (value ^ value >>> 16) >>> 0;
}

function goods(z: number, variety: number): Voxel[] {
  const produce = [['#df7950', '#d9ad39'], ['#88ad54', '#cf6253'], ['#a584be', '#e3b857']][variety]!;
  return [
    ...[-.24, .20].flatMap((x, index) => [
      box(x, -.01, z, .31, .41, .065, DARK_WOOD),
      box(x, .17, z + .065, .31, .035, .09, WOOD),
      box(x - .065, -.08, z + .065, .12, .13, .12, produce[index]!),
      box(x + .065, .045, z + .065, .12, .13, .13, produce[index]!),
    ]),
    box(.21, -.19, z + .065, .16, .09, .015, CREAM),
    box(.21, -.2, z + .081, .07, .035, .012, COLORS[variety]!),
  ];
}

/** Templates occupy x/y [-.5,.5], z [0,1] before fitting the old prop. */
function template(size: Stand['size'], color: string, variety: number): Model {
  if (size === 'counter') return [
    ...[-.37, .37].flatMap(x => [-.34, .34].map(y => box(x, y, 0, .12, .12, .64, DARK_WOOD))),
    box(0, 0, .17, .8, .74, .1, WOOD),
    box(0, 0, .56, .96, .9, .13, WOOD),
    ...[-2, -1, 0, 1, 2].flatMap((stripe, index) => [
      box(stripe * .2, 0, .69, .2, 1, .035, index % 2 ? CREAM : color),
      box(stripe * .2, -.475, .42, .2, .05, .29, index % 2 ? CREAM : color),
    ]),
    ...goods(.725, variety),
  ];
  if (size === 'cart') return [
    ...[-.32, .32].flatMap(x => [-.43, .43].map(y => box(x, y, 0, .21, .14, .27, '#4c4940'))),
    ...[-.32, .32].map(x => box(x, 0, .105, .08, .88, .07, DARK_WOOD)),
    box(0, 0, .23, .82, .7, .36, WOOD),
    box(0, 0, .59, .92, .87, .1, CREAM),
    ...[-2, -1, 0, 1, 2].map((stripe, index) => box(stripe * .17, -.37, .35, .17, .035, .27, index % 2 ? CREAM : color)),
    box(.465, .03, .64, .07, .76, .065, DARK_WOOD),
    box(.38, -.3, .49, .21, .08, .22, DARK_WOOD),
    ...goods(.7, variety),
    box(-.18, .28, .88, .33, .04, .12, color),
    box(-.18, .255, .91, .21, .015, .04, CREAM),
  ];
  return [
    ...[-.42, .42].flatMap(x => [-.38, .38].map(y => box(x, y, 0, .075, .075, .91, DARK_WOOD))),
    box(0, 0, .29, .86, .74, .2, WOOD),
    box(0, 0, .49, .96, .84, .065, CREAM),
    ...[-1, 0, 1].map((stripe, index) => box(stripe * .28, -.385, .16, .28, .035, .32, index % 2 ? CREAM : color)),
    ...[-2, -1, 0, 1, 2].flatMap((stripe, index) => [
      box(stripe * .2, 0, .90, .2, 1, .1, index % 2 ? CREAM : color),
      box(stripe * .2, -.465, .82 + index % 2 * .025, .2, .07, .08, index % 2 ? CREAM : color),
    ]),
    ...goods(.56, variety),
    box(0, .36, .71, .36, .035, .12, DARK_WOOD),
    box(0, .337, .745, .23, .015, .04, CREAM),
  ];
}

function fittedStand(source: Model, look: number): Stand {
  let variants = stands.get(source);
  if (!variants) { variants = new Map(); stands.set(source, variants); }
  const existing = variants.get(look);
  if (existing) return existing;
  const old = bounds(source), width = old.maxX - old.minX, depth = old.maxY - old.minY;
  const size = old.height < .5 ? 'counter' : old.height < .85 ? 'cart' : 'stall';
  const model = template(size, COLORS[look % COLORS.length]!, Math.floor(look / COLORS.length)).map(v => Object.freeze({
    ...v, x: (old.minX + old.maxX) / 2 + v.x * width, y: (old.minY + old.maxY) / 2 + v.y * depth,
    z: v.z * old.height, w: v.w * width, d: v.d * depth, h: v.h * old.height,
  }));
  const stand = Object.freeze({ model: Object.freeze(model), footprint: Math.max(width, depth), size });
  variants.set(look, stand);
  return stand;
}

/** Replace only existing meadow props around the fixed 100-point markets. */
export function marketScenery(seed: number, lane: Lane, decoration: { x: number; variant: number }): MarketScenery | null {
  if (lane.kind !== 'meadow') return null;
  const milestone = Math.floor((lane.index + 4) / 100) * 100;
  if (milestone < 100 || lane.index > milestone + 11) return null;
  const source = lane.world.scenery[decoration.variant];
  if (!source?.length) return null;
  const first = lane.decorations.find(value => Math.abs(value.x) <= 5 && lane.blocked.includes(value.x)) ?? lane.decorations[0];
  const guaranteed = first?.x === decoration.x && first.variant === decoration.variant;
  const hash = decorationHash(seed, lane.index, decoration.x, decoration.variant);
  if (!guaranteed && hash % 3 === 0) return null;
  return { ...fittedStand(source, (hash >>> 8) % 12), milestone };
}
