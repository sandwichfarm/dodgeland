import type { CardDefinition } from '../types';

export default {
  id: 'decoy-trail', kind: 'card', modes: ['arcade'], name: 'Decoy Trail',
  description: 'Mobs move 6% slower and arrive 0.6 seconds farther apart.',
  rarity: 'uncommon', price: 16, icon: '⋯', color: '#c1ce9e',
  modify(m, potency) { m.mobSpeed *= Math.pow(.94, potency); m.mobSpawnDelay += .6 * potency; },
} satisfies CardDefinition;
