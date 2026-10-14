import type { CardDefinition } from '../types';

export default {
  id: "regen-bonus", kind: 'card', name: "Fresh Feathers",
  description: "Recover another quarter feather at each new 100 points.",
  rarity: "epic", price: 36, icon: "♥", color: "#f1b3c7",
  modify(m, potency) { m.regenBonus += 0.25 * potency; },
} satisfies CardDefinition;
