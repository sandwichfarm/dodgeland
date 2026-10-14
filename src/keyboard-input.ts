import type { Direction } from './game.js';
import type { SeatId } from './session.js';

export const KEYBOARD_BINDINGS_VERSION = 1 as const;
export const KEYBOARD_STORAGE_KEY = 'puddlehop.local-keyboards.v1';
export const KEYBOARD_ACTIONS = ['forward', 'left', 'back', 'right', 'call'] as const;

export type KeyboardAction = typeof KEYBOARD_ACTIONS[number];
export type KeyboardProfileId = 'keyboard-a' | 'keyboard-b';
export type KeyboardProfile = Record<KeyboardAction, string>;

export interface KeyboardBindings {
  readonly version: typeof KEYBOARD_BINDINGS_VERSION;
  readonly profiles: Record<KeyboardProfileId, KeyboardProfile>;
}

export interface BindingLocation {
  readonly profile: KeyboardProfileId;
  readonly action: KeyboardAction;
}

export interface BindingConflict {
  readonly key: string;
  readonly first: BindingLocation;
  readonly second: BindingLocation;
}

export type BindingValidation =
  | { readonly ok: true; readonly bindings: KeyboardBindings }
  | { readonly ok: false; readonly conflicts: readonly BindingConflict[]; readonly reason?: string };

export const DEFAULT_KEYBOARD_BINDINGS: KeyboardBindings = {
  version: KEYBOARD_BINDINGS_VERSION,
  profiles: {
    'keyboard-a': { forward: 'W', left: 'A', back: 'S', right: 'D', call: 'Q' },
    'keyboard-b': { forward: 'ArrowUp', left: 'ArrowLeft', back: 'ArrowDown', right: 'ArrowRight', call: '.' },
  },
};

const profileSeats: Record<KeyboardProfileId, SeatId> = {
  'keyboard-a': 'p1',
  'keyboard-b': 'p2',
};

const directions: Record<Exclude<KeyboardAction, 'call'>, Direction> = {
  forward: 'forward', left: 'left', back: 'back', right: 'right',
};

const profileIds: readonly KeyboardProfileId[] = ['keyboard-a', 'keyboard-b'];
const supportedPunctuation = new Set(['.', ',', ';', '/', "'", '`', '-', '=', '[', ']']);

/** Browser key values are normalized once before they enter a profile map. */
export function normalizeKeyboardKey(key: unknown): string | undefined {
  if (typeof key !== 'string') return undefined;
  if (/^Arrow(?:Up|Down|Left|Right)$/.test(key)) return key;
  if (/^[a-z]$/i.test(key)) return key.toUpperCase();
  if (supportedPunctuation.has(key)) return key;
  return undefined;
}

function cloneBindings(bindings: KeyboardBindings): KeyboardBindings {
  return {
    version: KEYBOARD_BINDINGS_VERSION,
    profiles: {
      'keyboard-a': { ...bindings.profiles['keyboard-a'] },
      'keyboard-b': { ...bindings.profiles['keyboard-b'] },
    },
  };
}

function isProfileId(value: unknown): value is KeyboardProfileId {
  return value === 'keyboard-a' || value === 'keyboard-b';
}

function isAction(value: unknown): value is KeyboardAction {
  return typeof value === 'string' && (KEYBOARD_ACTIONS as readonly string[]).includes(value);
}

/** Validate every field as one atomic map. Callers retain their active map on failure. */
export function validateKeyboardBindings(value: unknown): BindingValidation {
  if (!value || typeof value !== 'object') return { ok: false, conflicts: [], reason: 'Keyboard controls are malformed.' };
  const candidate = value as Partial<KeyboardBindings>;
  if (candidate.version !== KEYBOARD_BINDINGS_VERSION || !candidate.profiles || typeof candidate.profiles !== 'object') return { ok: false, conflicts: [], reason: 'Keyboard controls use an unsupported version.' };
  const profiles = candidate.profiles as Partial<Record<KeyboardProfileId, Partial<KeyboardProfile>>>;
  const normalized: Record<KeyboardProfileId, KeyboardProfile> = {} as Record<KeyboardProfileId, KeyboardProfile>;
  const locations = new Map<string, BindingLocation>();
  const conflicts: BindingConflict[] = [];

  for (const profile of profileIds) {
    const source = profiles[profile];
    if (!source || typeof source !== 'object') return { ok: false, conflicts: [], reason: 'Keyboard controls are incomplete.' };
    const target = {} as KeyboardProfile;
    for (const action of KEYBOARD_ACTIONS) {
      const key = normalizeKeyboardKey(source[action]);
      if (!key) return { ok: false, conflicts: [], reason: 'Use a letter, arrow, or punctuation key.' };
      const next = { profile, action } as const;
      const first = locations.get(key);
      if (first) conflicts.push({ key, first, second: next });
      else locations.set(key, next);
      target[action] = key;
    }
    normalized[profile] = target;
  }
  if (conflicts.length) return { ok: false, conflicts };
  return { ok: true, bindings: { version: KEYBOARD_BINDINGS_VERSION, profiles: normalized } };
}

/** Create an immutable proposal; it never changes a live router by itself. */
export function updateKeyboardBinding(bindings: KeyboardBindings, profile: KeyboardProfileId, action: KeyboardAction, key: string): KeyboardBindings {
  if (!isProfileId(profile) || !isAction(action)) throw new TypeError('Unknown keyboard binding target.');
  const next = cloneBindings(bindings);
  next.profiles[profile][action] = normalizeKeyboardKey(key) ?? key;
  return next;
}

export function parseStoredKeyboardBindings(raw: string | null | undefined): KeyboardBindings {
  if (!raw) return cloneBindings(DEFAULT_KEYBOARD_BINDINGS);
  try {
    const parsed = validateKeyboardBindings(JSON.parse(raw));
    return parsed.ok ? parsed.bindings : cloneBindings(DEFAULT_KEYBOARD_BINDINGS);
  } catch { return cloneBindings(DEFAULT_KEYBOARD_BINDINGS); }
}

export function serializeKeyboardBindings(bindings: KeyboardBindings): string {
  const parsed = validateKeyboardBindings(bindings);
  if (!parsed.ok) throw new TypeError(parsed.reason ?? 'Keyboard controls conflict.');
  return JSON.stringify(parsed.bindings);
}

/** Minimal SDK-shaped storage boundary; callers pass only @napplet/sdk storage. */
export interface KeyboardBindingStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface KeyboardBindingStore {
  load(): Promise<KeyboardBindings>;
  commit(next: KeyboardBindings): Promise<BindingValidation>;
  current(): KeyboardBindings;
}

/**
 * Storage failure is never a reason to leave controls unusable. The in-memory
 * map remains the source of truth for this iframe until a later reload.
 */
export function createKeyboardBindingStore(storage?: KeyboardBindingStorage): KeyboardBindingStore {
  let active = cloneBindings(DEFAULT_KEYBOARD_BINDINGS);
  return {
    async load() {
      if (!storage) return active;
      try { active = parseStoredKeyboardBindings(await storage.getItem(KEYBOARD_STORAGE_KEY)); }
      catch { active = cloneBindings(DEFAULT_KEYBOARD_BINDINGS); }
      return active;
    },
    async commit(next) {
      const parsed = validateKeyboardBindings(next);
      if (!parsed.ok) return parsed;
      if (storage) {
        try { await storage.setItem(KEYBOARD_STORAGE_KEY, serializeKeyboardBindings(parsed.bindings)); }
        catch { active = parsed.bindings; return { ok: true, bindings: active }; }
      }
      active = parsed.bindings;
      return { ok: true, bindings: active };
    },
    current: () => active,
  };
}

export interface KeyboardInputSink {
  move(seat: SeatId, direction: Direction): void;
  call(seat: SeatId): void;
}

export interface KeyboardInput {
  readonly bindings: KeyboardBindings;
  keydown(key: string): boolean;
  keyup(key: string): boolean;
  suspend(): void;
  resume(heldKeys?: readonly string[]): void;
  beginCapture(): void;
  endCapture(heldKeys?: readonly string[]): void;
  dispose(): void;
}

/**
 * Native iframe input belongs to this router. Its latches are deliberately
 * per profile, so releasing one person's key cannot unlock another person's
 * held direction or call edge.
 */
export function createKeyboardInput(sink: KeyboardInputSink, initial = DEFAULT_KEYBOARD_BINDINGS): KeyboardInput {
  const validated = validateKeyboardBindings(initial);
  if (!validated.ok) throw new TypeError(validated.reason ?? 'Keyboard controls conflict.');
  const bindings = cloneBindings(validated.bindings);
  const held = new Map<KeyboardProfileId, Set<KeyboardAction>>(profileIds.map(profile => [profile, new Set()]));
  let enabled = true;

  const actionFor = (key: string): { profile: KeyboardProfileId; action: KeyboardAction } | undefined => {
    for (const profile of profileIds) {
      for (const action of KEYBOARD_ACTIONS) if (bindings.profiles[profile][action] === key) return { profile, action };
    }
    return undefined;
  };
  const clear = (): void => { for (const actions of held.values()) actions.clear(); };
  const seed = (keys: readonly string[]): void => {
    clear();
    for (const raw of keys) {
      const key = normalizeKeyboardKey(raw); if (!key) continue;
      const target = actionFor(key); if (target) held.get(target.profile)!.add(target.action);
    }
  };

  return {
    bindings,
    keydown(rawKey) {
      if (!enabled) return false;
      const key = normalizeKeyboardKey(rawKey); if (!key) return false;
      const target = actionFor(key); if (!target) return false;
      const actions = held.get(target.profile)!;
      if (actions.has(target.action)) return false;
      actions.add(target.action);
      const seat = profileSeats[target.profile];
      if (target.action === 'call') sink.call(seat); else sink.move(seat, directions[target.action]);
      return true;
    },
    keyup(rawKey) {
      const key = normalizeKeyboardKey(rawKey); if (!key) return false;
      const target = actionFor(key); if (!target) return false;
      return held.get(target.profile)!.delete(target.action);
    },
    suspend() { enabled = false; clear(); },
    resume(heldKeys = []) { seed(heldKeys); enabled = true; },
    beginCapture() { enabled = false; clear(); },
    endCapture(heldKeys = []) { seed(heldKeys); enabled = true; },
    dispose() { enabled = false; clear(); },
  };
}
