import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-shirt-poncho', kind: 'cosmetic', name: 'Sunset Poncho',
  description: 'A terracotta poncho with stepped shoulders, teal stripes, and a fringed hem.',
  rarity: 'rare', price: 24, icon: '≋', color: '#c88262',
  appearance: { style: 'shirt', color: '#c88262', model: [
    ...[-.56, .56].map(x => ({ x, y: .02, z: .67, w: .20, d: 1.04, h: .25, color: '#d9986f' })),
    ...[-.53, .53].flatMap(y => [
      { x: 0, y, z: .40, w: 1.08, d: .04, h: .13, color: '#729e94' },
      { x: 0, y, z: .23, w: 1.08, d: .04, h: .08, color: '#eed6a4' },
      ...[-.40, -.20, 0, .20, .40].map(x => ({ x, y, z: .01, w: .09, d: .04, h: .13, color: '#eed6a4' })),
    ]),
  ] },
} satisfies CosmeticDefinition;
