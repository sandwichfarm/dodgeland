import type { CardDefinition } from '../types';

export default {
  id: 'long-haul', kind: 'card', name: 'Long Haul',
  description: 'Earn 3 coins per new 100 points. Trains on new rails arrive 5% farther apart.',
  rarity: 'rare', price: 24, icon: '⇥', color: '#d4b77d',
  modify(m, potency) { m.trainPeriod += .05 * potency; },
  scoreCoins({ previous, score }, potency) { return Math.max(0, Math.floor(score / 100) - Math.floor(previous / 100)) * 3 * potency; },
} satisfies CardDefinition;
