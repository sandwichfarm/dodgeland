import type { CosmeticDefinition } from '../types';

export default {
  id: "look-trail", kind: 'cosmetic', name: "Rainbow Wake",
  description: "A trail look for this run. No collision changes.",
  rarity: 'common', price: 8, icon: "⌁", color: "#8de0d2",
  appearance: { color: "#8de0d2", style: "trail" },
} satisfies CosmeticDefinition;
