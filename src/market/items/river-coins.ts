import type { CardDefinition } from '../types';

export default {
  id: "river-coins", kind: 'card', name: "River Gold",
  description: "Stream pickups grant +1 coin; adds platform coins on new lanes.",
  rarity: "uncommon", price: 16, icon: "≈", color: "#82d9df",
  modify(m, potency) { m.riverCoinBonus += potency; },
} satisfies CardDefinition;
