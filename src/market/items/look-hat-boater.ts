import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-hat-boater', kind: 'cosmetic', name: 'Straw Boater',
  description: 'A wide straw brim and a cranberry ribbon. Wear with a shirt.',
  rarity: 'common', price: 12, icon: '▱', color: '#e9c675',
  appearance: { style: 'hat', color: '#e9c675', model: [
    { x: 0, y: 0, z: 0, w: 1.48, d: 1.42, h: .10, color: '#e9c675' },
    { x: 0, y: .015, z: .10, w: .98, d: .92, h: .28, color: '#f5dc91' },
    { x: 0, y: .015, z: .11, w: 1, d: .94, h: .09, color: '#b76062' },
    { x: .53, y: .03, z: .11, w: .15, d: .29, h: .14, color: '#ca7772' },
  ] },
} satisfies CosmeticDefinition;
