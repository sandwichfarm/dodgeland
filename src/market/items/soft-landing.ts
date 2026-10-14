import type { CardDefinition } from '../types';

export default {
  id: 'soft-landing', kind: 'card', name: 'Soft Landing',
  description: 'Rear impacts cause 12% less damage and side impacts cause 10% less.',
  rarity: 'rare', price: 24, icon: '◡', color: '#e7bcc9',
  modify(m, potency) { m.rearDamage *= Math.pow(.88, potency); m.sideDamage *= Math.pow(.9, potency); },
} satisfies CardDefinition;
