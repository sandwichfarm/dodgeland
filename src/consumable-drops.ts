/** Isolated, stateless stream for cooperative item drops. */
export const ITEM_DROP_SCHEMA = 'item-drop-schema-1' as const;
export interface ConsumableDropAnchor { readonly courseSeed: number; readonly row: number; readonly slot: number }
export interface ConsumableDrop {
  readonly schema: typeof ITEM_DROP_SCHEMA;
  readonly bucket: number;
  readonly itemId: 'revival' | 'flare' | null;
  readonly pickupId: string;
}

const BUCKETS = 2500;
const UINT32_LIMIT = 0x1_0000_0000;
const ACCEPT_LIMIT = Math.floor(UINT32_LIMIT / BUCKETS) * BUCKETS;
const SCHEMA_SALT = 0x51a7e001;
const freeze = <T>(value: T): Readonly<T> => Object.freeze(value);

function unsigned(value: unknown): value is number { return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < UINT32_LIMIT; }
function signed(value: unknown): value is number { return typeof value === 'number' && Number.isInteger(value) && value >= -0x80000000 && value < 0x80000000; }
function validate(anchor: ConsumableDropAnchor): void {
  if (!anchor || !unsigned(anchor.courseSeed) || !signed(anchor.row) || !unsigned(anchor.slot)) throw new RangeError('Invalid consumable drop anchor.');
}
/** A project-local avalanche mixer; no mutable RNG closure or external dependency. */
function mix32(value: number): number {
  let result = value >>> 0;
  result = Math.imul(result ^ (result >>> 16), 0x7feb352d);
  result = Math.imul(result ^ (result >>> 15), 0x846ca68b);
  return (result ^ (result >>> 16)) >>> 0;
}
function draw(anchor: ConsumableDropAnchor, retry: number): number {
  let value = mix32(anchor.courseSeed ^ SCHEMA_SALT);
  value = mix32(value ^ Math.imul(anchor.row >>> 0, 0x9e3779b1));
  value = mix32(value ^ Math.imul(anchor.slot, 0x85ebca6b));
  return mix32(value ^ Math.imul(retry, 0xc2b2ae35));
}

export function classifyConsumableBucket(bucket: unknown): 'revival' | 'flare' | null {
  if (!Number.isInteger(bucket) || typeof bucket !== 'number' || bucket < 0 || bucket >= BUCKETS) throw new RangeError('Consumable bucket must be an integer from 0 through 2499.');
  return bucket === 0 ? 'revival' : bucket === 1 || bucket === 2 ? 'flare' : null;
}
export function consumablePickupId(anchor: ConsumableDropAnchor, itemId: 'revival' | 'flare' | null): string {
  validate(anchor);
  if (itemId !== null && itemId !== 'revival' && itemId !== 'flare') throw new RangeError('Unknown consumable drop.');
  return `${ITEM_DROP_SCHEMA}-${anchor.courseSeed.toString(16).padStart(8, '0')}-${anchor.row}-${anchor.slot}-${itemId ?? 'none'}`;
}
export function sampleConsumableDrop(anchor: ConsumableDropAnchor): ConsumableDrop {
  validate(anchor);
  let retry = 0;
  for (;;) {
    const value = draw(anchor, retry++);
    if (value >= ACCEPT_LIMIT) continue;
    const bucket = value % BUCKETS;
    const itemId = classifyConsumableBucket(bucket);
    return freeze({ schema: ITEM_DROP_SCHEMA, bucket, itemId, pickupId: consumablePickupId(anchor, itemId) });
  }
}
