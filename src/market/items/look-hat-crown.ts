import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-hat-crown', kind: 'cosmetic', name: 'Pond Crown',
  description: 'A golden five-point crown with a bright turquoise jewel.',
  rarity: 'epic', price: 36, icon: '♛', color: '#edc65c',
  appearance: { style: 'hat', color: '#edc65c', model: [
    { x: 0, y: 0, z: 0, w: 1.08, d: 1.02, h: .20, color: '#edc65c' },
    ...[-.43, .43].flatMap(x => [-.40, .40].map(y => ({ x, y, z: .20, w: .22, d: .22, h: .34, color: '#ffe18a' }))),
    { x: 0, y: -.40, z: .20, w: .22, d: .22, h: .48, color: '#ffe18a' },
    { x: 0, y: -.518, z: .05, w: .20, d: .04, h: .16, color: '#4cb9b1' },
  ] },
} satisfies CosmeticDefinition;
