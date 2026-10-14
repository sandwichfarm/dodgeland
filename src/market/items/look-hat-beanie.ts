import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-hat-beanie', kind: 'cosmetic', name: 'Berry Beanie',
  description: 'A cozy berry knit with a cream pom-pom. Wear with a shirt.',
  rarity: 'uncommon', price: 16, icon: '♟', color: '#b5688e',
  appearance: { style: 'hat', color: '#b5688e', model: [
    { x: 0, y: 0, z: 0, w: 1.10, d: 1.10, h: .13, color: '#d08cab' },
    { x: 0, y: 0, z: .13, w: .94, d: .96, h: .24, color: '#b5688e' },
    { x: 0, y: 0, z: .37, w: .7, d: .74, h: .14, color: '#c8799e' },
    { x: 0, y: 0, z: .51, w: .3, d: .3, h: .25, color: '#fff0c9' },
  ] },
} satisfies CosmeticDefinition;
