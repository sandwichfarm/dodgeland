import type {
  ActivePower, CardComponent, CardDefinition, CosmeticDefinition, CosmeticSlot, HeldCard,
  ItemDefinition, MarketOffer, MarketResult, MarketWindow, PackDraft, PackPreview, Rarity, RunModifiers,
} from './types';
import type { EconomyRules } from '../mode-rules';

export const RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const DEFAULT_CARD_CAPACITY = 3;
export const INVENTORY_LIMIT = 6;
export const MAX_PACK_DRAWS = 48;
/** Extends the half-tile capture reach to cover every river-shifted hop grid. */
export const DEFAULT_COIN_GRAVITY = .1;
const WEIGHTS: Record<Rarity, number> = { common: 50, uncommon: 28, rare: 14, epic: 6, legendary: 2 };

export function cosmeticSlot(item: CosmeticDefinition): CosmeticSlot {
  return item.appearance.style === 'hat' ? 'head' : item.appearance.style === 'shirt' ? 'shirt' : 'effect';
}

/** Baseline coin pull is always available; cards add to these starting effects. */
export function defaultModifiers(baseCoinGravity = DEFAULT_COIN_GRAVITY): RunModifiers {
  return {
    coinRadius: baseCoinGravity, coinMultiplier: 1, roadCoinBonus: 0, riverCoinBonus: 0,
    trafficSpeed: 1, trafficSpacing: 1, riverSpeed: 1, platformLength: 1,
    trainPeriod: 1, trainWarning: 0, rearDamage: 1, sideDamage: 1,
    hurtRecovery: 1, regenBonus: 0, waveSpeed: 1, waveTrail: 0,
    mobSpeed: 1, mobWindup: 1, mobRecovery: 1, mobSpawnDelay: 0,
    coinChance: 0, sceneryClear: 0, shield: 0, cardSlots: 0,
  };
}

/** Global safety limits belong to the adapter, never to a list of special item IDs. */
const BOUNDS: Record<keyof RunModifiers, readonly [number, number]> = {
  coinRadius: [0, 1.25], coinMultiplier: [1, 2], roadCoinBonus: [0, 1], riverCoinBonus: [0, 1],
  trafficSpeed: [0, 1], trafficSpacing: [1, 1.6], riverSpeed: [0.25, 1], platformLength: [1, 1.5],
  trainPeriod: [1, 3], trainWarning: [0, 3], rearDamage: [0.5, 1], sideDamage: [0.5, 1],
  hurtRecovery: [1, 1.75], regenBonus: [0, 0.5], waveSpeed: [0.75, 1], waveTrail: [0, 2],
  mobSpeed: [0, 1], mobWindup: [1, 3], mobRecovery: [1, 3], mobSpawnDelay: [0, 12],
  coinChance: [0, 0.6], sceneryClear: [0, 0.85], shield: [0, 1], cardSlots: [-2, 3],
};

export function reduceItems(
  catalog: ReadonlyMap<string, ItemDefinition>, components: readonly CardComponent[], powers: readonly ActivePower[] = [], baseCoinGravity = DEFAULT_COIN_GRAVITY,
): RunModifiers {
  const result = defaultModifiers(baseCoinGravity);
  for (const component of components) {
    const item = catalog.get(component.itemId);
    if (item?.kind === 'card' && Number.isFinite(component.potency) && component.potency > 0) item.modify?.(result, component.potency);
  }
  // Permanent cards can slow pursuit but never stop it. Timed powers may
  // intentionally freeze actors; apply those after the permanent-card floors.
  result.trafficSpeed = Math.max(.65, result.trafficSpeed);
  result.mobSpeed = Math.max(.65, result.mobSpeed);
  for (const power of powers) {
    const item = catalog.get(power.itemId);
    if (item?.kind === 'power' && power.remaining > 0) item.modify?.(result, 1);
  }
  for (const key of Object.keys(BOUNDS) as (keyof RunModifiers)[]) {
    const [low, high] = BOUNDS[key];
    result[key] = Number.isFinite(result[key]) ? Math.max(low, Math.min(high, result[key])) : defaultModifiers(baseCoinGravity)[key];
  }
  return result;
}

/** Public direct construction keeps the released economy unless Game supplies rules. */
export type RunEconomyPolicy = Pick<EconomyRules, 'marketInterval' | 'marketWindowSeconds' | 'inventoryCapacity' | 'inventoryLimit' | 'baseCoinGravity'>;
const DEFAULT_ECONOMY_POLICY: RunEconomyPolicy = Object.freeze({
  marketInterval: 100, marketWindowSeconds: 15, inventoryCapacity: DEFAULT_CARD_CAPACITY,
  inventoryLimit: INVENTORY_LIMIT, baseCoinGravity: DEFAULT_COIN_GRAVITY,
});

/** Seeded, run-only economy. No browser, persistence, engine or Vite dependency. */
export class RunInventory {
  readonly catalog: ReadonlyMap<string, ItemDefinition>;
  wallet = 0;
  cards: HeldCard[] = [];
  powers: ActivePower[] = [];
  cosmetics: string[] = [];
  effects = defaultModifiers();
  revision = 0;
  market: MarketWindow | null = null;
  pendingPack: PackDraft | null = null;
  isOpen = false;
  alive = true;
  private fraction = 0;
  private maxScore = 0;
  private sequence = 0;
  private state: number;
  private equipped: Partial<Record<CosmeticSlot, string>> = {};

  constructor(seed: number, definitions: readonly ItemDefinition[] = [], private readonly policy: RunEconomyPolicy = DEFAULT_ECONOMY_POLICY) {
    const catalog = new Map<string, ItemDefinition>();
    for (const item of definitions) {
      if (catalog.has(item.id)) throw new Error(`Duplicate market item: ${item.id}`);
      if (!item.id || !Number.isSafeInteger(item.price) || item.price < 1 || !RARITIES.includes(item.rarity)) throw new Error('Invalid market item metadata');
      if (item.kind === 'pack') {
        if (!Number.isInteger(item.draws) || item.draws < 1 || item.draws > MAX_PACK_DRAWS) throw new Error(`Invalid pack size: ${item.id}`);
        if (!Number.isInteger(item.picks) || item.picks < 1 || item.picks > item.draws) throw new Error(`Invalid pack picks: ${item.id}`);
        if (item.bonus && (!Number.isFinite(item.bonus.chance) || item.bonus.chance < 0 || item.bonus.chance > 1
          || !Number.isInteger(item.bonus.picks) || item.bonus.picks <= item.picks || item.bonus.picks > item.draws)) throw new Error(`Invalid pack bonus: ${item.id}`);
        if (item.minimumRarity && !RARITIES.includes(item.minimumRarity)) throw new Error(`Invalid pack rarity: ${item.id}`);
      }
      if (item.kind === 'power' && (!Number.isFinite(item.duration) || item.duration <= 0)) throw new Error(`Invalid power duration: ${item.id}`);
      catalog.set(item.id, item);
    }
    this.catalog = catalog;
    this.state = (seed ^ 0x6d61726b) >>> 0;
    this.effects = reduceItems(this.catalog, [], [], this.policy.baseCoinGravity);
  }

  /** The legacy cosmetic is the equipped effect; wearable slots are independent. */
  get cosmetic(): CosmeticDefinition | undefined { return this.equippedCosmetics.find(item => cosmeticSlot(item) === 'effect'); }

  get equippedCosmetics(): CosmeticDefinition[] {
    return (['head', 'shirt', 'effect'] as const).flatMap(slot => {
      const definition = this.catalog.get(this.equipped[slot] ?? '');
      return definition?.kind === 'cosmetic' && this.cosmetics.includes(definition.id) ? [definition] : [];
    });
  }

  get cardCapacity(): number { return this.capacityFor(this.cards); }

  equipCosmetic(id: string): MarketResult {
    if (!this.canTrade()) return this.fail('Open an active market to change your look.');
    const item = this.catalog.get(id);
    if (item?.kind !== 'cosmetic' || !this.cosmetics.includes(id)) return this.fail('You do not own this look.');
    const slot = cosmeticSlot(item);
    if (this.equipped[slot] !== id) { this.equipped[slot] = id; this.revision++; }
    return { ok: true, message: `${item.name} equipped.` };
  }

  creditCoins(rawAmount: number): number {
    if (!this.alive || !Number.isFinite(rawAmount) || rawAmount <= 0) return 0;
    const total = Math.min(Number.MAX_SAFE_INTEGER - this.wallet, rawAmount + this.fraction);
    // Epsilon prevents binary fractions from delaying an exactly earned coin.
    const whole = Math.floor(total + 1e-9);
    this.fraction = Math.max(0, total - whole);
    this.wallet += whole;
    if (whole) this.revision++;
    return whole;
  }

  /** A narrow wallet primitive that commits a prevalidated companion plan with its debit. */
  spendCoins(amount: number, commit?: () => boolean): boolean {
    if (!this.alive || !Number.isSafeInteger(amount) || amount <= 0 || this.wallet < amount) return false;
    if (commit && !commit()) return false;
    this.wallet -= amount;
    this.revision++;
    return true;
  }

  /** Income is raw so the engine can apply its central coin award hook exactly once. */
  advanceScore(score: number): number {
    if (!this.alive || !Number.isFinite(score) || score <= this.maxScore) return 0;
    const previous = this.maxScore;
    this.maxScore = Math.floor(score);
    let income = 0;
    for (const component of this.cards.flatMap(card => card.components)) {
      const definition = this.catalog.get(component.itemId);
      if (definition?.kind !== 'card') continue;
      const amount = definition.scoreCoins?.({ previous, score: this.maxScore }, component.potency) ?? 0;
      if (Number.isFinite(amount) && amount > 0) income += amount;
    }
    for (const power of this.powers) {
      const definition = this.catalog.get(power.itemId);
      if (definition?.kind !== 'power' || power.remaining <= 0) continue;
      const amount = definition.scoreCoins?.({ previous, score: this.maxScore }, 1) ?? 0;
      if (Number.isFinite(amount) && amount > 0) income += amount;
    }
    const milestone = Math.floor(this.maxScore / this.policy.marketInterval) * this.policy.marketInterval;
    if (milestone > 0 && milestone > Math.floor(previous / this.policy.marketInterval) * this.policy.marketInterval) {
      this.market = { milestone, remaining: this.policy.marketWindowSeconds, offers: this.makeOffers(milestone) };
      this.revision++;
    }
    return income;
  }

  tick(dt: number): void {
    if (!this.alive || this.isOpen || this.pendingPack || !Number.isFinite(dt) || dt <= 0) return;
    if (this.market) {
      this.market.remaining = Math.max(0, this.market.remaining - dt);
      if (!this.market.remaining) { this.market = null; this.revision++; }
    }
    for (const power of this.powers) power.remaining = Math.max(0, power.remaining - dt);
    const retained = this.powers.filter(power => power.remaining > 0);
    if (retained.length !== this.powers.length) { this.powers = retained; this.changed(); }
  }

  open(): boolean {
    if (!this.alive || !this.market || this.market.remaining <= 0) return false;
    this.isOpen = true;
    this.revision++;
    return true;
  }

  close(): void { if (this.isOpen) { this.isOpen = false; this.revision++; } }

  buy(offerId: string): MarketResult {
    if (this.pendingPack) return this.fail('Choose your pack cards first.');
    if (!this.canTrade()) return this.fail('Open an active market to shop.');
    const offer = this.market!.offers.find(candidate => candidate.id === offerId);
    const item = offer && this.catalog.get(offer.itemId);
    if (!offer || !item) return this.fail('That offer is unavailable.');
    if (offer.sold) return this.fail('That offer is sold out.');
    if (this.wallet < offer.price) return this.fail(`Need ${offer.price - this.wallet} more coins.`);
    if (item.kind === 'card') {
      const capacity = this.capacityFor([...this.cards, { components: [{ itemId: item.id, potency: 1 }] }]);
      if (this.cards.length + 1 > capacity) return this.fail(`Hand full (${this.cards.length}/${capacity}). Sell a card first.`);
    }
    // Opening reveals the same seeded choices regardless of the current hand.
    // Capacity is resolved when keeping cards, by replacing held cards or skipping.
    const pool = item.kind === 'pack' ? this.cardPool(item.minimumRarity) : [];
    if (item.kind === 'pack' && pool.length < item.draws) return this.fail('This pack does not have enough different cards.');
    if (item.kind === 'cosmetic' && this.cosmetics.includes(item.id)) return this.fail('You already own this look.');

    const gained: HeldCard[] = [];
    if (item.kind === 'card') gained.push(this.hold(item));
    if (item.kind === 'pack') {
      // Validate the candidate pool before consuming any randomness or payment.
      const bonus = Boolean(item.bonus && this.random() < item.bonus.chance);
      const draft: PackDraft = { id: this.id('pack'), packId: item.id, name: item.name, choices: [], picks: bonus ? item.bonus!.picks : item.picks, bonus };
      for (let draw = 0; draw < item.draws; draw++) {
        const candidate = this.pick(pool);
        draft.choices.push(this.hold(candidate));
        pool.splice(pool.indexOf(candidate), 1);
      }
      this.pendingPack = draft;
    }
    if (item.kind === 'power') {
      const existing = this.powers.find(power => power.itemId === item.id);
      if (existing) existing.remaining = Math.max(existing.remaining, item.duration);
      else this.powers.push({ id: this.id('power'), itemId: item.id, remaining: item.duration });
    }
    if (item.kind === 'cosmetic') { this.cosmetics.push(item.id); this.equipped[cosmeticSlot(item)] = item.id; }
    this.cards.push(...gained);
    this.wallet -= offer.price;
    offer.sold = true;
    this.changed();
    const message = item.kind === 'pack' ? `${this.pendingPack!.bonus ? 'Bonus! ' : ''}Choose ${this.pendingPack!.picks} of ${item.draws} cards.` : `${item.name} equipped.`;
    return { ok: true, message, ...(gained.length ? { cards: gained } : {}) };
  }

  previewPack(ids: readonly string[], discardIds: readonly string[] = []): PackPreview {
    const invalid = (message: string): PackPreview => ({ count: this.cards.length, capacity: this.cardCapacity, valid: false, message });
    const draft = this.pendingPack;
    if (!this.alive || !this.isOpen || !this.market || this.market.remaining <= 0 || !draft) return invalid('Open your pack to choose its cards.');
    if (ids.length !== draft.picks || new Set(ids).size !== ids.length) return invalid(`Choose exactly ${draft.picks} different ${draft.picks === 1 ? 'card' : 'cards'}.`);
    const selected = ids.map(id => draft.choices.find(card => card.id === id));
    if (selected.some(card => !card)) return invalid('Choose cards from this pack.');
    if (new Set(discardIds).size !== discardIds.length || discardIds.some(id => !this.cards.some(card => card.id === id))) return invalid('Choose different cards from your hand to leave behind.');
    const discarded = new Set(discardIds);
    const finalHand = [...this.cards.filter(card => !discarded.has(card.id)), ...selected as HeldCard[]];
    const count = finalHand.length, capacity = this.capacityFor(finalHand), valid = count <= capacity;
    return { count, capacity, valid, message: valid ? 'Ready to keep these cards.' : `Hand full (${count}/${capacity}). Choose cards to leave behind.` };
  }

  claimPack(ids: readonly string[], discardIds: readonly string[] = []): MarketResult {
    const preview = this.previewPack(ids, discardIds);
    if (!preview.valid) return this.fail(preview.message);
    const cards = ids.map(id => this.pendingPack!.choices.find(card => card.id === id)!);
    const discarded = new Set(discardIds);
    this.cards = [...this.cards.filter(card => !discarded.has(card.id)), ...cards];
    this.pendingPack = null;
    this.changed();
    return { ok: true, message: `${cards.map(card => card.name).join(' and ')} equipped.`, cards };
  }

  /** Skipping keeps the paid offer sold and never refunds or rerolls its cards. */
  skipPack(): MarketResult {
    if (!this.alive || !this.isOpen || !this.market || this.market.remaining <= 0 || !this.pendingPack) return this.fail('Open your pack to skip its cards.');
    this.pendingPack = null;
    this.revision++;
    return { ok: true, message: 'Pack skipped. Your hand is unchanged.' };
  }

  sell(cardId: string): MarketResult {
    // The hand travels with the player. Selling can make room during a paid
    // draft or fund an inspected offer without leaving the current screen.
    if (!this.alive) return this.fail('This run has ended.');
    const index = this.cards.findIndex(card => card.id === cardId);
    if (index < 0) return this.fail('That card is no longer owned.');
    const remaining = this.cards.filter((_, candidate) => candidate !== index);
    const capacity = this.capacityFor(remaining);
    if (remaining.length > capacity) return this.fail(`Selling this leaves ${capacity} hand slots. Sell another card first.`);
    const [card] = this.cards.splice(index, 1);
    this.wallet += card.saleValue;
    this.changed();
    return { ok: true, message: `Sold ${card.name} for ${card.saleValue} coins.` };
  }

  /** Death calls this before notifying observers; no asset can leak into retry. */
  clear(): void {
    this.alive = false; this.isOpen = false; this.market = null; this.pendingPack = null;
    this.wallet = 0; this.fraction = 0; this.cards = []; this.powers = []; this.cosmetics = []; this.equipped = {};
    this.changed();
  }
  /** Recovery resumes the empty run economy without restoring any lost death assets. */
  resumeAfterDeath(): void {
    if (this.alive) return;
    this.alive = true; this.isOpen = false; this.market = null; this.pendingPack = null; this.revision++;
  }

  private changed(): void { this.effects = reduceItems(this.catalog, this.cards.flatMap(card => card.components), this.powers, this.policy.baseCoinGravity); this.revision++; }
  private capacityFor(cards: readonly Pick<HeldCard, 'components'>[]): number {
    // Slots come only from held cards. A temporary power cannot expire into an
    // overflowing hand while the player is away from the market.
    const slots = reduceItems(this.catalog, cards.flatMap(card => card.components)).cardSlots;
    return Math.max(1, Math.min(this.policy.inventoryLimit, Math.floor(this.policy.inventoryCapacity + slots)));
  }
  private canTrade(): boolean { return this.alive && this.isOpen && !this.pendingPack && Boolean(this.market && this.market.remaining > 0); }
  private fail(message: string): MarketResult { return { ok: false, message }; }
  private id(prefix: string): string { return `${prefix}-${++this.sequence}`; }
  private random(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }
  private pick<T extends ItemDefinition>(items: readonly T[]): T {
    const total = items.reduce((sum, item) => sum + WEIGHTS[item.rarity], 0);
    let target = this.random() * total;
    for (const item of items) { target -= WEIGHTS[item.rarity]; if (target < 0) return item; }
    return items[items.length - 1];
  }
  private cardPool(minimum: Rarity = 'common'): CardDefinition[] {
    return [...this.catalog.values()].filter((item): item is CardDefinition => item.kind === 'card' && RARITIES.indexOf(item.rarity) >= RARITIES.indexOf(minimum));
  }
  private hold(item: CardDefinition): HeldCard {
    return { id: this.id('card'), name: item.name, description: item.description, rarity: item.rarity, icon: item.icon, color: item.color, components: [{ itemId: item.id, potency: 1 }], saleValue: Math.max(1, Math.floor(item.price / 2)) };
  }
  private makeOffers(milestone: number): MarketOffer[] {
    const items = [...this.catalog.values()].filter(item => item.kind !== 'cosmetic' || !this.cosmetics.includes(item.id));
    const chosen: ItemDefinition[] = [], offers: MarketOffer[] = [];
    const add = (pool: readonly ItemDefinition[], section: NonNullable<MarketOffer['section']>): void => {
      const candidates = pool.filter(item => !chosen.includes(item));
      if (!candidates.length) return;
      const item = this.pick(candidates);
      chosen.push(item);
      offers.push({ id: `offer-${milestone}-${offers.length}`, itemId: item.id, price: item.price, sold: false, section });
    };
    const cards = items.filter(item => item.kind === 'card');
    for (let index = 0; index < 3; index++) add(cards, 'cards');
    const cosmetics = items.filter(item => item.kind === 'cosmetic');
    for (let index = 0; index < 2; index++) add(cosmetics, 'extras');
    // A seeded occasional find is separate from the everyday display. Reopening
    // keeps this exact stock; purchases never trigger a new chance or reroll.
    // Packs share this slot, keeping both cosmetic displays dedicated to looks.
    // A special-only extension catalog still has one item to offer.
    if (this.random() < .35 || !offers.length) add(items.filter(item => item.kind === 'pack'
      || RARITIES.indexOf(item.rarity) >= RARITIES.indexOf('rare')), 'rare');
    return offers;
  }
}
