import type { CardDefinition } from '../types';

export default {
  id: 'steady-steps', kind: 'card', name: 'Steady Steps',
  description: 'Invulnerability after damage lasts 20% longer. New rails warn 0.25 seconds earlier.',
  rarity: 'rare', price: 24, icon: '⋰', color: '#c8c3e5',
  modify(m, potency) { m.hurtRecovery += .2 * potency; m.trainWarning += .25 * potency; },
} satisfies CardDefinition;
