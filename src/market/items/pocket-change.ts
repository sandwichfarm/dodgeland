import type { CardDefinition } from '../types';

export default {
  id: 'pocket-change', kind: 'card', name: 'Pocket Change',
  description: 'Pull coins from 0.2 extra tiles and earn 4% more coins.',
  rarity: 'common', price: 12, icon: '◉', color: '#ebce84',
  modify(m, potency) { m.coinRadius += .2 * potency; m.coinMultiplier += .04 * potency; },
} satisfies CardDefinition;
