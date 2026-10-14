import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-shirt-space', kind: 'cosmetic', name: 'Moonwalker Suit',
  description: 'A pearl space jacket with padded shoulders, a blue console, and twin air tanks.',
  rarity: 'epic', price: 36, icon: '⊞', color: '#d8ddd1',
  appearance: { style: 'shirt', color: '#d8ddd1', model: [
    ...[-.53, .53].map(x => ({ x, y: .01, z: .67, w: .14, d: .86, h: .26, color: '#a8bcc0' })),
    { x: 0, y: -.55, z: .38, w: .48, d: .08, h: .38, color: '#668da7' },
    ...[-.13, .13].map(x => ({ x, y: -.60, z: .49, w: .08, d: .03, h: .10, color: '#edc873' })),
    ...[-.23, .23].map(x => ({ x, y: .58, z: .16, w: .25, d: .20, h: .67, color: '#a8bcc0' })),
    { x: 0, y: -.52, z: .10, w: 1.02, d: .035, h: .10, color: '#b0c0bc' },
  ] },
} satisfies CosmeticDefinition;
