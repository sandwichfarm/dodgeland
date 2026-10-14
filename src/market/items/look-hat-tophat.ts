import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-hat-tophat', kind: 'cosmetic', name: 'Midnight Topper',
  description: 'A tall midnight-blue top hat with a satin gold band.',
  rarity: 'rare', price: 24, icon: '▥', color: '#38485f',
  appearance: { style: 'hat', color: '#38485f', model: [
    { x: 0, y: 0, z: 0, w: 1.40, d: 1.28, h: .10, color: '#29354b' },
    { x: 0, y: 0, z: .10, w: .88, d: .86, h: .82, color: '#38485f' },
    { x: 0, y: 0, z: .13, w: .92, d: .90, h: .18, color: '#e4be6c' },
    { x: 0, y: 0, z: .92, w: .94, d: .92, h: .07, color: '#53617b' },
  ] },
} satisfies CosmeticDefinition;
