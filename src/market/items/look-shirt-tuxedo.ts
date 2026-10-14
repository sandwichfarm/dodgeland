import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-shirt-tuxedo', kind: 'cosmetic', name: 'Evening Waddle',
  description: 'A charcoal dinner jacket with a cream shirt front and berry bow tie.',
  rarity: 'rare', price: 24, icon: '⋈', color: '#46515d',
  appearance: { style: 'shirt', color: '#46515d', model: [
    { x: 0, y: -.516, z: .14, w: .42, d: .035, h: .85, color: '#eee4cb' },
    ...[-.26, .26].map(x => ({ x, y: -.54, z: .64, w: .14, d: .045, h: .34, color: '#6b7480' })),
    ...[-.12, .12].map(x => ({ x, y: -.56, z: .79, w: .19, d: .06, h: .15, color: '#b66c80' })),
    { x: 0, y: -.59, z: .81, w: .09, d: .035, h: .11, color: '#d7939a' },
    ...[.30, .49, .65].map(z => ({ x: 0, y: -.55, z, w: .055, d: .025, h: .055, color: '#46515d' })),
  ] },
} satisfies CosmeticDefinition;
