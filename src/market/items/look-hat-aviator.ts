import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-hat-aviator', kind: 'cosmetic', name: 'Cloud Pilot',
  description: 'A leather flight cap with soft ear pads and sky-blue goggles.',
  rarity: 'rare', price: 24, icon: '∞', color: '#9b704f',
  appearance: { style: 'hat', color: '#9b704f', model: [
    { x: 0, y: 0, z: 0, w: 1.04, d: 1.00, h: .26, color: '#9b704f' },
    { x: 0, y: .02, z: .26, w: .82, d: .82, h: .14, color: '#b48a60' },
    ...[-.55, .55].map(x => ({ x, y: .08, z: 0, w: .16, d: .52, h: .22, color: '#e5d4af' })),
    { x: 0, y: -.52, z: .12, w: 1.02, d: .07, h: .19, color: '#5d534b' },
    ...[-.25, .25].map(x => ({ x, y: -.57, z: .14, w: .32, d: .07, h: .20, color: '#8ac3cf' })),
  ] },
} satisfies CosmeticDefinition;
