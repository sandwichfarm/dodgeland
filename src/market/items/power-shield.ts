import type { PowerDefinition } from '../types';

export default {
  id: "power-shield", kind: 'power', name: "Bubble Wrap",
  description: "Ignore damage for 8 active seconds.",
  rarity: "rare", price: 20, icon: "◉", color: "#9eddeb", duration: 8,
  modify(m) { m.shield = 1; },
} satisfies PowerDefinition;
