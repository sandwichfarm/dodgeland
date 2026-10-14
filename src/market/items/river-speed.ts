import type { CardDefinition } from '../types';

export default {
  id: "river-speed", kind: 'card', name: "Gentle Current",
  description: "Platforms drift 15% slower immediately.",
  rarity: "common", price: 12, icon: "≋", color: "#8acbdf",
  modify(m, potency) { m.riverSpeed *= Math.pow(0.85, potency); },
} satisfies CardDefinition;
