import type { CardDefinition } from '../types';

export default {
  id: 'patient-paws', kind: 'card', modes: ['arcade'], name: 'Patient Paws',
  description: 'Crabs and wasps prepare strikes 12% longer and rest 15% longer afterward.',
  rarity: 'common', price: 12, icon: '♧', color: '#c5b6d9',
  modify(m, potency) { m.mobWindup += .12 * potency; m.mobRecovery += .15 * potency; },
} satisfies CardDefinition;
