import type { CardDefinition } from '../types';

export default {
  id: 'stepping-stones', kind: 'card', name: 'Stepping Stones',
  description: 'Earn 1 coin per new 40 points. Clear 5% of blocking scenery on new meadows.',
  rarity: 'common', price: 12, icon: '∴', color: '#c4cca9',
  modify(m, potency) { m.sceneryClear += .05 * potency; },
  scoreCoins({ previous, score }, potency) { return Math.max(0, Math.floor(score / 40) - Math.floor(previous / 40)) * potency; },
} satisfies CardDefinition;
