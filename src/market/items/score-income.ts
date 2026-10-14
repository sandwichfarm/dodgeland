import type { CardDefinition } from '../types';

export default {
  id: "score-income", kind: 'card', name: "Mile Money",
  description: "Earn 1 coin for each new 25 points scored.",
  rarity: "rare", price: 24, icon: "＋", color: "#edcc6e",
  scoreCoins({ previous, score }, potency) { return (Math.floor(score / 25) - Math.floor(previous / 25)) * potency; },
} satisfies CardDefinition;
