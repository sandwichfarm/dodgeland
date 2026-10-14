import type { CardDefinition } from '../types';

export default {
  id: "mob-spawn-delay", kind: 'card', modes: ['arcade'], name: "Quiet Footsteps",
  description: "Pursuers arrive 1.5 seconds farther apart.",
  rarity: "rare", price: 24, icon: "·", color: "#b5d7ad",
  modify(m, potency) { m.mobSpawnDelay += 1.5 * potency; },
} satisfies CardDefinition;
