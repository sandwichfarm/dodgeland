import type { CardDefinition } from '../types';

export default {
  id: 'treasure-map', kind: 'card', name: 'Treasure Map',
  description: 'New lanes gain 5 percentage points of coin chance. Clear 10% of blocking scenery on new meadows.',
  rarity: 'rare', price: 24, icon: '⌖', color: '#dfc98a',
  modify(m, potency) { m.coinChance += .05 * potency; m.sceneryClear += .1 * potency; },
} satisfies CardDefinition;
