import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-hat-mushroom', kind: 'cosmetic', name: 'Toadstool Cap',
  description: 'A plump red mushroom cap dotted with cream squares.',
  rarity: 'rare', price: 24, icon: '●', color: '#c66b64',
  appearance: { style: 'hat', color: '#c66b64', model: [
    { x: 0, y: 0, z: 0, w: 1.48, d: 1.34, h: .12, color: '#ead7b1' },
    { x: 0, y: 0, z: .12, w: 1.44, d: 1.30, h: .22, color: '#c66b64' },
    { x: 0, y: 0, z: .34, w: 1.10, d: 1.02, h: .23, color: '#d97d72' },
    { x: 0, y: 0, z: .57, w: .62, d: .60, h: .12, color: '#e48d7e' },
    { x: -.37, y: -.27, z: .571, w: .25, d: .26, h: .025, color: '#fff0cf' },
    { x: .39, y: .18, z: .571, w: .22, d: .23, h: .025, color: '#fff0cf' },
    { x: .08, y: -.12, z: .691, w: .22, d: .22, h: .025, color: '#fff0cf' },
  ] },
} satisfies CosmeticDefinition;
