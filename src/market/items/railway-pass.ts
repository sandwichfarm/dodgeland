import type { CardDefinition } from '../types';

export default {
  id: 'railway-pass', kind: 'card', name: 'Railway Pass',
  description: 'New rails warn 0.3 seconds earlier, with 10% more time between trains.',
  rarity: 'rare', price: 24, icon: '⊟', color: '#c3b8df',
  modify(m, potency) { m.trainWarning += .3 * potency; m.trainPeriod += .1 * potency; },
} satisfies CardDefinition;
