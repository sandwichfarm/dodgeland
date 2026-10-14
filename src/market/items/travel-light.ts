import type { CardDefinition } from '../types';

export default {
  id: 'travel-light', kind: 'card', name: 'Travel Light',
  description: 'Earn 25% more coins, but carry 1 fewer card. This card uses one slot.',
  rarity: 'rare', price: 24, icon: '↟', color: '#edca83',
  modify(m, potency) { m.cardSlots -= potency; m.coinMultiplier += .25 * potency; },
} satisfies CardDefinition;
