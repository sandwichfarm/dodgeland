import type { CardDefinition } from '../types';

export default {
  id: "coin-multiplier", kind: 'card', name: "Compound Interest",
  description: "All earned coins gain +12.5%; fractional coins carry forward.",
  rarity: "uncommon", price: 16, icon: "×", color: "#f1cc5a",
  modify(m, potency) { m.coinMultiplier += 0.125 * potency; },
} satisfies CardDefinition;
