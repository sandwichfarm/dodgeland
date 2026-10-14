import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-shirt-rugby', kind: 'cosmetic', name: 'Puddle Club Jersey',
  description: 'A brick-red rugby shirt with a wide cream stripe and a folded collar.',
  rarity: 'common', price: 12, icon: '═', color: '#aa6863',
  appearance: { style: 'shirt', color: '#aa6863', model: [
    ...[-.515, .515].map(y => ({ x: 0, y, z: .32, w: 1.02, d: .035, h: .30, color: '#eee0b9' })),
    ...[-.515, .515].map(x => ({ x, y: 0, z: .32, w: .035, d: 1.02, h: .30, color: '#eee0b9' })),
    ...[-.23, .23].map(x => ({ x, y: -.14, z: 1.004, w: .22, d: .65, h: .06, color: '#f5eacb' })),
    { x: 0, y: -.54, z: .67, w: .10, d: .04, h: .30, color: '#f5eacb' },
  ] },
} satisfies CosmeticDefinition;
