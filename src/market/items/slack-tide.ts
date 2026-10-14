import type { CardDefinition } from '../types';

export default {
  id: 'slack-tide', kind: 'card', modes: ['arcade'], name: 'Slack Tide',
  description: 'Hold the wave half a row farther behind. Platforms drift 8% slower.',
  rarity: 'epic', price: 36, icon: '≋', color: '#8fcbd7',
  modify(m, potency) { m.waveTrail += .5 * potency; m.riverSpeed *= Math.pow(.92, potency); },
} satisfies CardDefinition;
