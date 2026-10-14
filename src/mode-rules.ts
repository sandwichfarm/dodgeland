/**
 * The small Phase-1 policy seam around the existing solo engine.  Definitions
 * are authored in code, normalized once, and handed to a run as immutable data.
 * Seed schemas, geometry, and numerical implementation tolerances deliberately
 * remain outside this surface.
 */
export type SoloMode = 'arcade' | 'stroll';
export type PursuitStrategy = 'wave' | 'trail';
export type SoloLifecycleEventName = 'start' | 'progress' | 'pause' | 'resume' | 'terminal';
export interface SoloLifecycleEvent { readonly type: SoloLifecycleEventName; readonly game: unknown }
export type SoloLifecycleObserver = (event: SoloLifecycleEvent) => void;

export interface SimulationRules { readonly worldTimeScale: number; readonly fixedStep: number }
export interface MovementRules { readonly hopDuration: number; readonly halfWidth: number }
export interface HealthRules { readonly maxHealth: number; readonly rearDamage: number; readonly sideDamage: number; readonly frontDamage: number; readonly hurtRecovery: number; readonly regenerationInterval: number; readonly regenerationAmount: number }
export interface PursuitRules { readonly strategy: PursuitStrategy; readonly grace: number; readonly speed: number; readonly waveTrail: number; readonly trailingLimit: number; readonly warningSeconds: number }
export interface RetentionRules { readonly rowsBehind: number; readonly rowsAhead: number; readonly pickupBindingAhead: number; readonly captureDistance: number; readonly pullCompletionDistance: number }
/** Per-run economy settings; seed rolls and terrain geometry remain fixed. */
export interface EconomyRules {
  readonly marketInterval: number;
  readonly marketWindowSeconds: number;
  readonly inventoryCapacity: number;
  readonly inventoryLimit: number;
  readonly baseCoinGravity: number;
}
/** Reserved for the pursuer extraction in Plan 03; Game can only disable the existing director. */
export interface PursuerRules { readonly enabled: boolean; readonly introductionThresholds: readonly number[] }
export interface PresentationRules { readonly pursuitVisible: boolean }
export interface LifecycleRules {
  readonly onStart?: SoloLifecycleObserver;
  readonly onProgress?: SoloLifecycleObserver;
  readonly onPause?: SoloLifecycleObserver;
  readonly onResume?: SoloLifecycleObserver;
  readonly onTerminal?: SoloLifecycleObserver;
}
export interface ModeRules {
  readonly simulation: SimulationRules;
  readonly movement: MovementRules;
  readonly health: HealthRules;
  readonly pursuit: PursuitRules;
  readonly retention: RetentionRules;
  readonly economy: EconomyRules;
  readonly pursuers: PursuerRules;
  readonly presentation: PresentationRules;
  readonly lifecycle: LifecycleRules;
}
export interface ModeDefinition { readonly id: string; readonly rules: ModeRules }
export type ModeDefinitionInput = { readonly id?: string } & {
  readonly [K in keyof ModeRules]?: Partial<ModeRules[K]>;
};

const composedDefinitions = new WeakSet<ModeDefinition>();
const defaults: ModeRules = {
  simulation: { worldTimeScale: 1, fixedStep: 1 / 120 },
  movement: { hopDuration: .14, halfWidth: 5 },
  health: { maxHealth: 3, rearDamage: 1, sideDamage: 2, frontDamage: 3, hurtRecovery: 1, regenerationInterval: 100, regenerationAmount: .5 },
  pursuit: { strategy: 'wave', grace: 4, speed: .65, waveTrail: 6, trailingLimit: 7, warningSeconds: 5 },
  retention: { rowsBehind: 10, rowsAhead: 28, pickupBindingAhead: 8, captureDistance: .5, pullCompletionDistance: .2 },
  economy: { marketInterval: 100, marketWindowSeconds: 15, inventoryCapacity: 3, inventoryLimit: 6, baseCoinGravity: .1 },
  pursuers: { enabled: true, introductionThresholds: [160, 320, 480] },
  presentation: { pursuitVisible: true },
  lifecycle: {},
};

const keys: { readonly [K in keyof ModeRules]: readonly (keyof ModeRules[K])[] } = {
  simulation: ['worldTimeScale', 'fixedStep'], movement: ['hopDuration', 'halfWidth'],
  health: ['maxHealth', 'rearDamage', 'sideDamage', 'frontDamage', 'hurtRecovery', 'regenerationInterval', 'regenerationAmount'],
  pursuit: ['strategy', 'grace', 'speed', 'waveTrail', 'trailingLimit', 'warningSeconds'],
  retention: ['rowsBehind', 'rowsAhead', 'pickupBindingAhead', 'captureDistance', 'pullCompletionDistance'],
  economy: ['marketInterval', 'marketWindowSeconds', 'inventoryCapacity', 'inventoryLimit', 'baseCoinGravity'], pursuers: ['enabled', 'introductionThresholds'],
  presentation: ['pursuitVisible'], lifecycle: ['onStart', 'onProgress', 'onPause', 'onResume', 'onTerminal'],
};
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };

function clone<T>(value: T): T {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clone) as T;
  return Object.fromEntries(Object.entries(value).map(([key, member]) => [key, clone(member)])) as T;
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const member of Object.values(value)) freeze(member);
    Object.freeze(value);
  }
  return value;
}
function fail(path: string, detail: string): never { throw new RangeError(`${path} ${detail}`); }
function numberAt(value: unknown, path: string, minimum: number, maximum: number, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum || (integer && !Number.isInteger(value))) fail(path, `must be a finite ${integer ? 'integer' : 'number'} from ${minimum} through ${maximum}.`);
  return value;
}
function checkUnknown(input: Record<string, unknown>, allowed: readonly string[], path: string): void {
  for (const key of Object.keys(input)) if (!allowed.includes(key)) fail(path ? `${path}.${key}` : key, 'is not a recognized rule.');
}
function mergeGroup<K extends keyof ModeRules>(group: K, input: ModeDefinitionInput): ModeRules[K] {
  const patch = input[group];
  if (patch !== undefined && (!patch || typeof patch !== 'object' || Array.isArray(patch))) fail(String(group), 'must be an object.');
  if (patch) checkUnknown(patch as Record<string, unknown>, keys[group] as readonly string[], String(group));
  return { ...clone(defaults[group]), ...clone(patch ?? {}) } as ModeRules[K];
}

/** Compose a local, code-authored policy while rejecting unsafe or unsupported tuning. */
export function composeModeDefinition(input: ModeDefinitionInput = {}): ModeDefinition {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('definition', 'must be an object.');
  checkUnknown(input as Record<string, unknown>, ['id', ...Object.keys(keys)], '');
  if (input.id !== undefined && (typeof input.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(input.id))) fail('id', 'must be a lowercase local identifier.');
  const rules = Object.fromEntries((Object.keys(keys) as (keyof ModeRules)[]).map(group => [group, mergeGroup(group, input)])) as unknown as Mutable<ModeRules>;
  const s = rules.simulation, m = rules.movement, h = rules.health, p = rules.pursuit, r = rules.retention, e = rules.economy;
  s.worldTimeScale = numberAt(s.worldTimeScale, 'simulation.worldTimeScale', .1, 2);
  s.fixedStep = numberAt(s.fixedStep, 'simulation.fixedStep', 1 / 1000, 1 / 10);
  m.hopDuration = numberAt(m.hopDuration, 'movement.hopDuration', .05, 1);
  if (m.halfWidth !== 5) fail('movement.halfWidth', 'must remain 5 until a versioned terrain generator supports another width.');
  h.maxHealth = numberAt(h.maxHealth, 'health.maxHealth', 1, 10);
  for (const key of ['rearDamage', 'sideDamage', 'frontDamage'] as const) h[key] = numberAt(h[key], `health.${key}`, .25, 10);
  h.hurtRecovery = numberAt(h.hurtRecovery, 'health.hurtRecovery', .05, 10);
  h.regenerationAmount = numberAt(h.regenerationAmount, 'health.regenerationAmount', .05, 10);
  h.regenerationInterval = numberAt(h.regenerationInterval, 'health.regenerationInterval', 1, 10_000, true);
  for (const key of ['frontDamage', 'sideDamage', 'rearDamage'] as const) if (h[key] > h.maxHealth) fail(`health.${key}`, 'cannot exceed maxHealth.');
  if (p.strategy !== 'wave' && p.strategy !== 'trail') fail('pursuit.strategy', 'must be wave or trail.');
  p.grace = numberAt(p.grace, 'pursuit.grace', 0, 60);
  p.speed = numberAt(p.speed, 'pursuit.speed', .01, 5);
  p.waveTrail = numberAt(p.waveTrail, 'pursuit.waveTrail', 1, 50);
  p.trailingLimit = numberAt(p.trailingLimit, 'pursuit.trailingLimit', 1, 50);
  p.warningSeconds = numberAt(p.warningSeconds, 'pursuit.warningSeconds', 0, 60);
  if (p.strategy === 'trail' && rules.presentation.pursuitVisible) fail('presentation.pursuitVisible', 'cannot be enabled for trail policy.');
  r.rowsBehind = numberAt(r.rowsBehind, 'retention.rowsBehind', 10, 40, true);
  r.rowsAhead = numberAt(r.rowsAhead, 'retention.rowsAhead', 28, 64, true);
  r.pickupBindingAhead = numberAt(r.pickupBindingAhead, 'retention.pickupBindingAhead', 8, 64, true);
  r.captureDistance = numberAt(r.captureDistance, 'retention.captureDistance', .1, 2);
  r.pullCompletionDistance = numberAt(r.pullCompletionDistance, 'retention.pullCompletionDistance', .05, 1);
  if (r.pickupBindingAhead > r.rowsAhead) fail('retention.pickupBindingAhead', 'cannot exceed rowsAhead.');
  if (p.trailingLimit > r.rowsBehind) fail('pursuit.trailingLimit', 'cannot exceed retained rowsBehind.');
  e.marketInterval = numberAt(e.marketInterval, 'economy.marketInterval', 1, 10_000, true);
  e.marketWindowSeconds = numberAt(e.marketWindowSeconds, 'economy.marketWindowSeconds', 1, 600);
  e.inventoryCapacity = numberAt(e.inventoryCapacity, 'economy.inventoryCapacity', 1, 12, true);
  e.inventoryLimit = numberAt(e.inventoryLimit, 'economy.inventoryLimit', 1, 12, true);
  if (e.inventoryCapacity > e.inventoryLimit) fail('economy.inventoryCapacity', 'cannot exceed inventoryLimit.');
  e.baseCoinGravity = numberAt(e.baseCoinGravity, 'economy.baseCoinGravity', 0, 1.25);
  if (typeof rules.pursuers.enabled !== 'boolean') fail('pursuers.enabled', 'must be boolean.');
  if (!Array.isArray(rules.pursuers.introductionThresholds) || rules.pursuers.introductionThresholds.length !== 3 || rules.pursuers.introductionThresholds.some((value, index, values) => !Number.isSafeInteger(value) || value < 1 || (index > 0 && value <= values[index - 1]!))) fail('pursuers.introductionThresholds', 'must be three increasing positive integers.');
  if (typeof rules.presentation.pursuitVisible !== 'boolean') fail('presentation.pursuitVisible', 'must be boolean.');
  for (const key of ['onStart', 'onProgress', 'onPause', 'onResume', 'onTerminal'] as const) if (rules.lifecycle[key] !== undefined && typeof rules.lifecycle[key] !== 'function') fail(`lifecycle.${key}`, 'must be a function.');
  const definition = freeze({ id: input.id ?? 'custom', rules }) as ModeDefinition;
  composedDefinitions.add(definition);
  return definition;
}

export const SOLO_ARCADE_MODE = composeModeDefinition({ id: 'arcade' });
export const SOLO_STROLL_MODE = composeModeDefinition({
  id: 'stroll', simulation: { worldTimeScale: .58 }, pursuit: { strategy: 'trail', trailingLimit: 7 },
  pursuers: { enabled: false }, presentation: { pursuitVisible: false },
});
export function soloModeDefinition(mode: SoloMode): ModeDefinition { return mode === 'stroll' ? SOLO_STROLL_MODE : SOLO_ARCADE_MODE; }
/** Options accept only an immutable composer result, never a raw runtime object. */
export function isModeDefinition(value: unknown): value is ModeDefinition {
  return Boolean(value && typeof value === 'object' && composedDefinitions.has(value as ModeDefinition));
}
