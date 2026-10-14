import type { CosmeticDefinition } from '../types';

export default {
  id: "look-sparkles", kind: 'cosmetic', name: "Stardust",
  description: "A sparkles look for this run. No collision changes.",
  rarity: 'common', price: 8, icon: "✦", color: "#edb4ef",
  appearance: { color: "#edb4ef", style: "sparkles" },
} satisfies CosmeticDefinition;
