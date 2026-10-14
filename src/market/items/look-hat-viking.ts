import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-hat-viking', kind: 'cosmetic', name: 'Pebble Raider',
  description: 'A steel-blue helmet with two little ivory horns and a copper ridge.',
  rarity: 'rare', price: 24, icon: '⋎', color: '#81999b',
  appearance: { style: 'hat', color: '#81999b', model: [
    { x: 0, y: 0, z: 0, w: 1.10, d: 1.04, h: .13, color: '#617a80' },
    { x: 0, y: 0, z: .13, w: .96, d: .94, h: .28, color: '#81999b' },
    { x: 0, y: 0, z: .41, w: .72, d: .72, h: .13, color: '#a0b4b0' },
    { x: 0, y: 0, z: .13, w: .12, d: .96, h: .43, color: '#c69a69' },
    ...[-.61, .61].map(x => ({ x, y: .04, z: .24, w: .31, d: .24, h: .18, color: '#e9dbb3' })),
    ...[-.72, .72].map(x => ({ x, y: .04, z: .42, w: .13, d: .20, h: .24, color: '#fff0ce' })),
  ] },
} satisfies CosmeticDefinition;
