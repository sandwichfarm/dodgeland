import type { CharacterCallCue } from './audio.js';
/** Content-only extension surface. Dimensions are in tiles; z points upward. */
export type Voxel = { x: number; y: number; z: number; w: number; d: number; h: number; color: string };
export type Model = readonly Voxel[];
export type LaneKind = 'meadow' | 'road' | 'river' | 'rail';
export interface Character { id: string; name: string; note: string; home: string; coins: number; distance: number; model: Model; call: CharacterCallCue; callLabel: string }
export interface World {
  id: string; name: string; note: string;
  colors: { ground: string; alternate: string; edge: string; road: string; water: string; foam: string; rail: string };
  scenery: readonly Model[]; vehicles: readonly Model[]; platforms: readonly Model[];
  patterns: readonly (readonly LaneKind[])[];
}
export const box = (x: number, y: number, z: number, w: number, d: number, h: number, color: string): Voxel => ({ x, y, z, w, d, h, color });
const eyes = (z = .53): Voxel[] => [box(-.19, -.24, z, .1, .08, .12, '#23322d'), box(.19, -.24, z, .1, .08, .12, '#23322d')];
const frog: Model = [box(0, 0, .13, .64, .54, .36, '#80b84c'), box(0, -.12, .37, .62, .45, .2, '#a2ce63'), box(-.25, -.19, .52, .2, .16, .15, '#b9df78'), box(.25, -.19, .52, .2, .16, .15, '#b9df78'), ...eyes(), box(-.29, .2, .04, .23, .22, .13, '#507c36'), box(.29, .2, .04, .23, .22, .13, '#507c36')];
// The head and bill face straight ahead; the whole body turns in the renderer.
const duck: Model = [
  // Webbed feet, plump body, and a little upturned tail.
  ...[-.16, .16].flatMap(x => [box(x, .14, .02, .17, .3, .07, '#ec9136'), box(x, .015, .02, .22, .09, .045, '#f7a743'), box(x, .14, .07, .08, .08, .1, '#ec9136')]),
  box(0, .06, .15, .55, .54, .30, '#f8d45e'),
  box(0, .04, .39, .46, .45, .12, '#ffe58a'),
  box(0, .37, .34, .24, .19, .13, '#ffe58a'),
  box(0, .43, .45, .17, .12, .08, '#ffeca0'),
  // Wings on both sides also read in the collection's opposite camera angle.
  ...[-.31, .31].flatMap(x => [box(x, .07, .27, .09, .32, .16, '#e6b344'), box(x, .17, .25, .1, .13, .09, '#edc054')]),
  box(0, -.16, .48, .42, .4, .36, '#ffe889'),
  // An oversized bill extends beyond the head on both sides.
  box(0, -.47, .505, .64, .30, .055, '#cf702c'),
  box(0, -.48, .555, .70, .34, .10, '#f39838'),
  ...[-.23, .23].flatMap(x => [box(x, -.20, .715, .032, .085, .095, '#28382c'), box(x + Math.sign(x) * .02, -.22, .775, .012, .027, .025, '#fffbed')]),
];
const chicken: Model = [
  // Separate toes, a round white body, and folded cream wings.
  ...[-.16, .16].flatMap(x => [box(x, .09, .035, .07, .08, .17, '#db913d'), box(x, -.025, .025, .19, .27, .055, '#efa843')]),
  box(0, .055, .15, .55, .54, .32, '#f4f1df'),
  box(0, .06, .43, .45, .43, .15, '#fffbed'),
  ...[-.30, .30].flatMap(x => [box(x, .08, .27, .10, .33, .19, '#dfdcc8'), box(x, .18, .30, .11, .16, .10, '#eee9d4')]),
  // Upright tail feathers give the hen a different silhouette from Butter.
  box(0, .38, .36, .27, .20, .20, '#eee9d4'),
  box(0, .46, .52, .20, .14, .18, '#fffbed'),
  box(0, -.14, .46, .40, .38, .38, '#fffbed'),
  box(0, -.37, .585, .24, .18, .115, '#e9a13e'),
  box(0, -.47, .595, .14, .10, .07, '#f4b449'),
  box(0, -.365, .455, .13, .09, .17, '#ca554b'),
  ...[-.215, .215].flatMap(x => [box(x, -.205, .695, .032, .08, .10, '#28382c'), box(x + Math.sign(x) * .02, -.225, .755, .012, .025, .025, '#ffffff')]),
  // A narrow red comb is readable from front, back, and either side.
  box(0, -.14, .84, .115, .34, .075, '#c94d43'),
  ...[-.26, -.14, -.02].map((y, index) => box(0, y, .905, .115, .085, index === 1 ? .115 : .08, '#e46752')),
];
const axolotl: Model = [box(0, .03, .12, .58, .62, .3, '#efa6b9'), box(0, -.2, .37, .65, .4, .25, '#ffc0cb'), ...eyes(.49), ...[-1, 1].flatMap(s => [box(s * .4, -.22, .37, .25, .1, .12, '#d96c98'), box(s * .39, -.06, .51, .12, .12, .23, '#d96c98')]), box(0, .42, .12, .22, .35, .12, '#e386a4')];
const robot: Model = [box(0, 0, .1, .46, .43, .43, '#82adb0'), box(0, -.04, .54, .6, .46, .32, '#c4dddd'), box(0, -.29, .6, .42, .05, .12, '#244e59'), box(-.13, -.32, .62, .08, .05, .08, '#8cf3cb'), box(.13, -.32, .62, .08, .05, .08, '#8cf3cb'), box(0, 0, .86, .06, .06, .16, '#e8ab50')];
const fox: Model = [box(0, .05, .13, .48, .55, .35, '#c96e38'), box(0, -.18, .46, .57, .4, .27, '#ef9a51'), box(0, -.38, .43, .36, .23, .16, '#f4e5cd'), box(-.2, -.08, .73, .15, .16, .22, '#ad5832'), box(.2, -.08, .73, .15, .16, .22, '#ad5832'), ...eyes(.58), box(0, .47, .2, .26, .4, .18, '#f2ceaa')];
const penguin: Model = [box(0, .02, .1, .5, .48, .57, '#3d5162'), box(0, -.24, .13, .34, .05, .4, '#e6eddf'), box(0, -.07, .58, .43, .39, .23, '#465970'), box(0, -.31, .61, .19, .15, .1, '#efb049'), ...eyes(.68)];
export const DEFAULT_CHARACTER = 'butter';
export const CHARACTERS: Character[] = [
  { id: 'butter', name: 'Butter', note: 'A little duck. A very big adventure.', home: 'orchard', coins: 0, distance: 0, model: duck, call: 'call.duck', callLabel: 'quack' },
  { id: 'sunny', name: 'Sunny', note: 'A brave little hen. Eyes on the other side.', home: 'orchard', coins: 0, distance: 0, model: chicken, call: 'call.chicken', callLabel: 'cluck' },
  { id: 'pip', name: 'Pip', note: 'A small frog. A very big adventure.', home: 'pond', coins: 0, distance: 0, model: frog, call: 'call.frog', callLabel: 'croak' },
  { id: 'petal', name: 'Petal', note: 'Six gills. Endless possibilities.', home: 'neon', coins: 30, distance: 0, model: axolotl, call: 'call.axolotl', callLabel: 'bubble' },
  { id: 'beep', name: 'Beep', note: 'Destination: somewhere new.', home: 'neon', coins: 0, distance: 75, model: robot, call: 'call.robot', callLabel: 'beep' },
  { id: 'rust', name: 'Rust', note: 'A little woodland wanderer.', home: 'dunes', coins: 70, distance: 0, model: fox, call: 'call.fox', callLabel: 'yip' },
  { id: 'pebble', name: 'Pebble', note: 'Cold feet. Warm heart.', home: 'frost', coins: 120, distance: 0, model: penguin, call: 'call.penguin', callLabel: 'peep' },
];
const tree = (leaf: string, trunk = '#826146'): Model => [box(0, 0, 0, .2, .2, .7, trunk), box(0, 0, .55, .78, .72, .5, leaf), box(0, 0, 1.02, .52, .5, .32, leaf)];
const rock: Model = [box(0, 0, 0, .6, .55, .27, '#96a5a0'), box(-.08, -.04, .27, .4, .35, .16, '#b1bcb4')];
const mushroom: Model = [box(0, 0, 0, .18, .18, .35, '#eee1c5'), box(0, 0, .35, .6, .55, .2, '#d37366'), box(-.13, -.13, .55, .14, .14, .02, '#fff0d9')];
const cactus: Model = [box(0, 0, 0, .28, .26, 1, '#629b73'), box(-.28, 0, .44, .3, .2, .18, '#629b73'), box(-.37, 0, .44, .15, .2, .36, '#629b73'), box(.26, 0, .65, .3, .2, .16, '#629b73')];
const lamp: Model = [box(0, 0, 0, .15, .15, 1.05, '#39465e'), box(0, 0, 1.05, .5, .44, .24, '#c2a6f0')];
const flower: Model = [box(0, 0, 0, .08, .08, .3, '#6c8c43'), box(0, 0, .3, .43, .38, .13, '#f2bd68')];
const car = (color: string, long = false): Model => [box(0, 0, .14, long ? 1.7 : 1.12, .62, .32, color), box(-.06, 0, .46, long ? .85 : .56, .54, .26, '#e1ebe7'), box(-.06, -.28, .49, .4, .03, .16, '#4e7e8b'), ...[-.39, .39].flatMap(x => [-.3, .3].map(y => box(x, y, .04, .2, .12, .2, '#34433e'))), box(.5, -.21, .31, .05, .12, .1, '#fff0b3')];
export const TRAIN_MODEL: Model = [-2, -1, 0, 1, 2].flatMap(i => [
  box(i * 2.55, 0, .1, 2.4, .72, .75, '#e1b668'),
  box(i * 2.55, -.37, .45, 1.75, .03, .24, '#536e71'),
]);
export const TRAIN_BOUNDS = {
  minX: Math.min(...TRAIN_MODEL.map(v => v.x - v.w / 2)),
  maxX: Math.max(...TRAIN_MODEL.map(v => v.x + v.w / 2)),
};
export const TRAIN_LENGTH = TRAIN_BOUNDS.maxX - TRAIN_BOUNDS.minX;
const log = (color: string): Model => [box(0, 0, .01, 1, .72, .2, color), box(0, -.3, .21, .84, .05, .03, '#c9a976')];
const ice: Model = [box(0, 0, .01, 1, .8, .13, '#d2ebed'), box(-.2, 0, .14, .4, .4, .04, '#efffff')];
const lily: Model = [box(0, 0, .01, 1, .8, .09, '#8eae55'), box(.26, .1, .1, .15, .2, .09, '#ecc5b7')];
const commonPatterns: readonly (readonly LaneKind[])[] = [['road', 'road', 'meadow'], ['river', 'river', 'meadow'], ['road', 'meadow', 'rail', 'meadow'], ['road', 'road', 'road', 'meadow'], ['river', 'meadow', 'road', 'meadow']];
export const WORLDS: World[] = [
  { id: 'pond', name: 'Mosswater', note: 'Lilypads & lazy afternoons', colors: { ground: '#9db875', alternate: '#94ae6d', edge: '#769059', road: '#65736d', water: '#65a6ae', foam: '#a7d5d0', rail: '#8c9680' }, scenery: [tree('#5e8b55'), mushroom, rock], vehicles: [car('#e6bc69'), car('#cf8472'), car('#87a9a8', true)], platforms: [log('#a47e54'), lily], patterns: commonPatterns },
  { id: 'orchard', name: 'Apricot Grove', note: 'Golden fields & fruit trucks', colors: { ground: '#dfbd79', alternate: '#d6b474', edge: '#b4945f', road: '#827b6a', water: '#7daaa3', foam: '#c0d8c2', rail: '#bdab83' }, scenery: [tree('#b3944c'), flower, mushroom], vehicles: [car('#d68b44', true), car('#b06956')], platforms: [log('#b08c5d')], patterns: commonPatterns },
  { id: 'neon', name: 'Moonlit Market', note: 'Mint taxis & lavender lights', colors: { ground: '#8c86a9', alternate: '#837ca0', edge: '#625d83', road: '#4c526d', water: '#6889b4', foam: '#a4b9e1', rail: '#72718c' }, scenery: [lamp, tree('#7883b7'), rock], vehicles: [car('#b7a0d7'), car('#85c7b1'), car('#e2a5c1', true)], platforms: [log('#917ea7')], patterns: [['road', 'road', 'meadow', 'rail', 'meadow'], ['river', 'meadow', 'road', 'road', 'meadow'], ...commonPatterns] },
  { id: 'dunes', name: 'Cactus Crossing', note: 'Warm sand & wandering buses', colors: { ground: '#dab18a', alternate: '#d1a780', edge: '#af8262', road: '#8e796c', water: '#6aa3a3', foam: '#b1d4c6', rail: '#b6977e' }, scenery: [cactus, rock, flower], vehicles: [car('#dca45f', true), car('#c27456')], platforms: [log('#a87754')], patterns: commonPatterns },
  { id: 'frost', name: 'Snowdrop Pass', note: 'Ice rafts & powdery pines', colors: { ground: '#d7e5df', alternate: '#c9dcd9', edge: '#a1bebc', road: '#78949b', water: '#76b3c6', foam: '#d1edf0', rail: '#b1c8ce' }, scenery: [tree('#7daca5', '#8a8980'), rock], vehicles: [car('#789fc0'), car('#d9a18f', true)], platforms: [ice], patterns: [['river', 'river', 'meadow', 'road', 'meadow'], ...commonPatterns] },
  { id: 'bloom', name: 'Bloom Hollow', note: 'Wildflowers & tiny toadstools', colors: { ground: '#afbea0', alternate: '#a4b496', edge: '#7e9576', road: '#7c817b', water: '#86b5b4', foam: '#d0e5d5', rail: '#a0a893' }, scenery: [flower, mushroom, tree('#ae9eaf')], vehicles: [car('#d9a7ba'), car('#bec784', true)], platforms: [lily, log('#aa9478')], patterns: commonPatterns },
];
export const characterById = (id: string): Character => CHARACTERS.find(c => c.id === id) ?? CHARACTERS[0]!;
export const worldById = (id: string): World => WORLDS.find(w => w.id === id) ?? WORLDS[0]!;
