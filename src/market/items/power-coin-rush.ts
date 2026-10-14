import type { PowerDefinition } from '../types';

export default {
  id: "power-coin-rush", kind: 'power', name: "Gold Rush",
  description: "Stronger coin pull and 50% more earnings for 8 active seconds.",
  rarity: "rare", price: 16, icon: "✺", color: "#f4d775", duration: 8,
  modify(m, potency) { m.coinRadius += 1.25 * potency; m.coinMultiplier *= 1.5 ** potency; },
} satisfies PowerDefinition;
