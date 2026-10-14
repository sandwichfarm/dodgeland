import type { CardDefinition } from '../types';

export default {
  id: 'reed-bed', kind: 'card', modes: ['arcade'], name: 'Reed Bed',
  description: 'The wave moves 4% slower. Mobs arrive 0.75 seconds farther apart.',
  rarity: 'rare', price: 24, icon: '♒', color: '#9cc7b1',
  modify(m, potency) { m.waveSpeed *= Math.pow(.96, potency); m.mobSpawnDelay += .75 * potency; },
} satisfies CardDefinition;
