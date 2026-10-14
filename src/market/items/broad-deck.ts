import type { CardDefinition } from '../types';

export default {
  id: 'broad-deck', kind: 'card', name: 'Broad Deck',
  description: 'New stream platforms are 12% longer. All platforms drift 6% slower.',
  rarity: 'uncommon', price: 16, icon: '▱', color: '#9ecbb7',
  modify(m, potency) { m.platformLength += .12 * potency; m.riverSpeed *= Math.pow(.94, potency); },
} satisfies CardDefinition;
