import type { CardDefinition } from '../types';

export default {
  id: 'service-road', kind: 'card', name: 'Service Road',
  description: 'New roads have 8% more space between vehicles. Clear 10% of blocking scenery on new meadows.',
  rarity: 'uncommon', price: 16, icon: '⊥', color: '#b1c697',
  modify(m, potency) { m.trafficSpacing += .08 * potency; m.sceneryClear += .1 * potency; },
} satisfies CardDefinition;
