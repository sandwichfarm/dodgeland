import type { CardDefinition } from '../types';

export default {
  id: "hurt-recovery", kind: 'card', name: "Second Wind",
  description: "Invulnerability after damage lasts 30% longer.",
  rarity: "uncommon", price: 16, icon: "◇", color: "#b4deb0",
  modify(m, potency) { m.hurtRecovery += 0.3 * potency; },
} satisfies CardDefinition;
