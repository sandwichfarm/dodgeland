/** Pure item contract. New items belong in one module; no runtime ID switches. */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export interface RunModifiers {
  coinRadius: number; coinMultiplier: number; roadCoinBonus: number; riverCoinBonus: number;
  trafficSpeed: number; trafficSpacing: number; riverSpeed: number; platformLength: number;
  trainPeriod: number; trainWarning: number; rearDamage: number; sideDamage: number;
  hurtRecovery: number; regenBonus: number; waveSpeed: number; waveTrail: number;
  mobSpeed: number; mobWindup: number; mobRecovery: number; mobSpawnDelay: number;
  coinChance: number; sceneryClear: number; shield: number; cardSlots: number;
}
export interface ScoreEvent { previous: number; score: number }
export interface ItemBehavior {
  modify?: (modifiers: RunModifiers, potency: number) => void;
  /** Return run coin income only for newly crossed score thresholds. */
  scoreCoins?: (event: ScoreEvent, potency: number) => number;
}
interface ItemBase { id: string; name: string; description: string; rarity: Rarity; price: number; icon: string; color: string; modes?: readonly ('arcade' | 'stroll')[] }
export interface CardDefinition extends ItemBase, ItemBehavior { kind: 'card' }
export interface PowerDefinition extends ItemBase, ItemBehavior { kind: 'power'; duration: number }
export type CosmeticSlot = 'head' | 'shirt' | 'effect';
/** Wearable coordinates are relative to the traveler's head or torso, in unit bounds. */
export interface WearableVoxel { x: number; y: number; z: number; w: number; d: number; h: number; color: string }
export type CosmeticAppearance =
  | { color: string; style: 'halo' | 'sparkles' | 'trail' }
  | { color: string; style: 'hat' | 'shirt'; model: readonly WearableVoxel[] };
export interface CosmeticDefinition extends ItemBase { kind: 'cosmetic'; appearance: CosmeticAppearance }
export interface PackDefinition extends ItemBase {
  kind: 'pack'; draws: number; picks: number;
  bonus?: { chance: number; picks: number };
  minimumRarity?: Rarity;
}
export type ItemDefinition = CardDefinition | PowerDefinition | CosmeticDefinition | PackDefinition;
export interface CardComponent { itemId: string; potency: number }
export interface HeldCard { id: string; name: string; rarity: Rarity; icon: string; color: string; description: string; components: CardComponent[]; saleValue: number }
/** Paid, immutable choices for one pack; only claimed cards enter the inventory. */
export interface PackDraft { id: string; packId: string; name: string; choices: HeldCard[]; picks: number; bonus: boolean }
/** Read-only result for choosing pack cards and optionally replacing held cards. */
export interface PackPreview { count: number; capacity: number; valid: boolean; message: string }
export interface ActivePower { id: string; itemId: string; remaining: number }
export interface MarketOffer { id: string; itemId: string; price: number; sold: boolean; section?: 'cards' | 'rare' | 'extras' }
export interface MarketWindow { milestone: number; remaining: number; offers: MarketOffer[] }
export interface MarketResult { ok: boolean; message: string; cards?: HeldCard[] }
