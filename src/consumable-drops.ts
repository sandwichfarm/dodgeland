import type { ConsumableId } from './consumables.js';
/** Isolated, stateless stream for cooperative item drops. */
export const ITEM_DROP_SCHEMA = 'item-drop-schema-1' as const;
export interface ConsumableDropAnchor { readonly courseSeed: number; readonly row: number; readonly slot: number }
export interface ConsumableDrop {
  readonly schema: string;
  readonly bucket: number;
  readonly itemId: ConsumableId | null;
  readonly pickupId: string;
}

const BUCKETS = 2500;
const UINT32_LIMIT = 0x1_0000_0000;

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
function draw(anchor: ConsumableDropAnchor, retry: number, salt = SCHEMA_SALT): number {
  let value = mix32(anchor.courseSeed ^ salt);
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
export interface ConsumableDropSchema { readonly version: string; readonly buckets: number; readonly salt: number; readonly items: Readonly<Partial<Record<number, ConsumableId>>> }
export const DEFAULT_ITEM_SCHEMA: ConsumableDropSchema = Object.freeze({version: ITEM_DROP_SCHEMA, buckets: BUCKETS, salt: SCHEMA_SALT, items: Object.freeze({0:'revival',1:'flare',2:'flare'})});
const schemas = new Map<string, ConsumableDropSchema>([[DEFAULT_ITEM_SCHEMA.version, DEFAULT_ITEM_SCHEMA]]);
export function registerConsumableSchema(schema: ConsumableDropSchema): ConsumableDropSchema {
  const captured = validateConsumableSchema(schema);
  if (schemas.has(captured.version)) throw new TypeError('Consumable schema already registered.');
  schemas.set(captured.version, captured); return captured;
}
export function consumableSchema(version: string): ConsumableDropSchema {
  const schema = schemas.get(version); if (!schema) throw new TypeError('Unknown consumable schema.'); return schema;
}
export function validateConsumableSchema(schema: ConsumableDropSchema): ConsumableDropSchema {
  if (!schema || !/^[a-z][a-z0-9-]{1,63}$/.test(schema.version) || !Number.isInteger(schema.buckets) || schema.buckets < 2 || schema.buckets > 65536 || !unsigned(schema.salt) || !schema.items || Object.entries(schema.items).some(([k,v]) => !/^(0|[1-9][0-9]*)$/.test(k) || +k >= schema.buckets || !['revival','flare','mud-splash','fog-lantern'].includes(v ?? ''))) throw new TypeError('Invalid consumable schema.');
  return Object.freeze({...schema, items:Object.freeze({...schema.items})});
}
export function classifyItemBucket(bucket: number, schema: ConsumableDropSchema): ConsumableId | null {
  validateConsumableSchema(schema);
  if (!Number.isInteger(bucket) || bucket < 0 || bucket >= schema.buckets) throw new RangeError('Invalid item bucket.');
  return schema.items[bucket] ?? null;
}
export function sampleConsumableDrop(anchor: ConsumableDropAnchor): ConsumableDrop { return sampleItemDrop(DEFAULT_ITEM_SCHEMA, anchor); }
export function sampleItemDrop(schema: ConsumableDropSchema, anchor: ConsumableDropAnchor): ConsumableDrop {
  validateConsumableSchema(schema);
  const registered = consumableSchema(schema.version);
  if (schema.salt !== registered.salt || schema.buckets !== registered.buckets || JSON.stringify(schema.items) !== JSON.stringify(registered.items)) throw new TypeError('Changed consumable schema.');
  validate(anchor);
  let retry = 0;
  for (;;) {
    const value = draw(anchor, retry++, schema.salt);
    if (value >= Math.floor(UINT32_LIMIT / schema.buckets) * schema.buckets) continue;
    const bucket = value % schema.buckets;
    const itemId = schema.items[bucket] ?? null;
    return freeze({ schema: schema.version, bucket, itemId, pickupId: `${schema.version}-${anchor.courseSeed.toString(16).padStart(8, '0')}-${anchor.row}-${anchor.slot}-${itemId ?? 'none'}` });
  }
}
