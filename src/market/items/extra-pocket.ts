import type { CardDefinition } from '../types';

export default {
  id: 'extra-pocket', kind: 'card', name: 'Extra Pocket',
  description: '+2 hand slots. This card uses one, leaving room for one extra ability.',
  rarity: 'rare', price: 24, icon: '⊞', color: '#b5d8a2',
  modify(m, potency) { m.cardSlots += 2 * potency; },
} satisfies CardDefinition;
