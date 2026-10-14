import type { CardDefinition } from '../types';

export default {
  id: 'river-dividend', kind: 'card', name: 'River Dividend',
  description: 'Stream pickups grant an extra half coin. Add platform coins and +2 percentage points of coin chance on new lanes.',
  rarity: 'uncommon', price: 16, icon: '≈', color: '#93d6cc',
  modify(m, potency) { m.riverCoinBonus += .5 * potency; m.coinChance += .02 * potency; },
} satisfies CardDefinition;
