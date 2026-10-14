import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-hat-ranger', kind: 'cosmetic', name: 'Ranger Brim',
  description: 'A broad forest-green brim with a pinched crown and acorn badge.',
  rarity: 'uncommon', price: 16, icon: '⌂', color: '#668469',
  appearance: { style: 'hat', color: '#668469', model: [
    { x: 0, y: 0, z: 0, w: 1.52, d: 1.40, h: .09, color: '#526f54' },
    { x: 0, y: .03, z: .09, w: 1.04, d: .92, h: .27, color: '#668469' },
    ...[-.22, .22].map(x => ({ x, y: .03, z: .36, w: .35, d: .70, h: .18, color: '#7b9572' })),
    { x: 0, y: .03, z: .10, w: 1.06, d: .94, h: .10, color: '#895f3d' },
    { x: 0, y: -.46, z: .16, w: .19, d: .04, h: .21, color: '#e3c482' },
  ] },
} satisfies CosmeticDefinition;
