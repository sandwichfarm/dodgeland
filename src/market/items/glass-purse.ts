import type { CardDefinition } from '../types';

export default {
  id: 'glass-purse', kind: 'card', name: 'Glass Purse',
  description: 'Carry 1 fewer card. Earn 25% more coins, +1 coin per new 50 points, and +6 percentage points of coin chance on new lanes.',
  rarity: 'legendary', price: 48, icon: '◇', color: '#e7d38e',
  modify(m, potency) { m.cardSlots -= potency; m.coinMultiplier += .25 * potency; m.coinChance += .06 * potency; },
  scoreCoins({ previous, score }, potency) { return Math.max(0, Math.floor(score / 50) - Math.floor(previous / 50)) * potency; },
} satisfies CardDefinition;
