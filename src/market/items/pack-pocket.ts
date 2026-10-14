import type { PackDefinition } from '../types';

export default {
  id: "pack-pocket", kind: 'pack', name: "Small Pack",
  description: "Reveal 3 different cards. Choose 1 to keep.",
  rarity: "common", price: 16, icon: '▣', color: "#b8d9a4",
  draws: 3, picks: 1,
} satisfies PackDefinition;
