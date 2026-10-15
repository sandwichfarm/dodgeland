import {
  GAMEPAD_DEADZONE,
  GAMEPAD_RELEASE_ZONE,
  GAMEPAD_REPEAT_DELAY,
  GAMEPAD_REPEAT_INTERVAL,
  type GamepadDirection,
  type GamepadSnapshot,
  type GamepadState,
} from './gamepad.js';
import type { SeatAction, SeatId } from './session.js';

export type GamepadControlAction = 'confirm' | 'pause' | 'call' | 'back' | 'menu' | 'market';

export interface GamepadDevice {
  readonly index: number;
  readonly id: string;
  readonly epoch: number;
  readonly deviceId: `gamepad-${number}`;
}

export interface GamepadLifecycle {
  readonly type: 'seen' | 'disconnected' | 'reclaim-offered' | 'assigned';
  readonly device: GamepadDevice;
  readonly seat?: SeatId;
}

export interface GamepadRouterOptions {
  /** Current UI/input owner. Any change seeds every device's current snapshot. */
  context(): string;
  /** The session's stable-seat movement path. */
  dispatch(action: SeatAction): boolean;
  /** UI-owned actions retain their seat identity without letting pads select a modal owner. */
  action?(seat: SeatId, action: GamepadControlAction): void;
  /** A fresh unassigned-device edge enters setup and is always consumed. */
  requestLocalPlay?(device: GamepadDevice): void;
  /** The first deliberate edge claims solo P1, then continues through that same edge. */
  requestFirstPlayer?(device: GamepadDevice): boolean;
  /** The owning roster can reject a full or mode-locked device before setup opens. */
  acceptsDevice?(device: GamepadDevice): boolean;
  /** A remembered same-id return needs explicit mode/UI confirmation before reassignment. */
  requestReclaim?(device: GamepadDevice, seat: SeatId): void;
  /** Mode-facing device state; this router never chooses a global pause outcome. */
  lifecycle?(event: GamepadLifecycle): void;
  /** Browser/shell focus loss is global safety, unlike a single device leaving. */
  onFrameSafetyLost?(): void;
}

interface Lease {
  device: GamepadDevice;
  seat: SeatId | null;
  reclaimSeat: SeatId | null;
  pad: GamepadSnapshot;
  held: Set<number>;
  direction: GamepadDirection | null;
  directionArmed: boolean;
  repeatAt: number;
  context: string;
}

const actionButtons: readonly [number, GamepadControlAction][] = [
  [9, 'pause'], [1, 'back'], [4, 'market'], [3, 'menu'], [0, 'confirm'], [2, 'call'],
];
const observedButtons = actionButtons.map(([index]) => index);

function pressed(pad: GamepadSnapshot, index: number): boolean {
  const button = pad.buttons[index];
  return !!button && (button.pressed || button.value >= .5);
}

function directionOf(pad: GamepadSnapshot, previous: GamepadDirection | null): GamepadDirection | null {
  const horizontal = Number(pressed(pad, 15)) - Number(pressed(pad, 14));
  const vertical = Number(pressed(pad, 13)) - Number(pressed(pad, 12));
  if (horizontal || vertical) {
    if (horizontal && vertical && previous && (previous === 'left' || previous === 'right')) return horizontal < 0 ? 'left' : 'right';
    return vertical ? vertical < 0 ? 'forward' : 'back' : horizontal < 0 ? 'left' : 'right';
  }
  const x = pad.axes[0] ?? 0;
  const y = pad.axes[1] ?? 0;
  const threshold = previous ? GAMEPAD_RELEASE_ZONE : GAMEPAD_DEADZONE;
  if (Math.max(Math.abs(x), Math.abs(y)) < threshold) return null;
  if (Math.abs(x) > Math.abs(y) || (Math.abs(x) === Math.abs(y) && (previous === 'left' || previous === 'right'))) return x < 0 ? 'left' : 'right';
  return y < 0 ? 'forward' : 'back';
}

function sanitizeId(id: string): string {
  const clean = id.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 256);
  return clean || 'unknown-controller';
}

function deviceKey(index: number, id: string): string { return `${index}:${id}`; }

/**
 * Per-controller policy above the shell-owned transport. Index selects a current
 * snapshot slot only; index + sanitized id + epoch is the short-lived lease.
 */
export class GamepadRouter {
  private readonly leases = new Map<number, Lease>();
  private readonly reclaimable = new Map<string, SeatId>();
  private latest: GamepadState | null = null;
  private epoch = 0;
  private frameSafe = true;
  private closed = false;

  constructor(private readonly options: GamepadRouterOptions) {}

  receive(state: GamepadState, now: number): void {
    if (this.closed) return;
    this.latest = state;
    if (!state.available) {
      this.reconcile([], now);
      return;
    }
    if (!state.focused) {
      this.reconcile(state.pads.filter((pad): pad is GamepadSnapshot => !!pad && pad.connected && pad.mapping === 'standard'), now, false);
      if (this.frameSafe) this.options.onFrameSafetyLost?.();
      this.frameSafe = false;
      return;
    }
    this.frameSafe = true;
    this.reconcile(state.pads.filter((pad): pad is GamepadSnapshot => !!pad && pad.connected && pad.mapping === 'standard'), now);
  }

  /** Assign only the currently observed identity; a stale UI selection cannot steal a new epoch. */
  assign(identity: GamepadDevice, seat: SeatId, preserveCurrentInput = false): boolean {
    const lease = this.leases.get(identity.index);
    if (!lease || lease.device.id !== sanitizeId(identity.id) || lease.device.epoch !== identity.epoch) return false;
    if ([...this.leases.values()].some(candidate => candidate !== lease && candidate.seat === seat)) return false;
    lease.seat = seat;
    lease.reclaimSeat = null;
    this.reclaimable.delete(deviceKey(lease.device.index, lease.device.id));
    if (!preserveCurrentInput) this.seed(lease);
    this.options.lifecycle?.({ type: 'assigned', device: lease.device, seat });
    return true;
  }

  /** Explicit reclaim is intentionally separate from seeing a same-id snapshot. */
  reclaim(identity: GamepadDevice): boolean {
    const lease = this.leases.get(identity.index);
    return !!lease && !!lease.reclaimSeat && this.assign(identity, lease.reclaimSeat);
  }

  /**
   * Forget this router's seat association after a setup leave or Back-to-solo.
   * Session departure is deliberately caller-owned; this only clears controller
   * policy and seeds the current snapshot so a held control cannot rejoin.
   */
  release(seat: SeatId): boolean {
    let released = false;
    for (const lease of this.leases.values()) {
      if (lease.seat !== seat && lease.reclaimSeat !== seat) continue;
      if (lease.seat === seat) lease.seat = null;
      if (lease.reclaimSeat === seat) lease.reclaimSeat = null;
      this.seed(lease);
      released = true;
    }
    for (const [key, rememberedSeat] of this.reclaimable) {
      if (rememberedSeat !== seat) continue;
      this.reclaimable.delete(key);
      released = true;
    }
    return released;
  }

  update(now: number): void {
    if (this.closed || !this.latest?.available || !this.latest.focused) return;
    const context = this.options.context();
    for (const lease of this.leases.values()) {
      if (!lease.seat || lease.context !== context || !lease.directionArmed || !lease.direction || now < lease.repeatAt) continue;
      lease.repeatAt = now + GAMEPAD_REPEAT_INTERVAL;
      this.options.dispatch({ seat: lease.seat, direction: lease.direction });
      if (lease.context !== this.options.context()) this.seed(lease);
    }
  }

  /** Context/assignment changes seed every complete snapshot before routing resumes. */
  seedAll(): void { for (const lease of this.leases.values()) this.seed(lease); }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const lease of [...this.leases.values()]) this.disconnect(lease);
    this.leases.clear(); this.latest = null;
  }

  private reconcile(pads: readonly GamepadSnapshot[], now: number, dispatch = true): void {
    const byIndex = new Map(pads.map(pad => [pad.index, pad]));
    for (const [index, lease] of [...this.leases]) {
      const next = byIndex.get(index);
      if (!next || sanitizeId(next.id) !== lease.device.id) this.disconnect(lease);
    }
    for (const pad of pads.slice().sort((a, b) => a.index - b.index)) {
      let lease = this.leases.get(pad.index);
      if (!lease) lease = this.createLease(pad);
      lease.pad = pad;
      const context = this.options.context();
      if (!dispatch || lease.context !== context) { this.seed(lease); continue; }
      this.process(lease, now);
    }
  }

  private createLease(pad: GamepadSnapshot): Lease {
    const id = sanitizeId(pad.id);
    const device: GamepadDevice = { index: pad.index, id, epoch: ++this.epoch, deviceId: `gamepad-${pad.index}` };
    const reclaimSeat = this.reclaimable.get(deviceKey(device.index, device.id)) ?? null;
    const lease: Lease = { device, seat: null, reclaimSeat, pad, held: new Set(), direction: null, directionArmed: false, repeatAt: Infinity, context: this.options.context() };
    this.leases.set(pad.index, lease);
    this.seed(lease);
    this.options.lifecycle?.({ type: 'seen', device });
    if (reclaimSeat) this.options.lifecycle?.({ type: 'reclaim-offered', device, seat: reclaimSeat });
    return lease;
  }

  private disconnect(lease: Lease): void {
    if (this.leases.get(lease.device.index) === lease) this.leases.delete(lease.device.index);
    if (lease.seat) this.reclaimable.set(deviceKey(lease.device.index, lease.device.id), lease.seat);
    lease.held.clear(); lease.direction = null; lease.directionArmed = false; lease.repeatAt = Infinity;
    this.options.lifecycle?.({ type: 'disconnected', device: lease.device, ...(lease.seat ? { seat: lease.seat } : {}) });
  }

  private seed(lease: Lease): void {
    lease.context = this.options.context();
    lease.held = new Set(observedButtons.filter(index => pressed(lease.pad, index)));
    lease.direction = directionOf(lease.pad, null);
    lease.directionArmed = false; lease.repeatAt = Infinity;
  }

  private process(lease: Lease, now: number): void {
    const nextHeld = new Set(observedButtons.filter(index => pressed(lease.pad, index)));
    const freshButtons = [...nextHeld].filter(index => !lease.held.has(index));
    const nextDirection = directionOf(lease.pad, lease.direction);
    const freshDirection = !!nextDirection && nextDirection !== lease.direction;
    lease.held = nextHeld;

    if (!lease.seat) {
      // Keep a released stick/D-pad neutral even before it owns a seat; otherwise
      // the next deliberate direction would compare against the stale baseline.
      if (!nextDirection) {
        lease.direction = null;
        lease.directionArmed = false;
        lease.repeatAt = Infinity;
      }
      if (!freshButtons.length && !freshDirection) return;
      if (lease.reclaimSeat) {
        this.options.requestReclaim?.(lease.device, lease.reclaimSeat);
        this.seed(lease);
        return;
      }
      // A neutral connection is never participation.  The first pad with an
      // actual edge claims P1, and preserveCurrentInput lets that same edge
      // start or move solo play without asking for a second press.
      if (this.options.requestFirstPlayer?.(lease.device) && lease.seat) {
        // fall through to the assigned-seat action/direction routing below
      } else {
        if (this.options.acceptsDevice?.(lease.device) !== false) this.options.requestLocalPlay?.(lease.device);
        this.seed(lease);
        return;
      }
    }

    for (const [index, action] of actionButtons) {
      if (!freshButtons.includes(index)) continue;
      this.options.action?.(lease.seat, action);
      if (lease.context !== this.options.context()) { this.seed(lease); return; }
    }
    if (!nextDirection) {
      lease.direction = null; lease.directionArmed = false; lease.repeatAt = Infinity;
      return;
    }
    if (!freshDirection) return;
    lease.direction = nextDirection;
    lease.directionArmed = true;
    lease.repeatAt = now + GAMEPAD_REPEAT_DELAY;
    this.options.dispatch({ seat: lease.seat, direction: nextDirection });
    if (lease.context !== this.options.context()) this.seed(lease);
  }
}
