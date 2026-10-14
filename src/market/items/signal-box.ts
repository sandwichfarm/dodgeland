import type { CardDefinition } from '../types';

export default {
  id: 'signal-box', kind: 'card', name: 'Signal Box',
  description: 'Traffic moves 4% slower. New rails warn 0.3 seconds earlier.',
  rarity: 'uncommon', price: 16, icon: '⊡', color: '#ddb6a2',
  modify(m, potency) { m.trafficSpeed *= Math.pow(.96, potency); m.trainWarning += .3 * potency; },
} satisfies CardDefinition;
