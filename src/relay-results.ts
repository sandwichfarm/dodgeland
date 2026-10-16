import type { SeatId, SessionParticipation, SessionResult } from './session.js';

export type RelayLegOutcome = 'complete' | 'dead' | 'skipped' | 'left' | 'ended';
export interface RelayIdentity { readonly seat: SeatId; readonly participantId: string; readonly characterId: string }
export interface RelayLegToken { readonly seat: SeatId; readonly participantId: string; readonly leg: number; readonly generation: number }
export interface RelayCredit { readonly distance: number; readonly coins: number; readonly pickups: number; readonly selfRevives: number; readonly deaths: number }
export interface RelayLeg extends RelayIdentity, RelayCredit {
  readonly leg: number; readonly generation: number; readonly startFrontier: number; readonly endFrontier: number;
  readonly startTime: number; readonly endTime: number; readonly duration: number;
  readonly startPosition: Readonly<{ x: number; y: number }>; readonly endPosition: Readonly<{ x: number; y: number }>;
  readonly outcome: RelayLegOutcome;
}
export interface RelayParticipant extends RelayIdentity, RelayCredit {
  readonly lifecycle: SessionParticipation; readonly connected: boolean; readonly legs: number; readonly duration: number; readonly skips: number;
  readonly rank: number; readonly rankLabel: string;
}
export type RelayWrite = Readonly<{ ok: true }> | Readonly<{ ok: false; reason: 'terminal' | 'duplicate' | 'stale' | 'wrong-owner' | 'closed' | 'invalid' }>;
export interface RelayLedgerEvent { readonly id: string; readonly kind: 'open' | 'credit' | 'close' | 'lifecycle' | 'skip'; readonly seat: SeatId; readonly participantId: string; readonly leg: number; readonly generation: number; readonly credit?: RelayCredit; readonly death?: Readonly<{ cause: string; wallet: number }>; readonly outcome?: RelayLegOutcome; readonly lifecycle?: SessionParticipation; readonly connected?: boolean }
const zero = (): RelayCredit => ({ distance: 0, coins: 0, pickups: 0, selfRevives: 0, deaths: 0 });
const accepted: RelayWrite = Object.freeze({ ok: true });
const reject = (reason: Extract<RelayWrite, { ok: false }>['reason']): RelayWrite => Object.freeze({ ok: false, reason });
const copyPoint = (point: Readonly<{ x: number; y: number }>) => Object.freeze({ x: point.x, y: point.y });
type OpenLeg = RelayIdentity & RelayLegToken & { startFrontier: number; startTime: number; startPosition: Readonly<{ x: number; y: number }>; credit: RelayCredit };

/** Append-only accepted outcomes. Neither callers nor result views receive mutable owners. */
export function createRelayLedger(roster: readonly RelayIdentity[]) {
  const identities = Object.freeze(roster.map(row => Object.freeze({ seat: row.seat, participantId: row.participantId, characterId: row.characterId })));
  const events: RelayLedgerEvent[] = [], legs: RelayLeg[] = [], seen = new Set<string>();
  const lifecycle = new Map(identities.map(row => [row.participantId, { lifecycle: 'active' as SessionParticipation, connected: true, generation: 0 }]));
  let current: OpenLeg | undefined, terminal = false, lastLeg = 0;
  function check(id: string, token?: RelayLegToken): RelayWrite {
    if (terminal) return reject('terminal');
    if (seen.has(id)) return reject('duplicate');
    if (!id) return reject('invalid');
    if (token) {
      if (!current) return reject('closed');
      if (token.seat !== current.seat || token.participantId !== current.participantId) return reject('wrong-owner');
      if (token.leg !== current.leg || token.generation !== current.generation) return reject('stale');
    }
    return accepted;
  }
  function append(event: RelayLedgerEvent): void { seen.add(event.id); events.push(Object.freeze(event)); }
  return {
    token(): RelayLegToken | undefined { return current && Object.freeze({ seat: current.seat, participantId: current.participantId, leg: current.leg, generation: current.generation }); },
    open(input: RelayLegToken & { id: string; frontier: number; time: number; position: Readonly<{ x: number; y: number }> }): RelayWrite {
      const result = check(input.id); if (!result.ok) return result;
      const identity = identities.find(row => row.seat === input.seat && row.participantId === input.participantId);
      if (!identity) return reject('wrong-owner');
      if (current || input.leg <= lastLeg || input.generation < (lifecycle.get(input.participantId)?.generation ?? 0)) return reject('stale');
      if (![input.frontier, input.time, input.position.x, input.position.y].every(Number.isFinite)) return reject('invalid');
      current = { ...identity, leg: input.leg, generation: input.generation, startFrontier: input.frontier, startTime: input.time, startPosition: copyPoint(input.position), credit: zero() }; lastLeg = input.leg;
      append({ id: input.id, kind: 'open', ...this.token()! }); return accepted;
    },
    credit(input: RelayLegToken & { id: string; delta: RelayCredit; death?: Readonly<{ cause: string; wallet: number }> }): RelayWrite {
      const result = check(input.id, input); if (!result.ok) return result;
      if (Object.keys(zero()).some(key => !Number.isFinite(input.delta[key as keyof RelayCredit]) || input.delta[key as keyof RelayCredit] < 0)) return reject('invalid');
      const delta: RelayCredit = Object.freeze({ distance: input.delta.distance, coins: input.delta.coins, pickups: input.delta.pickups, selfRevives: input.delta.selfRevives, deaths: input.delta.deaths });
      current!.credit = Object.fromEntries(Object.keys(zero()).map(key => [key, current!.credit[key as keyof RelayCredit] + delta[key as keyof RelayCredit]])) as unknown as RelayCredit;
      append({ id: input.id, kind: 'credit', ...this.token()!, credit: delta, ...(input.death ? { death: Object.freeze({ cause: input.death.cause, wallet: input.death.wallet }) } : {}) }); return accepted;
    },
    skip(input: RelayLegToken & { id: string }): RelayWrite {
      const result = check(input.id, current ? input : undefined); if (!result.ok) return result;
      const identity = identities.find(row => row.seat === input.seat && row.participantId === input.participantId);
      if (!identity) return reject('wrong-owner');
      if (!current && (input.leg !== 0 || input.generation !== lifecycle.get(input.participantId)!.generation)) return reject('stale');
      append({ id: input.id, kind: 'skip', seat: input.seat, participantId: input.participantId, leg: input.leg, generation: input.generation, outcome: 'skipped' }); return accepted;
    },
    close(input: RelayLegToken & { id: string; frontier: number; time: number; duration: number; position: Readonly<{ x: number; y: number }>; outcome: RelayLegOutcome }): RelayWrite {
      const result = check(input.id, input); if (!result.ok) return result;
      if (![input.frontier, input.time, input.position.x, input.position.y].every(Number.isFinite) || input.time < current!.startTime || input.frontier < current!.startFrontier) return reject('invalid');
      const { credit, ...opened } = current!;
      if (!Number.isFinite(input.duration) || input.duration < 0 || input.duration > input.time - current!.startTime + 1e-6) return reject('invalid');
      legs.push(Object.freeze({ ...opened, ...credit, endFrontier: input.frontier, endTime: input.time, duration: input.duration, endPosition: copyPoint(input.position), outcome: input.outcome }));
      append({ id: input.id, kind: 'close', ...this.token()!, outcome: input.outcome }); current = undefined; return accepted;
    },
    lifecycle(input: RelayIdentity & { id: string; generation: number; lifecycle: SessionParticipation; connected: boolean }): RelayWrite {
      const result = check(input.id); if (!result.ok) return result;
      const original = identities.find(row => row.seat === input.seat && row.participantId === input.participantId && row.characterId === input.characterId);
      if (!original) return reject('wrong-owner');
      const prior = lifecycle.get(input.participantId)!;
      if (input.generation <= prior.generation) return reject('stale');
      lifecycle.set(input.participantId, { lifecycle: input.lifecycle, connected: input.connected, generation: input.generation });
      if (current?.participantId === input.participantId) current = { ...current, generation: input.generation };
      append({ id: input.id, kind: 'lifecycle', seat: input.seat, participantId: input.participantId, leg: current?.leg ?? lastLeg, generation: input.generation, lifecycle: input.lifecycle, connected: input.connected }); return accepted;
    },
    snapshot() {
      return Object.freeze({ events: Object.freeze([...events]), legs: Object.freeze([...legs]), roster: Object.freeze(identities.map(row => Object.freeze({ ...row, ...lifecycle.get(row.participantId)! }))), current: current && Object.freeze({ ...current, credit: Object.freeze({ ...current.credit }) }), terminal });
    },
    freeze(): RelayWrite { if (terminal) return reject('terminal'); if (current) return reject('invalid'); terminal = true; return accepted; },
  };
}
export type RelayLedger = ReturnType<typeof createRelayLedger>;
export interface RelayResult extends SessionResult {
  readonly mode: 'relay'; readonly distance: number; readonly elapsedSeconds: number; readonly seedCode: string | null;
  readonly contributions: readonly RelayParticipant[]; readonly legs: readonly RelayLeg[]; readonly events: readonly RelayLedgerEvent[];
  readonly podium: readonly Readonly<{ rank: number; label: string; participants: readonly string[] }>[];
}
const finalized = new WeakMap<RelayLedger, RelayResult>();
/** Finalize the common SessionResult once, preserving its mode/outcome authority. */
export function finalizeRelayResult(ledger: RelayLedger, common: SessionResult & { distance: number; elapsedSeconds: number; seedCode: string | null }): RelayResult {
  const existing = finalized.get(ledger); if (existing) return existing;
  const state = ledger.snapshot();
  if (state.current) throw new Error('Close the current Relay leg before finalization.');
  ledger.freeze();
  const totals = state.roster.map(player => {
    const own = state.legs.filter(leg => leg.participantId === player.participantId);
    const total = own.reduce((sum, leg) => ({ distance: sum.distance + leg.distance, coins: sum.coins + leg.coins, pickups: sum.pickups + leg.pickups, selfRevives: sum.selfRevives + leg.selfRevives, deaths: sum.deaths + leg.deaths }), zero());
    return { ...player, ...total, legs: own.length, duration: own.reduce((sum, leg) => sum + leg.duration, 0), skips: state.events.filter(event => event.kind === 'skip' && event.participantId === player.participantId).length };
  });
  const contributions = Object.freeze(totals.map(player => { const rank = 1 + totals.filter(other => other.distance > player.distance).length; const tied = totals.filter(other => other.distance === player.distance).length > 1; return Object.freeze({ ...player, rank, rankLabel: `${tied ? '=' : ''}${rank}` }); }));
  const podium = Object.freeze([...new Set(contributions.map(p => p.rank))].sort((a,b) => a-b).map(rank => Object.freeze({ rank, label: contributions.find(p => p.rank === rank)!.rankLabel, participants: Object.freeze(contributions.filter(p => p.rank === rank).map(p => p.participantId)) })));
  const result: RelayResult = Object.freeze({ mode: 'relay', outcome: common.outcome, distance: common.distance, elapsedSeconds: common.elapsedSeconds, seedCode: common.seedCode, contributions, legs: state.legs, events: state.events, podium });
  finalized.set(ledger, result); return result;
}
