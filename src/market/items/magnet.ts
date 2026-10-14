import type { CardDefinition } from '../types';

export default {
  id: "magnet", kind: 'card', name: "Pocket Magnet",
  description: "Nearby coins pull in from 0.75 extra tiles.",
  rarity: "common", price: 12, icon: "◎", color: "#f6d777",
  modify(m, potency) { m.coinRadius += 0.75 * potency; },
} satisfies CardDefinition;
