import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-shirt-lifeguard', kind: 'cosmetic', name: 'Shore Patrol',
  description: 'A coral lifeguard vest with cream trim and a little silver whistle.',
  rarity: 'uncommon', price: 16, icon: '+', color: '#d47b68',
  appearance: { style: 'shirt', color: '#d47b68', model: [
    ...[-.34, .34].map(x => ({ x, y: -.515, z: .30, w: .12, d: .035, h: .68, color: '#f4e5bd' })),
    { x: 0, y: -.525, z: .08, w: 1.02, d: .035, h: .12, color: '#f4e5bd' },
    { x: 0, y: -.53, z: .60, w: .055, d: .025, h: .32, color: '#9b5854' },
    { x: 0, y: -.56, z: .50, w: .16, d: .09, h: .12, color: '#b6c8c6' },
    { x: 0, y: .525, z: .28, w: .15, d: .035, h: .48, color: '#f4e5bd' },
    { x: 0, y: .525, z: .44, w: .47, d: .035, h: .15, color: '#f4e5bd' },
  ] },
} satisfies CosmeticDefinition;
