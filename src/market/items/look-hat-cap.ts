import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-hat-cap', kind: 'cosmetic', name: 'Pond Cap',
  description: 'A teal cap with a sunny badge and a little forward brim.',
  rarity: 'common', price: 12, icon: '⌒', color: '#4c9c97',
  appearance: { style: 'hat', color: '#4c9c97', model: [
    { x: 0, y: 0, z: 0, w: 1.06, d: 1.04, h: .24, color: '#4c9c97' },
    { x: 0, y: .035, z: .24, w: .8, d: .8, h: .12, color: '#6db8a7' },
    { x: 0, y: -.65, z: 0, w: 1.1, d: .5, h: .08, color: '#367d80' },
    { x: 0, y: -.53, z: .08, w: .22, d: .025, h: .15, color: '#f1ce6e' },
  ] },
} satisfies CosmeticDefinition;
