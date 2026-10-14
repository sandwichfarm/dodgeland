import type { CardDefinition } from '../types';

export default {
  id: "mob-windup", kind: 'card', modes: ['arcade'], name: "Read the Pounce",
  description: "Crabs and wasps take 25% longer to prepare a strike.",
  rarity: "rare", price: 24, icon: "◷", color: "#cca9da",
  modify(m, potency) { m.mobWindup += 0.25 * potency; },
} satisfies CardDefinition;
