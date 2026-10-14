import type { CardDefinition } from '../types';

export default {
  id: "wave-speed", kind: 'card', modes: ['arcade'], name: "Low Tide",
  description: "The pursuing wave moves 12% slower.",
  rarity: "legendary", price: 48, icon: "≋", color: "#7bd4d0",
  modify(m, potency) { m.waveSpeed *= Math.pow(0.88, potency); },
} satisfies CardDefinition;
