/**
 * Cooperative consumables are deliberately separate from market cards,
 * cosmetics, powers, and their RunModifiers.  This module only validates and
 * describes transactions; the session owns same-tick revalidation and commit.
 */
export type ConsumableId = 'revival' | 'flare';
export type ConsumableTargetPolicy = 'dead-teammate' | 'dead-teammates-and-active-regroup';
export interface ConsumableDefinition {
  readonly id: ConsumableId;
  readonly kind: 'consumable';
  readonly name: string;
  readonly price: number;
  readonly maxCharges: 1;
  readonly requiredCapability: 'survive-together';
  readonly targetPolicy: ConsumableTargetPolicy;
}

const freeze = <T>(value: T): Readonly<T> => Object.freeze(value);
export const CONSUMABLES: readonly ConsumableDefinition[] = freeze([
  freeze({ id: 'revival', kind: 'consumable', name: 'Revival', price: 24, maxCharges: 1, requiredCapability: 'survive-together', targetPolicy: 'dead-teammate' }),
  freeze({ id: 'flare', kind: 'consumable', name: 'Flare', price: 36, maxCharges: 1, requiredCapability: 'survive-together', targetPolicy: 'dead-teammates-and-active-regroup' }),
]);

export interface ConsumableModeSnapshot { readonly capabilities: readonly string[] }
export interface ConsumableOwnerSnapshot { readonly id: string; readonly generation: number }
export interface ConsumableInventorySnapshot {
  readonly owner: ConsumableOwnerSnapshot;
  readonly generation: number;
  readonly charges: Readonly<Partial<Record<ConsumableId, number>>>;
}
export interface ConsumableTargetSnapshot { readonly id: string; readonly lifecycle: 'dead' | 'living' }
export interface ConsumableCreditRequest {
  readonly mode: ConsumableModeSnapshot;
  readonly owner: ConsumableOwnerSnapshot;
  readonly inventory: ConsumableInventorySnapshot;
  readonly expectedInventoryGeneration: number;
  readonly itemId: unknown;
}
export interface ConsumableDebitRequest extends ConsumableCreditRequest { readonly targets: readonly ConsumableTargetSnapshot[] }
export interface ConsumableCreditPlan {
  readonly ok: true;
  readonly kind: 'credit';
  readonly itemId: ConsumableId;
  readonly ownerId: string;
  readonly ownerGeneration: number;
  readonly inventoryGeneration: number;
  readonly chargeDelta: 1;
  readonly resultingCharges: Readonly<Record<ConsumableId, number>>;
}
export interface ConsumableDebitPlan {
  readonly ok: true;
  readonly kind: 'debit';
  readonly itemId: ConsumableId;
  readonly ownerId: string;
  readonly ownerGeneration: number;
  readonly inventoryGeneration: number;
  readonly chargeDelta: -1;
  readonly resultingCharges: Readonly<Record<ConsumableId, number>>;
  readonly targets: readonly Readonly<ConsumableTargetSnapshot>[];
}
export interface ConsumableRejection { readonly ok: false; readonly reason: string }
export type ConsumableCreditDecision = ConsumableCreditPlan | ConsumableRejection;
export type ConsumableDebitDecision = ConsumableDebitPlan | ConsumableRejection;

const catalog = new Map(CONSUMABLES.map(item => [item.id, item]));
const reject = (reason: string): ConsumableRejection => freeze({ ok: false as const, reason });
const validGeneration = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const validId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 128;

function definition(itemId: unknown): ConsumableDefinition | undefined {
  return typeof itemId === 'string' ? catalog.get(itemId as ConsumableId) : undefined;
}
function holdsCapability(mode: ConsumableModeSnapshot, capability: string): boolean {
  return Array.isArray(mode?.capabilities) && mode.capabilities.includes(capability);
}
function sameOwner(left: ConsumableOwnerSnapshot, right: ConsumableOwnerSnapshot): boolean {
  return validId(left?.id) && validId(right?.id) && validGeneration(left?.generation) && validGeneration(right?.generation)
    && left.id === right.id && left.generation === right.generation;
}
function chargesFor(inventory: ConsumableInventorySnapshot): Readonly<Record<ConsumableId, number>> | undefined {
  if (!inventory || !sameOwner(inventory.owner, inventory.owner) || !validGeneration(inventory.generation) || !inventory.charges) return undefined;
  const revival = inventory.charges.revival ?? 0;
  const flare = inventory.charges.flare ?? 0;
  if (![revival, flare].every(value => Number.isSafeInteger(value) && value >= 0 && value <= 1)) return undefined;
  return freeze({ revival, flare });
}
function validateBase(request: ConsumableCreditRequest): ConsumableDefinition | ConsumableRejection {
  const item = definition(request?.itemId);
  if (!item) return reject('unknown-item');
  const charges = chargesFor(request.inventory);
  if (!charges) return reject('invalid-inventory');
  if (!sameOwner(request.owner, request.inventory.owner)) return reject('stale-owner');
  if (!validGeneration(request.expectedInventoryGeneration) || request.expectedInventoryGeneration !== request.inventory.generation) return reject('stale-inventory');
  if (!holdsCapability(request.mode, item.requiredCapability)) return reject('ineligible-mode');
  return item;
}
function resulting(charges: Readonly<Record<ConsumableId, number>>, id: ConsumableId, delta: 1 | -1): Readonly<Record<ConsumableId, number>> {
  return freeze({ ...charges, [id]: charges[id] + delta });
}
function targetsFor(item: ConsumableDefinition, owner: ConsumableOwnerSnapshot, targets: readonly ConsumableTargetSnapshot[]): readonly Readonly<ConsumableTargetSnapshot>[] | ConsumableRejection {
  if (!Array.isArray(targets)) return reject('invalid-target-count');
  const seen = new Set<string>();
  let dead = 0;
  const bound: Readonly<ConsumableTargetSnapshot>[] = [];
  for (const target of targets) {
    if (!validId(target?.id) || (target.lifecycle !== 'dead' && target.lifecycle !== 'living')) return reject('ineligible-target');
    if (target.id === owner.id) return reject('self-target');
    if (seen.has(target.id)) return reject('duplicate-target');
    seen.add(target.id);
    if (target.lifecycle === 'dead') dead++;
    bound.push(freeze({ id: target.id, lifecycle: target.lifecycle }));
  }
  if (item.id === 'revival' && targets.length !== 1) return reject('invalid-target-count');
  if (item.id === 'flare' && targets.length < 1) return reject('no-dead-target');
  if (item.id === 'revival' && (dead !== 1 || bound[0]!.lifecycle !== 'dead')) return reject('ineligible-target');
  if (item.id === 'flare' && dead < 1) return reject('no-dead-target');
  return freeze(bound);
}

export function planConsumableCredit(request: ConsumableCreditRequest): ConsumableCreditDecision {
  const item = validateBase(request);
  if ('ok' in item) return item;
  const charges = chargesFor(request.inventory)!;
  if (charges[item.id] >= item.maxCharges) return reject('capacity-full');
  return freeze({ ok: true as const, kind: 'credit' as const, itemId: item.id, ownerId: request.owner.id,
    ownerGeneration: request.owner.generation, inventoryGeneration: request.inventory.generation, chargeDelta: 1 as const,
    resultingCharges: resulting(charges, item.id, 1) });
}

export function planConsumableDebit(request: ConsumableDebitRequest): ConsumableDebitDecision {
  const item = validateBase(request);
  if ('ok' in item) return item;
  const charges = chargesFor(request.inventory)!;
  if (charges[item.id] < 1) return reject('empty-charge');
  const targets = targetsFor(item, request.owner, request.targets);
  if ('ok' in targets) return targets;
  return freeze({ ok: true as const, kind: 'debit' as const, itemId: item.id, ownerId: request.owner.id,
    ownerGeneration: request.owner.generation, inventoryGeneration: request.inventory.generation, chargeDelta: -1 as const,
    resultingCharges: resulting(charges, item.id, -1), targets });
}
