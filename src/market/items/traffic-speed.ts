import type { CardDefinition } from '../types';

export default {
  id: "traffic-speed", kind: 'card', name: "School Zone",
  description: "Traffic moves 12% slower immediately.",
  rarity: "common", price: 12, icon: "◴", color: "#eda88b",
  modify(m, potency) { m.trafficSpeed *= Math.pow(0.88, potency); },
} satisfies CardDefinition;
