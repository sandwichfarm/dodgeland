import type { CardDefinition } from '../types';

export default {
  id: 'false-trail', kind: 'card', modes: ['arcade'], name: 'False Trail',
  description: 'Mobs move 8% slower, the wave moves 5% slower, and crabs and wasps rest 10% longer after strikes.',
  rarity: 'epic', price: 36, icon: '↝', color: '#a7c7c7',
  modify(m, potency) { m.mobSpeed *= Math.pow(.92, potency); m.waveSpeed *= Math.pow(.95, potency); m.mobRecovery += .1 * potency; },
} satisfies CardDefinition;
