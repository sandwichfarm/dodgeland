import { CONSUMABLES } from './consumables.js';
import type { ConsumableId } from './consumables.js';
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

export interface CoOpMarketHost {
  coOpMarketEnabled(): boolean;
  coOpMarketOwners(): readonly CoOpMarketOwner[];
  coOpMarketConsumableState(owner: CoOpMarketOwner): Readonly<{ ownerGeneration: number; inventoryGeneration: number }> | undefined;
  coOpMarketCanCredit(owner: CoOpMarketOwner, itemId: ConsumableId, expectedOwnerGeneration: number, expectedInventoryGeneration: number): boolean;
  coOpMarketCredit(owner: CoOpMarketOwner, itemId: ConsumableId, expectedOwnerGeneration: number, expectedInventoryGeneration: number): boolean;
}

const actionId = (value: string): boolean => /^[-a-zA-Z0-9_.]{1,128}$/.test(value);
const isConsumable = (value: string | undefined): value is ConsumableId => value === 'revival' || value === 'flare';
const isMarketWindowOpen = (run: RunInventory): boolean => run.alive && run.isOpen && Boolean(run.market && run.market.remaining > 0);
const canBuyOrEquip = (run: RunInventory): boolean => isMarketWindowOpen(run) && !run.pendingPack;

/**
 * One owner-labelled interaction context sits over the existing per-seat inventories.
 * It never owns wallet, card, pack, or consumable state; it validates a request and
 * dispatches to the existing owner records only after all context versions agree.
 */
export class CoOpMarketAdapter {
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
      ...(owner.run.market?.offers ?? []).map(offer => Object.freeze({ id: offer.id, itemId: offer.itemId, price: offer.price, sold: offer.sold, source: 'run' as const })),
      ...CONSUMABLES.map(item => Object.freeze({ id: `consumable:${item.id}`, itemId: item.id, price: item.price, sold: !canBuyOrEquip(owner.run) || !this.host.coOpMarketCanCredit(owner, item.id, consumables.ownerGeneration, consumables.inventoryGeneration), source: 'consumable' as const })),
    ];
    return Object.freeze({ seat: owner.seat, participantId: owner.participantId, ownerGeneration: consumables.ownerGeneration, inventoryGeneration: consumables.inventoryGeneration, runRevision: owner.run.revision, contextGeneration: this.contextGeneration, offers: Object.freeze(offers) });
  }

  invalidate(): void { this.selectedSeat = undefined; this.contextGeneration++; }

  dispose(): void { this.invalidate(); this.actions.clear(); }

  act(request: CoOpMarketRequest): CoOpMarketResult {
    const current = this.snapshot();
    const owner = this.owner(request);
    if (!owner || !current || !this.matches(request, current) || !actionId(request.actionId) || this.actions.has(request.actionId)) return this.fail('That market interaction is no longer current.');
    const result = this.dispatch(owner, request);
    if (!result.ok) return this.fail(result.message);
    this.actions.add(request.actionId);
    return Object.freeze({ ok: true, message: result.message, context: this.snapshot() });
  }

  private owner(request: Readonly<{ seat: SeatId; device: DeviceId; participantId?: string }>): CoOpMarketOwner | undefined {
    if (!this.host.coOpMarketEnabled()) return undefined;
    return this.host.coOpMarketOwners().find(owner => owner.seat === request.seat && owner.device === request.device && (!request.participantId || owner.participantId === request.participantId) && this.eligible(owner));
  }

  private eligible(owner: CoOpMarketOwner): boolean { return owner.participation === 'active' && owner.state !== 'dead' && owner.run.alive; }

  private matches(request: CoOpMarketRequest, context: CoOpMarketContext): boolean {
    return request.seat === context.seat && (!request.participantId || request.participantId === context.participantId)
      && request.expectedOwnerGeneration === context.ownerGeneration && request.expectedInventoryGeneration === context.inventoryGeneration
      && request.expectedRunRevision === context.runRevision && request.expectedContextGeneration === context.contextGeneration;
  }

  private dispatch(owner: CoOpMarketOwner, request: CoOpMarketRequest): Readonly<{ ok: boolean; message: string }> {
    if (request.kind === 'open') return owner.run.open() ? { ok: true, message: 'Market opened.' } : { ok: false, message: 'Open an active market to shop.' };
    if (request.kind === 'close') { owner.run.close(); return { ok: true, message: 'Market closed.' }; }
    if (request.kind === 'sell') return request.cardId ? owner.run.sell(request.cardId) : { ok: false, message: 'Choose a card to sell.' };
    if (!isMarketWindowOpen(owner.run)) return { ok: false, message: 'Open an active market to shop.' };
    if (request.kind === 'claim-pack') return owner.run.claimPack(request.ids ?? [], request.discardIds ?? []);
    if (request.kind === 'skip-pack') return owner.run.skipPack();
    if (!canBuyOrEquip(owner.run)) return { ok: false, message: 'Choose your pack cards first.' };
    if (request.kind === 'buy') return request.offerId ? owner.run.buy(request.offerId) : { ok: false, message: 'Choose an offer.' };
    if (request.kind === 'equip') return request.itemId ? owner.run.equipCosmetic(request.itemId) : { ok: false, message: 'Choose a look to wear.' };
    if (request.kind !== 'buy-consumable' || !isConsumable(request.itemId)) return { ok: false, message: 'That market action is unavailable.' };
    const item = CONSUMABLES.find(candidate => candidate.id === request.itemId)!;
    if (owner.run.pendingPack) return { ok: false, message: 'Choose your pack cards first.' };
    if (!this.host.coOpMarketCanCredit(owner, item.id, request.expectedOwnerGeneration, request.expectedInventoryGeneration)) return { ok: false, message: `You already hold ${item.name}.` };
    if (!owner.run.spendCoins(item.price, () => this.host.coOpMarketCredit(owner, item.id, request.expectedOwnerGeneration, request.expectedInventoryGeneration))) return { ok: false, message: `Need ${Math.max(0, item.price - owner.run.wallet)} more coins.` };
    return { ok: true, message: `${item.name} acquired.` };
  }

  private fail(message: string): CoOpMarketResult { return Object.freeze({ ok: false, message, context: this.snapshot() }); }
}
