import type { CardDefinition } from '../types';

export default {
  id: 'first-aid', kind: 'card', name: 'First Aid',
  description: 'Recover an extra eighth feather per new 100 points. Invulnerability after damage lasts 15% longer.',
  rarity: 'rare', price: 24, icon: '✚', color: '#edb4b8',
  modify(m, potency) { m.regenBonus += .125 * potency; m.hurtRecovery += .15 * potency; },
} satisfies CardDefinition;
