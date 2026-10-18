/**
 * Recovery is deliberately a data transaction.  The session supplies its
 * current, read-only player and safe-cell observations; this module either
 * returns a frozen whole-plan or a typed rejection.  No inventory or player
 * field changes while a plan is being assembled.
 */
export type RecoveryKind = 'personal' | 'revival' | 'flare';
export type RecoveryParticipation = 'active' | 'device-lost' | 'departed' | 'dead';

export interface RecoveryCell { readonly x: number; readonly y: number }
export interface RecoverySubject {
  readonly seat: string;
  readonly participation: RecoveryParticipation;
  readonly state: 'ready' | 'playing' | 'paused' | 'dead';
  readonly deathGeneration: number;
  readonly offerGeneration?: number;
  readonly offerDeadline?: number;
  readonly charged: boolean;
}
export interface RecoveryRequest {
  readonly kind: RecoveryKind;
  readonly tick: number;
  readonly now: number;
  readonly owner: RecoverySubject;
  readonly targets: readonly RecoverySubject[];
  /** Flare relocates all living teammates as well as its returned dead targets. */
  readonly participants?: readonly RecoverySubject[];
  /** Candidates are already supported, unoccupied, in-bounds and hazard-free. */
  readonly cells: readonly RecoveryCell[];
  readonly protectionSeconds: number;
}
export interface RecoveryPlan {
  readonly ok: true;
  readonly kind: RecoveryKind;
  readonly tick: number;
  readonly ownerSeat: string;
  readonly placements: readonly Readonly<{ seat: string; cell: RecoveryCell; deathGeneration: number }> [];
  readonly protectionUntil: number;
}
export interface RecoveryRejection { readonly ok: false; readonly reason: string }
export type RecoveryDecision = RecoveryPlan | RecoveryRejection;

const reject = (reason: string): RecoveryRejection => Object.freeze({ ok: false, reason });
const stable = <T extends RecoverySubject>(subjects: readonly T[]): readonly T[] => [...subjects].sort((a, b) => a.seat.localeCompare(b.seat));
/** A board pause freezes simulation time; it does not make an active seat dead. */
export const isLivingRecoverySubject = (subject: Pick<RecoverySubject, 'participation' | 'state'>): boolean => subject.participation === 'active' && (subject.state === 'playing' || subject.state === 'paused');

/** Return a complete, distinct placement plan without changing mutable session state. */
export function planRecovery(request: RecoveryRequest): RecoveryDecision {
  const { owner, targets, cells } = request;
  if (!Number.isFinite(request.now) || !Number.isInteger(request.tick) || request.tick < 0 || !Number.isFinite(request.protectionSeconds) || request.protectionSeconds <= 0) return reject('invalid-clock');
  if (request.kind !== 'personal' && !isLivingRecoverySubject(owner)) return reject('inactive-owner');
  const selected = request.kind === 'personal' ? [owner] : request.kind === 'flare' ? stable(request.participants ?? [owner, ...targets]) : stable(targets);
  if (!selected.length) return reject('no-targets');
  if (request.kind === 'personal') {
    if (owner.participation !== 'dead' || owner.state !== 'dead') return reject('personal-not-dead');
    if (!owner.charged || owner.offerGeneration !== owner.deathGeneration || owner.offerDeadline === undefined || request.now >= owner.offerDeadline) return reject('personal-offer-invalid');
  } else if ((request.kind === 'revival' && targets.length !== 1) || (request.kind === 'flare' && targets.length < 1)) return reject('invalid-target-count');
  else if (targets.some(target => target.seat === owner.seat || target.participation !== 'dead' || target.state !== 'dead')) return reject('ineligible-target');
  if (new Set(selected.map(subject => subject.seat)).size !== selected.length || (request.kind === 'flare' && (!selected.some(subject => subject.seat === owner.seat) || targets.some(target => !selected.some(subject => subject.seat === target.seat)) || selected.some(subject => subject.participation !== 'dead' && !isLivingRecoverySubject(subject))))) return reject('invalid-participants');
  if (cells.length < selected.length) return reject('no-safe-placement');
  const seen = new Set<string>();
  const placements = [] as { seat: string; cell: RecoveryCell; deathGeneration: number }[];
  for (let index = 0; index < selected.length; index++) {
    const cell = cells[index]!;
    const key = `${cell.x}:${cell.y}`;
    if (!Number.isFinite(cell.x) || !Number.isFinite(cell.y) || seen.has(key)) return reject('duplicate-placement');
    seen.add(key); placements.push(Object.freeze({ seat: selected[index]!.seat, cell: Object.freeze({ ...cell }), deathGeneration: selected[index]!.deathGeneration }));
  }
  return Object.freeze({ ok: true, kind: request.kind, tick: request.tick, ownerSeat: owner.seat, placements: Object.freeze(placements), protectionUntil: request.now + request.protectionSeconds });
}

export interface RecoveryCommitHooks {
  /** Revalidate tick, lifecycle, generation and safe cells immediately before mutation. */
  readonly valid: (plan: RecoveryPlan) => boolean;
  /** Debit is optional for personal revive and must never run for an invalid plan. */
  readonly debit?: (plan: RecoveryPlan) => boolean;
  readonly apply: (plan: RecoveryPlan) => void;
}

/** Commit exactly one already-complete plan.  Invalid plans never debit or restore. */
export function commitRecoveryPlan(plan: RecoveryDecision, hooks: RecoveryCommitHooks): boolean {
  if (!plan.ok || !hooks.valid(plan)) return false;
  if (hooks.debit && !hooks.debit(plan)) return false;
  hooks.apply(plan);
  return true;
}
