import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-shirt-raincoat', kind: 'cosmetic', name: 'Drizzle Coat',
  description: 'A golden raincoat with a raised collar, storm flap, and orange patch pockets.',
  rarity: 'uncommon', price: 16, icon: '☂', color: '#e0b750',
  appearance: { style: 'shirt', color: '#e0b750', model: [
    { x: 0, y: -.521, z: 0, w: .13, d: .04, h: 1, color: '#f3d57d' },
    ...[-.27, .27].map(x => ({ x, y: -.54, z: .16, w: .27, d: .07, h: .30, color: '#c99543' })),
    ...[-.28, .28].map(x => ({ x, y: .04, z: 1.004, w: .20, d: .70, h: .10, color: '#f1ce69' })),
    ...[.23, .52, .79].map(z => ({ x: .02, y: -.55, z, w: .055, d: .025, h: .055, color: '#8a7045' })),
    { x: 0, y: .518, z: .70, w: 1.02, d: .04, h: .18, color: '#f1ce69' },
  ] },
} satisfies CosmeticDefinition;
