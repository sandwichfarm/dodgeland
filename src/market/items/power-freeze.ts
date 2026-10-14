import type { PowerDefinition } from '../types';

export default {
  id: "power-freeze", kind: 'power', name: "Stoplight",
  description: "Freeze traffic and chasing mobs for 10 active seconds.",
  rarity: "rare", price: 20, icon: "Ⅱ", color: "#95bee8", duration: 10,
  modify(m) { m.trafficSpeed = 0; m.mobSpeed = 0; },
} satisfies PowerDefinition;
