import type { CardDefinition } from '../types';

export default {
  id: 'ballast', kind: 'card', name: 'Ballast',
  description: 'Carry 1 fewer card. Rear hits hurt 20% less, side hits 15% less, and new stream platforms are 10% longer.',
  rarity: 'rare', price: 24, icon: '▼', color: '#b6c3d1',
  modify(m, potency) { m.cardSlots -= potency; m.rearDamage *= Math.pow(.8, potency); m.sideDamage *= Math.pow(.85, potency); m.platformLength += .1 * potency; },
} satisfies CardDefinition;
