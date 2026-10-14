import type { CardDefinition } from '../types';

export default {
  id: "coin-chance", kind: 'card', name: "Lucky Lanes",
  description: "New lanes gain an 8 percentage point coin chance, including platforms.",
  rarity: "epic", price: 36, icon: "✧", color: "#f1db88",
  modify(m, potency) { m.coinChance += 0.08 * potency; },
} satisfies CardDefinition;
