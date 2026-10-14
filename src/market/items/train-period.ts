import type { CardDefinition } from '../types';

export default {
  id: "train-period", kind: 'card', name: "Late Train",
  description: "Trains on new rails arrive 15% farther apart.",
  rarity: "rare", price: 24, icon: "▤", color: "#b7badf",
  modify(m, potency) { m.trainPeriod += 0.15 * potency; },
} satisfies CardDefinition;
