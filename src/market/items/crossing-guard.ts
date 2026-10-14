import type { CardDefinition } from '../types';

export default {
  id: 'crossing-guard', kind: 'card', name: 'Crossing Guard',
  description: 'Traffic moves 6% slower. New roads have 6% more space between vehicles.',
  rarity: 'uncommon', price: 16, icon: '⊣', color: '#e7ae86',
  modify(m, potency) { m.trafficSpeed *= Math.pow(.94, potency); m.trafficSpacing += .06 * potency; },
} satisfies CardDefinition;
