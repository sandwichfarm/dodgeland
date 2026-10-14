import type { CardDefinition } from '../types';

export default {
  id: 'rest-stop', kind: 'card', name: 'Rest Stop',
  description: 'Recover an extra eighth feather per new 100 points. Clear 5% of blocking scenery on new meadows.',
  rarity: 'uncommon', price: 16, icon: '⌂', color: '#b6d6ae',
  modify(m, potency) { m.regenBonus += .125 * potency; m.sceneryClear += .05 * potency; },
} satisfies CardDefinition;
