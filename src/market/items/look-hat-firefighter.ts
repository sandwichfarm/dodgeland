import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-hat-firefighter', kind: 'cosmetic', name: 'Rescue Helmet',
  description: 'A cherry-red helmet with a raised crest and a brass front badge.',
  rarity: 'rare', price: 24, icon: '▴', color: '#c9604a',
  appearance: { style: 'hat', color: '#c9604a', model: [
    { x: 0, y: .10, z: 0, w: 1.25, d: 1.42, h: .10, color: '#9f493c' },
    { x: 0, y: 0, z: .10, w: 1.08, d: 1.02, h: .32, color: '#c9604a' },
    { x: 0, y: .01, z: .42, w: .78, d: .80, h: .13, color: '#dd7961' },
    { x: 0, y: .03, z: .55, w: .18, d: .86, h: .14, color: '#e4b76a' },
    { x: 0, y: -.53, z: .17, w: .28, d: .06, h: .30, color: '#f1cf76' },
  ] },
} satisfies CosmeticDefinition;
