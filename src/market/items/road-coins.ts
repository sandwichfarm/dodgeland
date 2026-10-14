import type { CardDefinition } from '../types';

export default {
  id: "road-coins", kind: 'card', name: "Road Toll",
  description: "Collected coins are worth +1 while you are on a road.",
  rarity: "common", price: 12, icon: "▰", color: "#e8c879",
  modify(m, potency) { m.roadCoinBonus += potency; },
} satisfies CardDefinition;
