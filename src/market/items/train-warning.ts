import type { CardDefinition } from '../types';

export default {
  id: "train-warning", kind: 'card', name: "Early Bell",
  description: "New rails warn 0.4 seconds earlier.",
  rarity: "common", price: 12, icon: "♧", color: "#d6c6ee",
  modify(m, potency) { m.trainWarning += 0.4 * potency; },
} satisfies CardDefinition;
