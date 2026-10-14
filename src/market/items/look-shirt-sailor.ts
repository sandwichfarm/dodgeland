import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-shirt-sailor', kind: 'cosmetic', name: 'Sailor Shirt',
  description: 'Cream and navy stripes for a day on the water. Wear with a hat.',
  rarity: 'common', price: 12, icon: '≋', color: '#efe7cc',
  appearance: { style: 'shirt', color: '#efe7cc', model: [
    ...[-.24, .25].flatMap(z => [
      { x: 0, y: -.506, z: z + .4, w: 1.01, d: .024, h: .16, color: '#4d768b' },
      { x: 0, y: .506, z: z + .4, w: 1.01, d: .024, h: .16, color: '#4d768b' },
      ...[-.506, .506].map(x => ({ x, y: 0, z: z + .4, w: .024, d: 1.01, h: .16, color: '#4d768b' })),
    ]),
    { x: 0, y: .05, z: 1.006, w: .56, d: .78, h: .025, color: '#4d768b' },
  ] },
} satisfies CosmeticDefinition;
