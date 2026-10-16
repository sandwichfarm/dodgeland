import { CONSUMABLES, planConsumableCredit } from './consumables.js';
import type { ConsumableId, ConsumableDefinition } from './consumables.js';
import type { RunInventory } from './market/run.js';
import type { DeviceId, SeatId, SessionParticipation } from './session.js';

export type CoOpMarketActionKind = 'open' | 'close' | 'buy' | 'buy-consumable' | 'sell' | 'claim-pack' | 'skip-pack' | 'equip';

export interface CoOpMarketOwner {
  readonly seat: SeatId;
  readonly device: DeviceId;
  readonly participantId: string;
  readonly participation: SessionParticipation;
  readonly state: 'ready' | 'playing' | 'paused' | 'dead';
  readonly run: RunInventory;
}

export interface CoOpMarketContext {
  readonly seat: SeatId;
  readonly participantId: string;
  readonly ownerGeneration: number;
  readonly inventoryGeneration: number;
  readonly runRevision: number;
  readonly contextGeneration: number;
  readonly offers: readonly Readonly<{ id: string; itemId: string; price: number; sold: boolean; source: 'run' | 'consumable' }>[];
}

export interface CoOpMarketRequest {
  readonly actionId: string;
  readonly seat: SeatId;
  readonly device: DeviceId;
  readonly participantId?: string;
  readonly expectedOwnerGeneration: number;
  readonly expectedInventoryGeneration: number;
  readonly expectedRunRevision: number;
  readonly expectedContextGeneration: number;
  readonly kind: CoOpMarketActionKind;
  readonly offerId?: string;
  readonly itemId?: string;
  readonly cardId?: string;
  readonly ids?: readonly string[];
  readonly discardIds?: readonly string[];
}

export interface CoOpMarketResult {
  readonly ok: boolean;
  readonly message: string;
  readonly context: CoOpMarketContext | undefined;
}

export interface CoOpMarketItem { readonly id: string; readonly kind: import('./market/types.js').ItemDefinition['kind'] | 'consumable' }
export interface CoOpMarketCommit {
  readonly items: readonly CoOpMarketItem[];
  readonly actionId: string; readonly kind: CoOpMarketActionKind; readonly itemId?: string; readonly itemKind?: import('./market/types.js').ItemDefinition['kind'] | 'consumable';
  readonly ownerGeneration: number; readonly inventoryGeneration: number; readonly contextGeneration: number; readonly walletDelta: number;
}

export interface CoOpMarketHost {
  coOpMarketCommitted?(owner: CoOpMarketOwner, commit: CoOpMarketCommit): void;
  coOpMarketCatalogue?(): readonly ConsumableDefinition[];
  coOpMarketEnabled(): boolean;
  coOpMarketCloseOnInvalidate?(): boolean;
  coOpMarketCanAct?(owner: CoOpMarketOwner): boolean;
  coOpMarketMode?(): Readonly<{ name: string; capabilities: readonly string[] }>;
  coOpMarketOwners(): readonly CoOpMarketOwner[];
  coOpMarketConsumableState(owner: CoOpMarketOwner): Readonly<{ ownerGeneration: number; inventoryGeneration: number }> | undefined;
  coOpMarketCanCredit(owner: CoOpMarketOwner, itemId: ConsumableId, expectedOwnerGeneration: number, expectedInventoryGeneration: number): boolean;
  coOpMarketCredit(owner: CoOpMarketOwner, itemId: ConsumableId, expectedOwnerGeneration: number, expectedInventoryGeneration: number): boolean;
}

const actionId = (value: string): boolean => /^[-a-zA-Z0-9_.]{1,128}$/.test(value);

const isMarketWindowOpen = (run: RunInventory): boolean => run.alive && run.isOpen && Boolean(run.market && run.market.remaining > 0);
const canBuyOrEquip = (run: RunInventory): boolean => isMarketWindowOpen(run) && !run.pendingPack;

/**
 * One owner-labelled interaction context sits over the existing per-seat inventories.
 * It never owns wallet, card, pack, or consumable state; it validates a request and
 * dispatches to the existing owner records only after all context versions agree.
 */
export class CoOpMarketAdapter {
  private get catalogue(): readonly ConsumableDefinition[] { return this.host.coOpMarketCatalogue?.() ?? CONSUMABLES; }
  private isConsumable(value: string | undefined): value is ConsumableId { return this.catalogue.some(item => item.id === value); }
  private selectedSeat: SeatId | undefined;
  private contextGeneration = 0;
  private readonly actions = new Set<string>();

  constructor(private readonly host: CoOpMarketHost) {}

  select(request: Readonly<{ seat: SeatId; device: DeviceId; participantId?: string }>): CoOpMarketContext | undefined {
    const owner = this.owner(request);
    if (!owner) return undefined;
    if (this.selectedSeat !== owner.seat) { this.selectedSeat = owner.seat; this.contextGeneration++; }
    return this.snapshot();
  }

  snapshot(): CoOpMarketContext | undefined {
    const owner = this.selectedSeat === undefined ? undefined : this.host.coOpMarketOwners().find(candidate => candidate.seat === this.selectedSeat);
    if (!owner || !this.eligible(owner)) return undefined;
    const consumables = this.host.coOpMarketConsumableState(owner);
    if (!consumables) return undefined;
    const offers = [
      ...(owner.run.market?.offers ?? []).filter(offer => owner.run.itemEligible(offer.itemId)).map(offer => Object.freeze({ id: offer.id, itemId: offer.itemId, price: offer.price, sold: offer.sold, source: 'run' as const })),
      ...this.catalogue.filter(item => this.itemEligible(owner, item.id)).map(item => Object.freeze({ id: `consumable:${item.id}`, itemId: item.id, price: item.price, sold: !canBuyOrEquip(owner.run) || !this.host.coOpMarketCanCredit(owner, item.id, consumables.ownerGeneration, consumables.inventoryGeneration), source: 'consumable' as const })),
    ];
    return Object.freeze({ seat: owner.seat, participantId: owner.participantId, ownerGeneration: consumables.ownerGeneration, inventoryGeneration: consumables.inventoryGeneration, runRevision: owner.run.revision, contextGeneration: this.contextGeneration, offers: Object.freeze(offers) });
  }

  invalidate(): void { if (this.host.coOpMarketCloseOnInvalidate?.()) this.host.coOpMarketOwners().find(owner => owner.seat === this.selectedSeat)?.run.close(); this.selectedSeat = undefined; this.contextGeneration++; }

  dispose(): void { this.invalidate(); this.actions.clear(); }

  act(request: CoOpMarketRequest): CoOpMarketResult {
    const current = this.snapshot();
    const owner = this.owner(request);
    if (!owner || !current || !this.matches(request, current) || !actionId(request.actionId) || this.actions.has(request.actionId)) return this.fail('That market interaction is no longer current.');
    const wallet = owner.run.wallet;
    const items = this.commitItems(owner, request);
    const itemId = items.length === 1 ? items[0]!.id : undefined;
    const itemKind = items.length === 1 ? items[0]!.kind : undefined;
    const result = this.dispatch(owner, request);
    if (!result.ok) return this.fail(result.message);
    this.actions.add(request.actionId);
    this.host.coOpMarketCommitted?.(owner, Object.freeze({ items, actionId: request.actionId, kind: request.kind, ...(itemId ? { itemId, itemKind } : {}), ownerGeneration: current.ownerGeneration, inventoryGeneration: current.inventoryGeneration, contextGeneration: current.contextGeneration, walletDelta: owner.run.wallet - wallet }));
    return Object.freeze({ ok: true, message: result.message, context: this.snapshot() });
  }

  /** Capture actual validated assets before dispatch can remove a card or paid draft. */
  private commitItems(owner: CoOpMarketOwner, request: CoOpMarketRequest): readonly CoOpMarketItem[] {
    const run=owner.run;
    let ids: readonly string[]=[];
    if(request.kind==='buy') { const offer=run.market?.offers.find(offer=>offer.id===request.offerId); if(offer)ids=[offer.itemId]; }
    else if(request.kind==='buy-consumable'||request.kind==='equip')ids=request.itemId?[request.itemId]:[];
    else if(request.kind==='sell')ids=run.cards.find(card=>card.id===request.cardId)?.components.map(c=>c.itemId)??[];
    else if((request.kind==='claim-pack'||request.kind==='skip-pack')&&run.pendingPack) {
      ids=[run.pendingPack.packId,...(request.kind==='claim-pack'?run.pendingPack.choices.filter(card=>request.ids?.includes(card.id)).flatMap(card=>card.components.map(c=>c.itemId)):[])];
    }
    return Object.freeze(ids.flatMap(id=>{const kind=request.kind==='buy-consumable'?this.catalogue.find(item=>item.id===id)?.kind:run.catalog.get(id)?.kind;return kind?[Object.freeze({id,kind})]:[];}));
  }

  private owner(request: Readonly<{ seat: SeatId; device: DeviceId; participantId?: string }>): CoOpMarketOwner | undefined {
    if (!this.host.coOpMarketEnabled()) return undefined;
    return this.host.coOpMarketOwners().find(owner => owner.seat === request.seat && owner.device === request.device && (!request.participantId || owner.participantId === request.participantId) && this.eligible(owner));
  }

  private eligible(owner: CoOpMarketOwner): boolean { return (this.host.coOpMarketCanAct?.(owner) ?? true) && owner.participation === 'active' && owner.state !== 'dead' && owner.run.alive; }

  private itemEligible(owner: CoOpMarketOwner, itemId: ConsumableId): boolean {
    const mode = this.host.coOpMarketMode?.(); if (!mode) return true;
    const state = this.host.coOpMarketConsumableState(owner); if (!state) return false;
    const identity = { id: owner.participantId, generation: state.ownerGeneration };
    return planConsumableCredit({ catalogue:this.catalogue, mode, owner: identity, inventory: { owner: identity, generation: state.inventoryGeneration, charges: {} }, expectedInventoryGeneration: state.inventoryGeneration, itemId }).ok;
  }

  private matches(request: CoOpMarketRequest, context: CoOpMarketContext): boolean {
    return request.seat === context.seat && (!request.participantId || request.participantId === context.participantId)
      && request.expectedOwnerGeneration === context.ownerGeneration && request.expectedInventoryGeneration === context.inventoryGeneration
      && request.expectedRunRevision === context.runRevision && request.expectedContextGeneration === context.contextGeneration;
  }

  private dispatch(owner: CoOpMarketOwner, request: CoOpMarketRequest): Readonly<{ ok: boolean; message: string }> {
    if (request.kind === 'buy-consumable' && this.isConsumable(request.itemId) && !this.itemEligible(owner, request.itemId)) return { ok: false, message: `${this.catalogue.find(item => item.id === request.itemId)!.name} is not available in ${this.host.coOpMarketMode!().name}.` };
    if (request.kind === 'open') return owner.run.open() ? { ok: true, message: 'Market opened.' } : { ok: false, message: 'Open an active market to shop.' };
    if (request.kind === 'close') { owner.run.close(); return { ok: true, message: 'Market closed.' }; }
    if (request.kind === 'sell') return request.cardId ? owner.run.sell(request.cardId) : { ok: false, message: 'Choose a card to sell.' };
    if (!isMarketWindowOpen(owner.run)) return { ok: false, message: 'Open an active market to shop.' };
    if (request.kind === 'claim-pack') return owner.run.claimPack(request.ids ?? [], request.discardIds ?? []);
    if (request.kind === 'skip-pack') return owner.run.skipPack();
    if (!canBuyOrEquip(owner.run)) return { ok: false, message: 'Choose your pack cards first.' };
    if (request.kind === 'buy') return request.offerId ? owner.run.buy(request.offerId) : { ok: false, message: 'Choose an offer.' };
    if (request.kind === 'equip') return request.itemId ? owner.run.equipCosmetic(request.itemId) : { ok: false, message: 'Choose a look to wear.' };
    if (request.kind !== 'buy-consumable' || !this.isConsumable(request.itemId)) return { ok: false, message: 'That market action is unavailable.' };
    const item = this.catalogue.find(candidate => candidate.id === request.itemId)!;
    if (owner.run.pendingPack) return { ok: false, message: 'Choose your pack cards first.' };
    if (!this.host.coOpMarketCanCredit(owner, item.id, request.expectedOwnerGeneration, request.expectedInventoryGeneration)) return { ok: false, message: `You already hold ${item.name}.` };
    if (!owner.run.spendCoins(item.price, () => this.host.coOpMarketCredit(owner, item.id, request.expectedOwnerGeneration, request.expectedInventoryGeneration))) return { ok: false, message: `Need ${Math.max(0, item.price - owner.run.wallet)} more coins.` };
    return { ok: true, message: `${item.name} acquired.` };
  }

  private fail(message: string): CoOpMarketResult { return Object.freeze({ ok: false, message, context: this.snapshot() }); }
}
