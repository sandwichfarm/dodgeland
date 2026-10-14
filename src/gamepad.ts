/**
 * Temporary NAP-GAMEPAD adapter while @napplet/sdk lacks this domain.
 * Contract: https://github.com/napplet/naps/pull/108 (0b28f77e3dfa0f07dd7c0f9d61a7090ee99f3a5e).
 * The shell owns devices and focus. This module never installs a global binding.
 * Replace the transport with the SDK helper when it ships; keep the input policy.
 */
export type GamepadDirection = 'forward' | 'back' | 'left' | 'right';
export interface GamepadButtonState { value: number; pressed: boolean; touched: boolean }
export interface GamepadSnapshot {
  index: number; id: string; mapping: string; connected: boolean; timestamp: number;
  axes: number[]; buttons: GamepadButtonState[];
}
export interface GamepadState {
  available: boolean; focused: boolean; reason?: 'blocked' | 'unavailable';
  pads: (GamepadSnapshot | null)[];
}
interface GamepadBinding {
  readonly available: boolean; readonly focused: boolean;
  getGamepads(): (GamepadSnapshot | null)[];
  onChange(handler: (state: GamepadState) => void): { close(): void };
}
export interface GamepadActions {
  /** Include run state and open menu/tab. A changed context releases held input. */
  context(): string;
  /** False while the game is too small, hidden, or otherwise unable to accept input. */
  enabled?(): boolean;
  direction(direction: GamepadDirection): void;
  confirm(): void;
  pause(): void;
  call(): void;
  back(): void;
  menu(): void;
  /** Dedicated market shortcut (standard left bumper); optional for older clients. */
  market?(): void;
  onConnection?(connected: boolean): void;
  /** Pause the run when the shell or browser takes live controller focus away. */
  onFocusLost?(): void;
}
export const GAMEPAD_DEADZONE = .5;
export const GAMEPAD_RELEASE_ZONE = .3;
export const GAMEPAD_REPEAT_DELAY = 280;
export const GAMEPAD_REPEAT_INTERVAL = 160;

function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function inRange(value: unknown, min: number, max: number): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max; }

/** Copy bounded, complete snapshots; reject malformed input instead of retaining a stuck press. */
export function parseGamepadState(raw: unknown): GamepadState | null {
  if (!record(raw) || typeof raw.available !== 'boolean' || typeof raw.focused !== 'boolean' || !Array.isArray(raw.pads) || raw.pads.length > 16) return null;
  if (raw.reason !== undefined && raw.reason !== 'blocked' && raw.reason !== 'unavailable') return null;
  const pads: (GamepadSnapshot | null)[] = [], indices = new Set<number>();
  for (const value of raw.pads) {
    if (value === null) { pads.push(null); continue; }
    if (!record(value) || !inRange(value.index, 0, 255) || !Number.isInteger(value.index) || indices.has(value.index) || typeof value.id !== 'string' || typeof value.mapping !== 'string' || value.connected !== true || !inRange(value.timestamp, 0, Number.MAX_VALUE) || !Array.isArray(value.axes) || value.axes.length > 32 || !Array.isArray(value.buttons) || value.buttons.length > 64) return null;
    if (!value.axes.every(axis => inRange(axis, -1, 1))) return null;
    const buttons: GamepadButtonState[] = [];
    for (const button of value.buttons) {
      if (!record(button) || !inRange(button.value, 0, 1) || typeof button.pressed !== 'boolean' || typeof button.touched !== 'boolean') return null;
      buttons.push({ value: button.value, pressed: button.pressed, touched: button.touched });
    }
    indices.add(value.index);
    pads.push({ index: value.index, id: value.id.slice(0, 256), mapping: value.mapping.slice(0, 32), connected: true, timestamp: value.timestamp, axes: value.axes.slice(), buttons });
  }
  return { available: raw.available, focused: raw.available && raw.focused, ...(raw.reason === undefined ? {} : { reason: raw.reason }), pads };
}

function pressed(pad: GamepadSnapshot, index: number): boolean { const button = pad.buttons[index]; return !!button && (button.pressed || button.value >= .5); }
function directionOf(pad: GamepadSnapshot, previous: GamepadDirection | null): GamepadDirection | null {
  // Opposed D-pad buttons cancel; D-pad takes precedence over stick drift.
  const horizontal = Number(pressed(pad, 15)) - Number(pressed(pad, 14));
  const vertical = Number(pressed(pad, 13)) - Number(pressed(pad, 12));
  if (horizontal || vertical) {
    if (horizontal && vertical && previous && (previous === 'left' || previous === 'right')) return horizontal < 0 ? 'left' : 'right';
    return vertical ? vertical < 0 ? 'forward' : 'back' : horizontal < 0 ? 'left' : 'right';
  }
  const x = pad.axes[0] ?? 0, y = pad.axes[1] ?? 0;
  const threshold = previous ? GAMEPAD_RELEASE_ZONE : GAMEPAD_DEADZONE;
  if (Math.max(Math.abs(x), Math.abs(y)) < threshold) return null;
  // Equal diagonals keep their prior axis instead of zig-zagging between tiles.
  if (Math.abs(x) > Math.abs(y) || (Math.abs(x) === Math.abs(y) && (previous === 'left' || previous === 'right'))) return x < 0 ? 'left' : 'right';
  return y < 0 ? 'forward' : 'back';
}

/** App input policy, separate from the temporary protocol transport for migration/testing. */
export class GamepadInput {
  private pad: GamepadSnapshot | null = null;
  private focused = false;
  private connected = false;
  private held = new Set<number>();
  private direction: GamepadDirection | null = null;
  private directionArmed = false;
  private repeatAt = Infinity;
  private context = '';
  private closed = false;
  constructor(private readonly actions: GamepadActions) {}

  receive(state: GamepadState, now: number): void {
    if (this.closed) return;
    const standard = state.available ? state.pads.filter((pad): pad is GamepadSnapshot => !!pad && pad.connected && pad.mapping === 'standard') : [];
    const pad = standard.find(candidate => candidate.index === this.pad?.index) ?? standard.slice().sort((a, b) => a.index - b.index)[0] ?? null;
    if (!!pad !== this.connected) { this.connected = !!pad; this.actions.onConnection?.(this.connected); }
    if (!state.focused || !state.available || !pad || this.actions.enabled?.() === false) { this.suspend(); return; }
    const changed = !this.focused || this.pad?.index !== pad.index || this.context !== this.actions.context();
    this.pad = pad; this.focused = true;
    if (changed) { this.seed(); return; }
    this.process(now);
  }

  /** Called by the existing animation frame; one repeat maximum, never catch-up bursts. */
  update(now: number): void {
    if (this.actions.enabled?.() === false) { this.suspend(); return; }
    if (this.closed || !this.focused || !this.pad) return;
    if (this.context !== this.actions.context()) { this.seed(); return; }
    if (this.directionArmed && this.direction && now >= this.repeatAt) {
      this.repeatAt = now + GAMEPAD_REPEAT_INTERVAL;
      this.actions.direction(this.direction);
      if (this.context !== this.actions.context()) this.seed();
    }
  }

  suspend(): void {
    const wasFocused = this.focused;
    this.focused = false; this.pad = null; this.held.clear(); this.direction = null; this.directionArmed = false; this.repeatAt = Infinity;
    if (wasFocused) this.actions.onFocusLost?.();
  }
  close(): void { if (this.closed) return; this.closed = true; this.suspend(); if (this.connected) { this.connected = false; this.actions.onConnection?.(false); } }

  private seed(): void {
    this.context = this.actions.context();
    this.held = new Set([0, 1, 2, 3, 4, 9].filter(index => this.pad && pressed(this.pad, index)));
    this.direction = this.pad ? directionOf(this.pad, null) : null;
    this.directionArmed = false; this.repeatAt = Infinity;
  }
  private process(now: number): void {
    const pad = this.pad!;
    const nextHeld = new Set([0, 1, 2, 3, 4, 9].filter(index => pressed(pad, index)));
    const fresh = [...nextHeld].filter(index => !this.held.has(index));
    this.held = nextHeld;
    // Modal actions outrank movement and call, so Start+A cannot pause then hop.
    for (const [index, action] of [[9, 'pause'], [1, 'back'], [4, 'market'], [3, 'menu'], [0, 'confirm'], [2, 'call']] as const) {
      if (!fresh.includes(index)) continue;
      this.actions[action]?.();
      if (this.context !== this.actions.context()) { this.seed(); return; }
    }
    const direction = directionOf(pad, this.direction);
    if (!direction) { this.direction = null; this.directionArmed = false; this.repeatAt = Infinity; return; }
    if (direction === this.direction) return;
    this.direction = direction; this.directionArmed = true; this.repeatAt = now + GAMEPAD_REPEAT_DELAY;
    this.actions.direction(direction);
    if (this.context !== this.actions.context()) this.seed();
  }
}

export interface GamepadControls { readonly supported: boolean; update(now: number): void; close(): void }

/**
 * A complete injected binding wins. A marker-only exposed domain uses the draft
 * wire messages until packages catch up. Missing domain means no probe and no input.
 */
export function createGamepadControls(actions: GamepadActions, host: Window = window, page: Document = document, now: () => number = () => performance.now()): GamepadControls {
  const domain = (host as Window & { napplet?: Record<string, unknown> }).napplet?.gamepad;
  const input = new GamepadInput(actions);
  let closed = false, localFocus = true, latest: GamepadState | null = null;
  let binding: { close(): void } | undefined, wire = false;
  const supported = record(domain);
  const receive = (raw: unknown): void => {
    if (closed) return;
    const state = parseGamepadState(raw);
    if (!state) { input.suspend(); return; }
    latest = state;
    input.receive({ ...state, focused: state.focused && localFocus && !page.hidden }, now());
  };
  const message = (event: MessageEvent): void => {
    if (event.source !== host.parent || !record(event.data) || event.data.type !== 'gamepad.state' || 'id' in event.data) return;
    receive(event.data);
  };
  const blur = (): void => { localFocus = false; input.suspend(); };
  const focus = (): void => { localFocus = true; if (latest) receive(latest); };
  const visibility = (): void => { if (page.hidden) input.suspend(); else if (latest) receive(latest); };
  const close = (): void => {
    if (closed) return;
    closed = true;
    host.removeEventListener('message', message);
    host.removeEventListener('blur', blur); host.removeEventListener('focus', focus); host.removeEventListener('pagehide', close);
    page.removeEventListener('visibilitychange', visibility);
    try { binding?.close(); } catch { /* Optional runtime teardown must not break the game. */ }
    if (wire) { try { host.parent.postMessage({ type: 'gamepad.unsubscribe' }, '*'); } catch { /* Parent may already be gone. */ } }
    input.close(); latest = null;
  };
  if (supported) {
    host.addEventListener('blur', blur); host.addEventListener('focus', focus); host.addEventListener('pagehide', close);
    page.addEventListener('visibilitychange', visibility);
    if (typeof domain.onChange === 'function' && typeof domain.getGamepads === 'function') {
      const api = domain as unknown as GamepadBinding;
      try {
        binding = api.onChange(receive);
        receive({ available: api.available, focused: api.focused, pads: api.getGamepads() });
      } catch { close(); }
    } else if (host.parent !== host) {
      host.addEventListener('message', message);
      try { host.parent.postMessage({ type: 'gamepad.subscribe' }, '*'); wire = true; } catch { close(); }
    }
  }
  return { supported, update: tick => { if (!closed && !page.hidden && localFocus) input.update(tick); }, close };
}
