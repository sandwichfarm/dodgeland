import type { CardDefinition } from '../types';

export default {
  id: "wave-trail", kind: 'card', modes: ['arcade'], name: "Breathing Room",
  description: "Hold the wave one extra row behind your best position.",
  rarity: "epic", price: 36, icon: "↟", color: "#b1dbe4",
  modify(m, potency) { m.waveTrail += potency; },
} satisfies CardDefinition;
