import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-hat-pirate', kind: 'cosmetic', name: 'Creek Corsair',
  description: 'A wide charcoal pirate hat, cream trim, and a tiny crossed-bones badge.',
  rarity: 'rare', price: 24, icon: '⚑', color: '#48515b',
  appearance: { style: 'hat', color: '#48515b', model: [
    { x: 0, y: 0, z: 0, w: 1.50, d: 1.08, h: .10, color: '#cab98b' },
    { x: 0, y: 0, z: .10, w: 1.04, d: .90, h: .38, color: '#48515b' },
    ...[-.60, .60].map(x => ({ x, y: 0, z: .10, w: .30, d: .94, h: .27, color: '#66707b' })),
    { x: 0, y: -.49, z: .16, w: .12, d: .045, h: .22, color: '#f1e3be' },
    { x: 0, y: -.49, z: .22, w: .30, d: .045, h: .08, color: '#f1e3be' },
  ] },
} satisfies CosmeticDefinition;
