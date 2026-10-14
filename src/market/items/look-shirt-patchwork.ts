import type { CosmeticDefinition } from '../types';
export default {
  id: 'look-shirt-patchwork', kind: 'cosmetic', name: 'Patchwork Jumper',
  description: 'A moss knit with chunky lavender and honey patches, stitched on every side.',
  rarity: 'uncommon', price: 16, icon: '▦', color: '#88a582',
  appearance: { style: 'shirt', color: '#88a582', model: [
    { x: -.25, y: -.52, z: .43, w: .43, d: .04, h: .43, color: '#b29ab9' },
    { x: .25, y: -.52, z: .08, w: .42, d: .04, h: .34, color: '#e0bc76' },
    { x: -.20, y: .52, z: .16, w: .50, d: .04, h: .47, color: '#e0bc76' },
    { x: .52, y: .14, z: .42, w: .04, d: .45, h: .40, color: '#b29ab9' },
    { x: -.52, y: -.13, z: .30, w: .04, d: .43, h: .35, color: '#d8957a' },
    ...[-.40, -.25, -.10].map(x => ({ x, y: -.55, z: .77, w: .035, d: .03, h: .13, color: '#f2e5bf' })),
    { x: 0, y: 0, z: 1.004, w: .64, d: .72, h: .04, color: '#6f8b6d' },
  ] },
} satisfies CosmeticDefinition;
