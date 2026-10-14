import type { CardDefinition } from '../types';

export default {
  id: "mob-speed", kind: 'card', modes: ['arcade'], name: "Heavy Paws",
  description: "Chasing mobs move 14% slower.",
  rarity: "uncommon", price: 16, icon: "♟", color: "#d0c3a2",
  modify(m, potency) { m.mobSpeed *= Math.pow(0.86, potency); },
} satisfies CardDefinition;
