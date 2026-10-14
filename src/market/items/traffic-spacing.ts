import type { CardDefinition } from '../types';

export default {
  id: "traffic-spacing", kind: 'card', name: "Wide Gaps",
  description: "New roads have 12% more space between vehicles.",
  rarity: "uncommon", price: 16, icon: "↔", color: "#eeb99c",
  modify(m, potency) { m.trafficSpacing += 0.12 * potency; },
} satisfies CardDefinition;
