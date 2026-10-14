import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-hat-propeller', kind: 'cosmetic', name: 'Pinwheel Cap',
  description: 'A sunny two-tone cap with a mint propeller perched on top.',
  rarity: 'uncommon', price: 16, icon: '✣', color: '#e5b65b',
  appearance: { style: 'hat', color: '#e5b65b', model: [
    { x: -.26, y: 0, z: 0, w: .52, d: 1.02, h: .30, color: '#e5b65b' },
    { x: .26, y: 0, z: 0, w: .52, d: 1.02, h: .30, color: '#cf7b66' },
    { x: 0, y: 0, z: .30, w: .76, d: .76, h: .12, color: '#f0cd79' },
    { x: 0, y: 0, z: .42, w: .12, d: .12, h: .20, color: '#667a88' },
    { x: 0, y: 0, z: .62, w: 1.36, d: .20, h: .07, color: '#77baa4' },
    { x: 0, y: 0, z: .69, w: .20, d: .20, h: .07, color: '#fff0ba' },
  ] },
} satisfies CosmeticDefinition;
