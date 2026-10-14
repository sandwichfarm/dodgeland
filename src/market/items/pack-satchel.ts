import type { PackDefinition } from '../types';

export default {
  id: "pack-satchel", kind: 'pack', name: "Large Pack",
  description: "Reveal 5 different cards. Choose 1; a 20% bonus chance lets you choose 2.",
  rarity: "uncommon", price: 24, icon: '▣', color: "#93cedd",
  draws: 5, picks: 1, bonus: { chance: .2, picks: 2 },
} satisfies PackDefinition;
