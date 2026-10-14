import type { CosmeticDefinition } from '../types';

export default {
  id: "look-halo", kind: 'cosmetic', name: "Golden Halo",
  description: "A halo look for this run. No collision changes.",
  rarity: 'common', price: 8, icon: "◌", color: "#f4d377",
  appearance: { color: "#f4d377", style: "halo" },
} satisfies CosmeticDefinition;
