import type { CardDefinition } from '../types';

export default {
  id: 'river-toll', kind: 'card', name: 'River Toll',
  description: 'Stream pickups grant an extra half coin. New streams gain platform coins and 10% longer platforms.',
  rarity: 'rare', price: 24, icon: '≏', color: '#88cfc5',
  modify(m, potency) { m.riverCoinBonus += .5 * potency; m.platformLength += .1 * potency; },
} satisfies CardDefinition;
