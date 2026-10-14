import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-hat-garden', kind: 'cosmetic', name: 'Daisy Bucket',
  description: 'A soft lilac bucket hat with a broad daisy stitched to the brim.',
  rarity: 'common', price: 12, icon: '✿', color: '#a091b9',
  appearance: { style: 'hat', color: '#a091b9', model: [
    { x: 0, y: 0, z: 0, w: 1.30, d: 1.24, h: .13, color: '#a091b9' },
    { x: 0, y: 0, z: .13, w: 1.04, d: 1.00, h: .24, color: '#b6a7cb' },
    { x: 0, y: .01, z: .37, w: .88, d: .86, h: .09, color: '#cabbd9' },
    { x: -.26, y: -.52, z: .15, w: .29, d: .05, h: .10, color: '#fff1cf' },
    { x: -.26, y: -.52, z: .05, w: .10, d: .05, h: .29, color: '#fff1cf' },
    { x: -.26, y: -.56, z: .15, w: .10, d: .03, h: .10, color: '#e5b957' },
  ] },
} satisfies CosmeticDefinition;
