import type { CardDefinition } from '../types';

export default {
  id: "rear-resist", kind: 'card', name: "Tail Cushion",
  description: "Rear impacts cause 25% less damage.",
  rarity: "uncommon", price: 16, icon: "◒", color: "#ebbaa5",
  modify(m, potency) { m.rearDamage *= Math.pow(0.75, potency); },
} satisfies CardDefinition;
