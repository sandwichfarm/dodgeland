import { CHARACTERS } from './content.js';
import type { Game } from './game.js';
import type { ModeDefinition } from './mode-rules.js';
import { LocalSession } from './session.js';
import { SessionRecoveryController } from './session-recovery.js';
import { createRelayLedger, finalizeRelayResult } from './relay-results.js';
import type { RelayLedger, RelayResult } from './relay-results.js';
import type { DeviceId, SeatId, SessionModeDefinition, SessionPlayer, SessionRecoveryRequest, SessionContributionObservation } from './session.js';

export interface RelaySeat { readonly seat: SeatId; readonly characterId: string; readonly device: DeviceId; readonly disconnected?: boolean }
export interface RelayProposal { readonly seats: readonly RelaySeat[]; readonly tilesPerLeg?: string | number }
export interface RelaySetup { readonly seats: readonly RelaySeat[]; readonly tilesPerLeg: number }
export interface RelayConfirmation { readonly seat: SeatId; readonly device: DeviceId; readonly generation: number; readonly participantId: string; readonly lifecycleGeneration: number }
export interface RelayBoundary { readonly target: number; readonly seat: SeatId; readonly participantId: string; readonly lifecycleGeneration: number }
export type RelayPhase = 'running' | 'handoff' | 'disconnected' | 'waiting-for-reclaim' | 'confirm-skip' | 'confirm-leave' | 'recovery' | 'ended';
export interface RelayActionToken { readonly actor: SeatId; readonly participantId: string; readonly generation: number; readonly lifecycleGeneration: number }
export interface RelayOutcome { readonly leg: number; readonly seat: SeatId; readonly participantId: string; readonly outcome: 'complete' | 'skipped' | 'left' | 'dead'; readonly distance: number; readonly time: number; readonly statistics: Readonly<SessionPlayer['statistics']> }
export const RELAY_LOCKED = 'Relay roster is locked for this run.';

/** Validate the whole proposal before touching a live game or participant. */
export function validateRelaySetup(proposal: RelayProposal): RelaySetup {
  const value = proposal.tilesPerLeg ?? 50;
  if (!/^[1-9]\d{0,2}$/.test(String(value)) || !Number.isInteger(Number(value))) throw new RangeError('Choose 1–999 whole tiles per leg.');
  const seats = proposal.seats;
  if (seats.length < 2 || seats.length > 4 || !seats.some(player => player.seat === 'p1') || seats.some(player => !['p1', 'p2', 'p3', 'p4'].includes(player.seat) || player.disconnected || !/^(keyboard-[ab]|gamepad-(?:0|[1-9]\d*))$/.test(player.device) || !CHARACTERS.some(character => character.id === player.characterId)) || new Set(seats.map(player => player.seat)).size !== seats.length || new Set(seats.map(player => player.device)).size !== seats.length) throw new TypeError('Choose two to four ready players with different devices.');
  for (const player of seats) {
    const first = seats.find(candidate => candidate.characterId === player.characterId);
    if (first !== player) throw new TypeError(`Already chosen by ${first!.seat.toUpperCase()}.`);
  }
  return Object.freeze({ seats: Object.freeze(seats.map(player => Object.freeze({ seat: player.seat, device: player.device, characterId: player.characterId }))), tilesPerLeg: Number(value) });
}

export class RelayCoordinator {
  private attached: LocalSession | undefined;
  private index = 0;
  private leg = 1;
  private frontier = 0;
  private origin = 0;
  private nextBoundary = 0;
  private observedEarned = 0;
  private distance = 0;
  private pending: RelayBoundary | undefined;
  private phase: RelayPhase = 'running';
  private suspended: 'running' | 'handoff' | 'recovery' = 'running';
  private confirmationState: { phase: RelayPhase; actor: SeatId; kind: 'skip' | 'leave' } | undefined;
  private revision = 0;
  private readonly connections = new Map<SeatId, boolean>();
  private readonly outcomes: RelayOutcome[] = [];
  private rotationPending = false;
  private terminalReason: 'no-eligible-runner' | undefined;
  private generation = 0;
  private ledger!: RelayLedger;
  private eventSequence = 0;
  private observedTime = 0;
  private activeDuration = 0;
  private readonly observed = new Map<SeatId, { coins: number; pickups: number; selfRevives: number; deaths: number; distance: number }>();
  private readyReason: RelayOutcome['outcome'] | undefined;
  private readonly recovery = new SessionRecoveryController();
  constructor(readonly setup: RelaySetup) {}
  get session(): LocalSession { if (!this.attached) throw new Error('Relay is not started.'); return this.attached; }
  get activeSeat(): SeatId { return this.setup.seats[this.index]!.seat; }
  get incomingSeat(): SeatId { return this.readyReason ? this.activeSeat : this.nextEligible() ?? this.activeSeat; }
  get history() { return this.ledger.snapshot(); }
  get result(): RelayResult | undefined { return this.session.result as RelayResult | undefined; }
  attach(session: LocalSession): void {
    this.attached = session; this.origin = this.frontier = session.world.frontier;
    for (const seat of this.setup.seats) this.connections.set(seat.seat, true);
    this.nextBoundary = this.futureBoundary(); this.observedEarned = this.runner()!.earnedDistance; this.recovery.attach(session);
    this.ledger = createRelayLedger(this.setup.seats.map(seat => session.players.find(p => p.seat === seat.seat)!));
    for (const player of session.players) this.observed.set(player.seat, { coins: player.coins, pickups: player.statistics.pickups, selfRevives: player.statistics.selfRevives, deaths: player.statistics.deaths, distance: 0 });
    this.openLeg(); session.installCoOpMarket({ consumables: false, name: 'Relay', capabilities: [], closeOnInvalidate: true });
    session.installSharedWorldEffects();
  }
  private eventId(): string { return `${this.session.id}:${++this.eventSequence}`; }
  private openLeg(): void {
    const p = this.runner()!; this.activeDuration = 0; this.observedTime = this.session.world.time;
    this.observed.get(p.seat)!.distance = 0;
    this.ledger.open({ id: this.eventId(), seat: p.seat, participantId: p.participantId, leg: this.leg, generation: this.eventSequence, frontier: this.session.world.frontier, time: this.session.world.time, position: { x: p.groundX, y: p.groundY } });
  }
  private capture(observation = this.session.contributionObservation(this.runner()!), death?: string): void {
    const token = this.ledger.token(); if (!token || token.seat !== observation.seat) return;
    if (this.phase === 'running') this.activeDuration += Math.max(0, observation.time - this.observedTime);
    this.observedTime = observation.time;
    const prior = this.observed.get(observation.seat)!;
    const current = { coins: observation.coins, pickups: observation.pickups, selfRevives: observation.selfRevives, deaths: observation.deaths + (death ? 1 : 0), distance: this.distance };
    const delta = { coins: Math.max(0, current.coins-prior.coins), pickups: Math.max(0,current.pickups-prior.pickups), selfRevives: Math.max(0,current.selfRevives-prior.selfRevives), deaths: Math.max(0,current.deaths-prior.deaths), distance: Math.max(0,current.distance-prior.distance) };
    if (Object.values(delta).some(value => value > 0) || death) {
      const result = this.ledger.credit({ ...token, id: death ? `${observation.participantId}:death:${observation.deaths + 1}` : this.eventId(), delta, ...(death ? { death: { cause: death, wallet: observation.wallet } } : {}) });
      if (!result.ok) return;
    }
    this.observed.set(observation.seat, current);
  }
  beforeDeath(observation: SessionContributionObservation, cause: string): void { if (observation.seat === this.activeSeat && this.phase === 'running') this.capture(observation, cause); }
  beforeDepart(observation: SessionContributionObservation): void { if (observation.seat === this.activeSeat) { this.capture(observation); this.closeLeg('left'); } }
  private recordLifecycle(seat: SeatId): void {
    const player = this.session.players.find(p => p.seat === seat)!;
    const id = this.eventId(); this.ledger.lifecycle({ id, seat, participantId: player.participantId, characterId: player.characterId, generation: this.eventSequence, lifecycle: player.participation, connected: !!this.connections.get(seat) });
  }
  private runner(): SessionPlayer | undefined { return this.session.players.find(player => player.seat === this.activeSeat); }
  private futureBoundary(): number { return this.origin + (Math.floor((this.frontier - this.origin) / this.setup.tilesPerLeg) + 1) * this.setup.tilesPerLeg; }
  private lifecycleGeneration(seat: SeatId): number { return this.session.lifecycle.filter(record => record.seat === seat).length; }
  private eligible(seat: SeatId): boolean { const p = this.session.players.find(p => p.seat === seat); return this.connections.get(seat) === true && p?.participation === 'active' && p.state === 'playing'; }
  private lifecycleActor(seat: SeatId): boolean {
    const player = this.session.players.find(p => p.seat === seat);
    return this.eligible(seat) || (this.connections.get(seat) === true && seat === this.activeSeat && player?.participation === 'dead' && !!player.recovery?.offer);
  }
  private nextEligible(): SeatId | undefined {
    for (let offset = 1; offset <= this.setup.seats.length; offset++) { const seat = this.setup.seats[(this.index + offset) % this.setup.seats.length]!.seat; if (this.eligible(seat)) return seat; }
    return undefined;
  }
  private setPhase(phase: RelayPhase): void { if (this.phase !== phase) { this.session.invalidateOwnerInteractions(); this.phase = phase; this.revision++; } }
  allowsLifecycle(_kind: string, seat: SeatId, device?: DeviceId): boolean {
    const original = this.setup.seats.find(p => p.seat === seat), player = this.session.players.find(p => p.seat === seat);
    return this.phase !== 'ended' && !!original && player?.participation !== 'departed' && (!device || device === original.device);
  }
  disconnect(seat: SeatId): void {
    if (!this.allowsLifecycle('device-lost', seat)) return;
    this.connections.set(seat, false); this.revision++;
    this.recordLifecycle(seat);
    if (seat === this.activeSeat && (this.phase === 'running' || this.phase === 'handoff' || this.phase === 'recovery')) this.suspended = this.phase;
    this.refreshAvailability();
  }
  reclaimed(seat: SeatId): void {
    if (!this.allowsLifecycle('reclaimed', seat)) return;
    this.connections.set(seat, true); this.revision++;
    this.recordLifecycle(seat);
    if (seat === this.activeSeat && this.pending) this.pending = Object.freeze({ ...this.pending, lifecycleGeneration: this.lifecycleGeneration(seat) + 1 });
    this.refreshAvailability();
  }
  reclaim(seat: SeatId, device: DeviceId): boolean {
    if (!this.allowsLifecycle('reclaimed', seat, device) || this.connections.get(seat)) return false;
    const player = this.session.players.find(p => p.seat === seat)!;
    if (player.participation === 'device-lost') return this.session.reclaim(seat, device);
    if (player.participation !== 'dead') return false;
    this.connections.set(seat, true); this.revision++; this.recordLifecycle(seat); this.refreshAvailability(); return true;
  }
  private refreshAvailability(): void {
    if (this.phase === 'ended') return;
    if (this.confirmationState && (!this.lifecycleActor(this.confirmationState.actor) || (this.confirmationState.kind === 'skip' && this.connections.get(this.activeSeat)))) { const prior = this.confirmationState.phase; this.confirmationState = undefined; this.setPhase(prior); }
    if (this.rotationPending) { this.rotate(); return; }
    if (!this.connections.get(this.activeSeat)) {
      if (this.phase === 'running' || this.phase === 'handoff' || this.phase === 'recovery') this.suspended = this.phase;
      this.setPhase(this.nextEligible() ? 'disconnected' : 'waiting-for-reclaim'); return;
    }
    if (this.phase === 'disconnected' || this.phase === 'waiting-for-reclaim') this.setPhase(this.suspended);
  }
  actionToken(actor: SeatId): RelayActionToken {
    return Object.freeze({ actor, participantId: this.session.players.find(p => p.seat === actor)?.participantId ?? '', generation: this.revision, lifecycleGeneration: this.session.lifecycle.length });
  }
  command(input: RelayActionToken & { kind: 'skip' | 'leave' | 'cancel' | 'confirm' }): boolean {
    const token = this.actionToken(input.actor);
    if (this.phase === 'ended' || !this.lifecycleActor(input.actor) || input.generation !== token.generation || input.lifecycleGeneration !== token.lifecycleGeneration || input.participantId !== token.participantId) return false;
    if (input.kind === 'skip' || input.kind === 'leave') {
      if (this.confirmationState || (input.kind === 'skip' && (this.connections.get(this.activeSeat) || input.actor === this.activeSeat || !!this.runner()?.recovery?.offer))) return false;
      this.confirmationState = { phase: this.phase, actor: input.actor, kind: input.kind };
      this.setPhase(input.kind === 'skip' ? 'confirm-skip' : 'confirm-leave'); return true;
    }
    const context = this.confirmationState;
    if (!context || context.actor !== input.actor) return false;
    this.confirmationState = undefined; this.setPhase(context.phase);
    if (input.kind === 'cancel') return true;
    if (context.kind === 'leave') return this.session.depart(input.actor, 'relay-left');
    const player = this.runner()!;
    const skipToken = this.ledger.token() ?? { seat: player.seat, participantId: player.participantId, leg: 0, generation: this.ledger.snapshot().roster.find(row => row.participantId === player.participantId)!.generation };
    this.ledger.skip({ ...skipToken, id: this.eventId() });
    this.closeLeg('skipped'); this.rotationPending = true; this.rotate(); return true;
  }
  private closeLeg(outcome: RelayOutcome['outcome']): void {
    if (!this.ledger.token()) return;
    this.capture();
    const p = this.runner()!;
    if (this.outcomes.some(record => record.leg === this.leg)) return;
    this.outcomes.push(Object.freeze({ leg: this.leg, seat: p.seat, participantId: p.participantId, outcome, distance: this.distance, time: this.session.world.time, statistics: Object.freeze({ ...p.statistics }) }));
    this.ledger.close({ ...this.ledger.token()!, id: this.eventId(), frontier: this.session.world.frontier, time: this.session.world.time, duration: this.activeDuration, position: { x: p.groundX, y: p.groundY }, outcome });
  }
  departed(seat: SeatId): void {
    if (this.phase === 'ended') return;
    const player = this.session.players.find(p => p.seat === seat);
    if (player?.recovery?.offer) this.session.updateRecovery(player, recovery => ({ ...recovery, offer: undefined }));
    this.connections.set(seat, false); this.revision++;
    this.recordLifecycle(seat);
    if (seat === this.activeSeat) { this.closeLeg('left'); this.rotationPending = true; this.rotate(); }
    else this.refreshAvailability();
  }
  private rotate(): void {
    const next = this.nextEligible();
    if (!next) {
      const reserved = this.session.players.some(p => p.participation === 'device-lost' || (p.participation === 'dead' && !!p.recovery?.offer));
      if (reserved) { this.setPhase('waiting-for-reclaim'); return; }
      this.finish('no-eligible-runner'); return;
    }
    const outgoing = this.runner()!, last = outgoing.recovery?.lastSafe;
    const exact = this.session.isRecoverySafePosition(outgoing) ? { x: outgoing.groundX, y: outgoing.groundY } : last;
    const candidates = [exact, ...this.session.recoverySafeCells('personal', outgoing, [])].filter((p): p is { x: number; y: number } => !!p);
    // Search retained terrain only if the last safe anchor has since been overtaken.
    for (const row of [...this.session.world.rows.keys()].filter(row => row >= this.session.world.frontier).sort((a, b) => a - b)) for (const x of [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5]) candidates.push({ x, y: row });
    const cell = candidates.find(cell => this.session.isSafeCell(cell));
    if (!cell || !this.session.placeTurnPosition(next, cell)) { this.setPhase('waiting-for-reclaim'); return; }
    this.index = this.setup.seats.findIndex(p => p.seat === next); this.distance = 0;
    this.frontier = Math.max(this.frontier, this.session.world.frontier); this.nextBoundary = this.futureBoundary(); this.pending = undefined;
    this.observedEarned = this.runner()!.earnedDistance; this.rotationPending = false; this.suspended = 'handoff'; this.readyReason = this.outcomes.at(-1)?.outcome ?? 'skipped'; this.generation++; this.setPhase('handoff');
  }
  finish(outcome: 'complete' | 'no-eligible-runner' = 'complete'): RelayResult {
    if (this.result) return this.result;
    if (this.ledger.token()) {
      this.capture(); const p = this.runner()!;
      this.ledger.close({ ...this.ledger.token()!, id: this.eventId(), frontier: this.session.world.frontier, time: this.session.world.time, duration: this.activeDuration, position: { x: p.groundX, y: p.groundY }, outcome: 'ended' });
    }
    if (outcome === 'no-eligible-runner') this.terminalReason = outcome;
    this.setPhase('ended');
    const result = finalizeRelayResult(this.ledger, { mode: 'relay', outcome, distance: this.session.world.frontier, elapsedSeconds: this.session.world.time, seedCode: this.session.world.host.seedCode });
    this.session.completeResult(result); return result;
  }
  death(seat: SeatId): void {
    if (seat !== this.activeSeat) return;
    this.pending = undefined; this.frontier = Math.max(this.frontier, this.session.world.frontier);
    this.nextBoundary = this.futureBoundary(); this.observedEarned = this.runner()!.earnedDistance;
    this.recovery.death(seat);
    this.recordLifecycle(seat);
    this.suspended = 'recovery'; this.setPhase('recovery');
  }
  pendingRecovery(session: LocalSession): boolean { return this.recovery.pending(session); }
  recover(session: LocalSession, request: SessionRecoveryRequest): boolean {
    if (this.phase !== 'recovery' || request.ownerSeat !== this.activeSeat || !this.connections.get(request.ownerSeat) || !this.recovery.recover(session, request)) return false;
    this.recordLifecycle(request.ownerSeat); this.observedTime = this.session.world.time;
    this.suspended = 'running'; this.setPhase('running'); this.capture(); return true;
  }
  canTransact(seat: SeatId): boolean { const player = this.runner(); return this.phase === 'running' && !this.pending && seat === this.activeSeat && this.connections.get(seat) === true && player?.participation === 'active' && (player.state === 'playing' || player.state === 'paused'); }
  canAct(seat: SeatId): boolean { return this.phase === 'running' && !this.pending && seat === this.activeSeat && this.eligible(seat); }
  progress(player: SessionPlayer, session: LocalSession): void {
    if (player.seat !== this.activeSeat || this.phase !== 'running' || player.participation !== 'active' || player.state !== 'playing') return;
    // Observe authored earnings only after the complete fixed tick. Position,
    // recovery and a frontier jump alone cannot open a transfer opportunity.
    const authored = player.earnedDistance > this.observedEarned;
    this.observedEarned = Math.max(this.observedEarned, player.earnedDistance);
    if (!authored || this.pending) return;
    const next = session.world.frontier;
    const delta = Math.max(0, next - this.frontier);
    this.distance += delta; this.frontier = Math.max(this.frontier, next);
    if (delta > 0 && this.frontier >= this.nextBoundary) this.pending = Object.freeze({ target: this.nextBoundary, seat: player.seat, participantId: player.participantId, lifecycleGeneration: this.lifecycleGeneration(player.seat) });
  }
  tick(session: LocalSession): void {
    this.recovery.tick(session);
    if (this.phase === 'recovery' && !this.runner()?.recovery?.offer) { this.closeLeg('dead'); this.rotationPending = true; this.rotate(); return; }
    const player = this.runner();
    if (player) this.progress(player, session);
    this.capture(); this.observedTime = session.world.time;
    if (this.phase === 'running' && this.pending && player?.participation === 'active' && player.state === 'playing' && this.pending.participantId === player.participantId && this.pending.lifecycleGeneration === this.lifecycleGeneration(player.seat) && session.isRecoverySafePosition(player)) { this.setPhase('handoff'); this.generation++; }
  }
  snapshot() {
    return Object.freeze({ phase: this.phase, activeSeat: this.activeSeat, incomingSeat: this.incomingSeat, leg: this.leg, distance: this.distance, nextBoundary: this.nextBoundary, pendingBoundary: this.pending, tilesPerLeg: this.setup.tilesPerLeg, transferGeneration: this.generation, roster: this.setup.seats, revision: this.revision, actionActor: this.confirmationState?.actor, outcomes: Object.freeze([...this.outcomes]), terminalReason: this.terminalReason, connections: Object.freeze(Object.fromEntries(this.connections)), readyReason: this.readyReason });
  }
  confirmation(): RelayConfirmation {
    const incoming = this.session.players.find(player => player.seat === this.incomingSeat)!;
    return Object.freeze({ seat: incoming.seat, device: incoming.device, participantId: incoming.participantId, generation: this.generation, lifecycleGeneration: this.session.lifecycle.length });
  }
  /** Only a fresh router edge bound to this transfer generation may call this. */
  confirm(input: RelayConfirmation): boolean {
    const incoming = this.session.players.find(player => player.seat === this.incomingSeat);
    if (this.readyReason) {
      if (this.phase !== 'handoff' || !incoming || !this.eligible(incoming.seat) || input.seat !== incoming.seat || input.device !== incoming.device || input.participantId !== incoming.participantId || input.generation !== this.generation || input.lifecycleGeneration !== this.session.lifecycle.length) return false;
      this.readyReason = undefined; this.leg++; this.openLeg(); this.setPhase('running'); return true;
    }
    if (this.phase !== 'handoff' || !this.pending || this.pending.lifecycleGeneration !== this.lifecycleGeneration(this.activeSeat) || input.generation !== this.generation || input.lifecycleGeneration !== this.session.lifecycle.length || input.participantId !== incoming?.participantId || input.seat !== this.incomingSeat || input.device !== incoming?.device || !this.session.transferPosition(this.activeSeat, this.incomingSeat)) return false;
    this.closeLeg('complete'); this.index = this.setup.seats.findIndex(p => p.seat === incoming.seat); this.leg++; this.distance = 0; this.frontier = Math.max(this.frontier, this.session.world.frontier);
    this.nextBoundary = this.futureBoundary(); this.observedEarned = incoming.earnedDistance; this.pending = undefined; this.openLeg(); this.setPhase('running');
    return true;
  }
}

export function createRelayDefinition(base: ModeDefinition, relay: RelayCoordinator): SessionModeDefinition {
  return Object.freeze({ definition: base, handlers: Object.freeze({
    attach: (session: LocalSession) => relay.attach(session),
    beforeDeath: (observation: SessionContributionObservation, cause: string) => relay.beforeDeath(observation, cause),
    beforeDepart: (observation: SessionContributionObservation) => relay.beforeDepart(observation),
    canAct: (seat: SeatId) => relay.canAct(seat), canTransact: (seat: SeatId) => relay.canTransact(seat), canAdmit: () => false,
    simulates: (player: SessionPlayer) => player.seat === relay.activeSeat,
    canAdvance: () => ['running', 'recovery'].includes(relay.snapshot().phase),
    canLifecycle: (kind: string, seat: SeatId, device?: DeviceId) => relay.allowsLifecycle(kind, seat, device),
    preserveReclaimPosition: true,
    deviceLost: (record: { seat: SeatId }) => relay.disconnect(record.seat),
    reclaim: (record: { seat: SeatId }) => relay.reclaimed(record.seat),
    depart: (record: { seat: SeatId }) => { relay.departed(record.seat); return { archiveContribution: true }; },
    progress: (player: SessionPlayer, session: LocalSession) => relay.progress(player, session),
    death: (record: { seat: SeatId }) => relay.death(record.seat),
    pending: (session: LocalSession) => relay.pendingRecovery(session),
    recover: (session: LocalSession, request: SessionRecoveryRequest) => relay.recover(session, request),
    tick: (session: LocalSession) => relay.tick(session),
  }) });
}

export function createRelaySession(game: Game, proposal: RelayProposal): RelayCoordinator {
  const setup = validateRelaySetup(proposal);
  if (game.state !== 'ready') throw new TypeError('Relay starts from a fresh ready course.');
  const relay = new RelayCoordinator(setup), primary = setup.seats.find(player => player.seat === 'p1')!;
  const original = game.characterId;
  try {
    game.setCharacter(primary.characterId);
    const stage = LocalSession.stage(game, { primaryDevice: primary.device, roster: setup.seats.filter((seat): seat is RelaySeat & { seat: Exclude<SeatId, 'p1'> } => seat.seat !== 'p1'), mode: createRelayDefinition(game.definition, relay) });
    stage.commit();
  } catch (error) { game.setCharacter(original); throw error; }
  return relay;
}
