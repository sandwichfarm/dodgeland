import type { CardDefinition } from '../types';

export default {
  id: "mob-recovery", kind: 'card', modes: ['arcade'], name: "Sleepy Hunters",
  description: "Crabs and wasps rest 30% longer after a strike.",
  rarity: "common", price: 12, icon: "☾", color: "#b0b5e7",
  modify(m, potency) { m.mobRecovery += 0.3 * potency; },
} satisfies CardDefinition;
