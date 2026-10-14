import type { LaneKind, Model, Voxel, World } from '../content.js';

/** Released schema 1 content. Keep this snapshot unchanged; add a schema for new courses. */
const box = (x: number, y: number, z: number, w: number, d: number, h: number, color: string): Voxel => ({ x, y, z, w, d, h, color });
const tree = (leaf: string, trunk = '#826146'): Model => [box(0, 0, 0, .2, .2, .7, trunk), box(0, 0, .55, .78, .72, .5, leaf), box(0, 0, 1.02, .52, .5, .32, leaf)];
const rock: Model = [box(0, 0, 0, .6, .55, .27, '#96a5a0'), box(-.08, -.04, .27, .4, .35, .16, '#b1bcb4')];
const mushroom: Model = [box(0, 0, 0, .18, .18, .35, '#eee1c5'), box(0, 0, .35, .6, .55, .2, '#d37366'), box(-.13, -.13, .55, .14, .14, .02, '#fff0d9')];
const cactus: Model = [box(0, 0, 0, .28, .26, 1, '#629b73'), box(-.28, 0, .44, .3, .2, .18, '#629b73'), box(-.37, 0, .44, .15, .2, .36, '#629b73'), box(.26, 0, .65, .3, .2, .16, '#629b73')];
const lamp: Model = [box(0, 0, 0, .15, .15, 1.05, '#39465e'), box(0, 0, 1.05, .5, .44, .24, '#c2a6f0')];
const flower: Model = [box(0, 0, 0, .08, .08, .3, '#6c8c43'), box(0, 0, .3, .43, .38, .13, '#f2bd68')];
const car = (color: string, long = false): Model => [box(0, 0, .14, long ? 1.7 : 1.12, .62, .32, color), box(-.06, 0, .46, long ? .85 : .56, .54, .26, '#e1ebe7'), box(-.06, -.28, .49, .4, .03, .16, '#4e7e8b'), ...[-.39, .39].flatMap(x => [-.3, .3].map(y => box(x, y, .04, .2, .12, .2, '#34433e'))), box(.5, -.21, .31, .05, .12, .1, '#fff0b3')];
const TRAIN_MODEL: Model = [-2, -1, 0, 1, 2].flatMap(i => [
  box(i * 2.55, 0, .1, 2.4, .72, .75, '#e1b668'),
  box(i * 2.55, -.37, .45, 1.75, .03, .24, '#536e71'),
]);
const TRAIN_BOUNDS = {
  minX: Math.min(...TRAIN_MODEL.map(v => v.x - v.w / 2)),
  maxX: Math.max(...TRAIN_MODEL.map(v => v.x + v.w / 2)),
};
export const TRAIN_LENGTH_V1 = TRAIN_BOUNDS.maxX - TRAIN_BOUNDS.minX;
const log = (color: string): Model => [box(0, 0, .01, 1, .72, .2, color), box(0, -.3, .21, .84, .05, .03, '#c9a976')];
const ice: Model = [box(0, 0, .01, 1, .8, .13, '#d2ebed'), box(-.2, 0, .14, .4, .4, .04, '#efffff')];
const lily: Model = [box(0, 0, .01, 1, .8, .09, '#8eae55'), box(.26, .1, .1, .15, .2, .09, '#ecc5b7')];
const commonPatterns: readonly (readonly LaneKind[])[] = [['road', 'road', 'meadow'], ['river', 'river', 'meadow'], ['road', 'meadow', 'rail', 'meadow'], ['road', 'road', 'road', 'meadow'], ['river', 'meadow', 'road', 'meadow']];
const worlds: World[] = [
  { id: 'pond', name: 'Mosswater', note: 'Lilypads & lazy afternoons', colors: { ground: '#9db875', alternate: '#94ae6d', edge: '#769059', road: '#65736d', water: '#65a6ae', foam: '#a7d5d0', rail: '#8c9680' }, scenery: [tree('#5e8b55'), mushroom, rock], vehicles: [car('#e6bc69'), car('#cf8472'), car('#87a9a8', true)], platforms: [log('#a47e54'), lily], patterns: commonPatterns },
  { id: 'orchard', name: 'Apricot Grove', note: 'Golden fields & fruit trucks', colors: { ground: '#dfbd79', alternate: '#d6b474', edge: '#b4945f', road: '#827b6a', water: '#7daaa3', foam: '#c0d8c2', rail: '#bdab83' }, scenery: [tree('#b3944c'), flower, mushroom], vehicles: [car('#d68b44', true), car('#b06956')], platforms: [log('#b08c5d')], patterns: commonPatterns },
  { id: 'neon', name: 'Moonlit Market', note: 'Mint taxis & lavender lights', colors: { ground: '#8c86a9', alternate: '#837ca0', edge: '#625d83', road: '#4c526d', water: '#6889b4', foam: '#a4b9e1', rail: '#72718c' }, scenery: [lamp, tree('#7883b7'), rock], vehicles: [car('#b7a0d7'), car('#85c7b1'), car('#e2a5c1', true)], platforms: [log('#917ea7')], patterns: [['road', 'road', 'meadow', 'rail', 'meadow'], ['river', 'meadow', 'road', 'road', 'meadow'], ...commonPatterns] },
  { id: 'dunes', name: 'Cactus Crossing', note: 'Warm sand & wandering buses', colors: { ground: '#dab18a', alternate: '#d1a780', edge: '#af8262', road: '#8e796c', water: '#6aa3a3', foam: '#b1d4c6', rail: '#b6977e' }, scenery: [cactus, rock, flower], vehicles: [car('#dca45f', true), car('#c27456')], platforms: [log('#a87754')], patterns: commonPatterns },
  { id: 'frost', name: 'Snowdrop Pass', note: 'Ice rafts & powdery pines', colors: { ground: '#d7e5df', alternate: '#c9dcd9', edge: '#a1bebc', road: '#78949b', water: '#76b3c6', foam: '#d1edf0', rail: '#b1c8ce' }, scenery: [tree('#7daca5', '#8a8980'), rock], vehicles: [car('#789fc0'), car('#d9a18f', true)], platforms: [ice], patterns: [['river', 'river', 'meadow', 'road', 'meadow'], ...commonPatterns] },
  { id: 'bloom', name: 'Bloom Hollow', note: 'Wildflowers & tiny toadstools', colors: { ground: '#afbea0', alternate: '#a4b496', edge: '#7e9576', road: '#7c817b', water: '#86b5b4', foam: '#d0e5d5', rail: '#a0a893' }, scenery: [flower, mushroom, tree('#ae9eaf')], vehicles: [car('#d9a7ba'), car('#bec784', true)], platforms: [lily, log('#aa9478')], patterns: commonPatterns },
];

function freezeContent<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeContent(child);
    Object.freeze(value);
  }
  return value;
}
export const WORLDS_V1: readonly World[] = freezeContent(worlds);
export const HOME_IDS_V1 = Object.freeze(['pond', 'orchard', 'neon', 'dunes', 'frost', 'bloom', 'shuffle'] as const);
