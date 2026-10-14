import type { CardDefinition } from '../types';

export default {
  id: "platform-length", kind: 'card', name: "Longboats",
  description: "Platforms on new streams are 20% longer.",
  rarity: "uncommon", price: 16, icon: "▱", color: "#7dc8b3",
  modify(m, potency) { m.platformLength += 0.2 * potency; },
} satisfies CardDefinition;
