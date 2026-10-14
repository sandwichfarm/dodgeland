import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-shirt-vest', kind: 'cosmetic', name: 'Trail Vest',
  description: 'A moss-green vest with tiny golden pockets. Wear with a hat.',
  rarity: 'uncommon', price: 16, icon: '⊟', color: '#689677',
  appearance: { style: 'shirt', color: '#689677', model: [
    { x: 0, y: -.509, z: 0, w: .10, d: .03, h: 1, color: '#e6c77d' },
    ...[-.28, .28].map(x => ({ x, y: -.527, z: .18, w: .26, d: .065, h: .35, color: '#8eb18a' })),
    { x: 0, y: .51, z: .75, w: 1.02, d: .035, h: .14, color: '#8eb18a' },
    ...[-.508, .508].map(x => ({ x, y: .12, z: .25, w: .035, d: .48, h: .32, color: '#7ba183' })),
  ] },
} satisfies CosmeticDefinition;
