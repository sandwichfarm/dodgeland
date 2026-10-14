import type { CardDefinition } from '../types';

export default {
  id: 'watchful-eye', kind: 'card', modes: ['arcade'], name: 'Watchful Eye',
  description: 'Crabs and wasps prepare strikes 15% longer. New rails warn 0.3 seconds earlier.',
  rarity: 'rare', price: 24, icon: '◉', color: '#c6b6df',
  modify(m, potency) { m.mobWindup += .15 * potency; m.trainWarning += .3 * potency; },
} satisfies CardDefinition;
