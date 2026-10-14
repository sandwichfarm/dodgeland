import type { CardDefinition } from '../types';

export default {
  id: 'field-pack', kind: 'card', name: 'Field Pack',
  description: '+1 hand slot, occupied by this card. Clear 8% of blocking scenery on new meadows.',
  rarity: 'rare', price: 24, icon: '⊞', color: '#c2ca9b',
  modify(m, potency) { m.cardSlots += potency; m.sceneryClear += .08 * potency; },
} satisfies CardDefinition;
