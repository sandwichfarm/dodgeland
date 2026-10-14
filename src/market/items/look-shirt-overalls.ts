import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-shirt-overalls', kind: 'cosmetic', name: 'Pond Dungarees',
  description: 'Indigo overalls with a high bib, brass buttons, and a roomy front pocket.',
  rarity: 'common', price: 12, icon: '▣', color: '#6c8dab',
  appearance: { style: 'shirt', color: '#6c8dab', model: [
    { x: 0, y: -.516, z: .38, w: .64, d: .04, h: .62, color: '#476c91' },
    ...[-.28, .28].flatMap(x => [
      { x, y: .02, z: 1.004, w: .13, d: 1.04, h: .03, color: '#476c91' },
      { x, y: -.55, z: .84, w: .09, d: .025, h: .09, color: '#e6c270' },
    ]),
    { x: 0, y: -.56, z: .47, w: .32, d: .06, h: .25, color: '#91aec2' },
    { x: 0, y: .515, z: .12, w: .30, d: .035, h: .25, color: '#476c91' },
  ] },
} satisfies CosmeticDefinition;
