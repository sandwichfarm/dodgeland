import type { CardDefinition } from '../types';

export default {
  id: "side-resist", kind: 'card', name: "Side Padding",
  description: "Side impacts cause 20% less damage.",
  rarity: "rare", price: 24, icon: "◐", color: "#e8a89e",
  modify(m, potency) { m.sideDamage *= Math.pow(0.8, potency); },
} satisfies CardDefinition;
