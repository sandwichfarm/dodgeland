import type { CardDefinition } from '../types';

export default {
  id: 'dry-route', kind: 'card', name: 'Dry Route',
  description: 'Clear 8% of blocking scenery on new meadows. Trains on new rails arrive 5% farther apart.',
  rarity: 'common', price: 12, icon: '⌁', color: '#b9cc95',
  modify(m, potency) { m.sceneryClear += .08 * potency; m.trainPeriod += .05 * potency; },
} satisfies CardDefinition;
