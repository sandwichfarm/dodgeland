import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-hat-chef', kind: 'cosmetic', name: 'Soufflé Toque',
  description: 'A cream chef hat with three puffy peaks and a folded base.',
  rarity: 'uncommon', price: 16, icon: '♧', color: '#f3e9ca',
  appearance: { style: 'hat', color: '#f3e9ca', model: [
    { x: 0, y: 0, z: 0, w: 1.02, d: 1.00, h: .24, color: '#dfd3ad' },
    { x: 0, y: 0, z: .24, w: 1.20, d: 1.10, h: .38, color: '#f3e9ca' },
    ...[-.38, .38].map(x => ({ x, y: .02, z: .62, w: .43, d: .82, h: .22, color: '#fff4d8' })),
    { x: 0, y: -.03, z: .62, w: .40, d: .90, h: .35, color: '#fff4d8' },
  ] },
} satisfies CosmeticDefinition;
