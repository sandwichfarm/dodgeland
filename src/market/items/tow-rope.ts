import type { CardDefinition } from '../types';

export default {
  id: 'tow-rope', kind: 'card', name: 'Tow Rope',
  description: 'Platforms drift 7% slower. Pull coins from 0.2 extra tiles.',
  rarity: 'common', price: 12, icon: '∿', color: '#b9cba7',
  modify(m, potency) { m.riverSpeed *= Math.pow(.93, potency); m.coinRadius += .2 * potency; },
} satisfies CardDefinition;
