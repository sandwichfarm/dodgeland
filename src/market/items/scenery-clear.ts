import type { CardDefinition } from '../types';

export default {
  id: "scenery-clear", kind: 'card', name: "Garden Path",
  description: "Remove 15% of blocking scenery on new meadows.",
  rarity: "common", price: 12, icon: "♣", color: "#a1d48e",
  modify(m, potency) { m.sceneryClear += 0.15 * potency; },
} satisfies CardDefinition;
