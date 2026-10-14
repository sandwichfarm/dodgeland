import type { CardDefinition } from '../types';

export default {
  id: 'ferry-ticket', kind: 'card', name: 'Ferry Ticket',
  description: 'Platforms drift 6% slower. Earn 2 coins per new 75 points.',
  rarity: 'rare', price: 24, icon: '▭', color: '#9bd0d8',
  modify(m, potency) { m.riverSpeed *= Math.pow(.94, potency); },
  scoreCoins({ previous, score }, potency) { return Math.max(0, Math.floor(score / 75) - Math.floor(previous / 75)) * 2 * potency; },
} satisfies CardDefinition;
