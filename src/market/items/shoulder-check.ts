import type { CardDefinition } from '../types';

export default {
  id: 'shoulder-check', kind: 'card', name: 'Shoulder Check',
  description: 'Side impacts cause 10% less damage. New rails warn 0.2 seconds earlier.',
  rarity: 'uncommon', price: 16, icon: '◑', color: '#d6b3ce',
  modify(m, potency) { m.sideDamage *= Math.pow(.9, potency); m.trainWarning += .2 * potency; },
} satisfies CardDefinition;
