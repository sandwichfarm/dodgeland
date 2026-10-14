import type { CardDefinition } from '../types';

export default {
  id: 'padded-tail', kind: 'card', name: 'Padded Tail',
  description: 'Rear impacts cause 12% less damage. Invulnerability after damage lasts 10% longer.',
  rarity: 'common', price: 12, icon: '◔', color: '#e2b5ad',
  modify(m, potency) { m.rearDamage *= Math.pow(.88, potency); m.hurtRecovery += .1 * potency; },
} satisfies CardDefinition;
