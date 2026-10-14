import type { CardDefinition } from '../types';

export default {
  id: 'toll-pouch', kind: 'card', name: 'Toll Pouch',
  description: 'Road pickups grant an extra half coin. Earn 1 coin per new 50 points.',
  rarity: 'uncommon', price: 16, icon: '▣', color: '#e0b87e',
  modify(m, potency) { m.roadCoinBonus += .5 * potency; },
  scoreCoins({ previous, score }, potency) { return Math.max(0, Math.floor(score / 50) - Math.floor(previous / 50)) * potency; },
} satisfies CardDefinition;
