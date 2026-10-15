import { CHARACTERS } from './content.js';
import type { Game } from './game.js';
import type { ModeDefinition } from './mode-rules.js';
import { LocalSession } from './session.js';
import { SessionRecoveryController } from './session-recovery.js';
import type { DeviceId, SeatId, SessionModeDefinition, SessionPlayer, SessionRecoveryRequest } from './session.js';

export interface RelaySeat { readonly seat: SeatId; readonly characterId: string; readonly device: DeviceId; readonly disconnected?: boolean }
export interface RelayProposal { readonly seats: readonly RelaySeat[]; readonly tilesPerLeg?: string | number }
export interface RelaySetup { readonly seats: readonly RelaySeat[]; readonly tilesPerLeg: number }
export interface RelayConfirmation { readonly seat: SeatId; readonly device: DeviceId; readonly generation: number; readonly participantId: string; readonly lifecycleGeneration: number }
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
  private distance = 0;
  private pending = false;
  private phase: 'running' | 'handoff' = 'running';
  private generation = 0;
  private readonly recovery = new SessionRecoveryController();
  constructor(readonly setup: RelaySetup) {}
  get session(): LocalSession { if (!this.attached) throw new Error('Relay is not started.'); return this.attached; }
  get activeSeat(): SeatId { return this.setup.seats[this.index]!.seat; }
  get incomingSeat(): SeatId { return this.setup.seats[(this.index + 1) % this.setup.seats.length]!.seat; }
  attach(session: LocalSession): void { this.attached = session; this.frontier = session.world.frontier; this.recovery.attach(session); }
  death(seat: SeatId): void { if (seat === this.activeSeat) { this.pending = false; this.recovery.death(seat); } }
  pendingRecovery(session: LocalSession): boolean { return this.recovery.pending(session); }
  recover(session: LocalSession, request: SessionRecoveryRequest): boolean { return request.ownerSeat === this.activeSeat && this.recovery.recover(session, request); }
  canAct(seat: SeatId): boolean { return this.phase === 'running' && !this.pending && seat === this.activeSeat; }
  progress(player: SessionPlayer, session: LocalSession): void {
    if (player.seat !== this.activeSeat || this.phase !== 'running') return;
    const next = session.world.frontier;
    this.distance += Math.max(0, next - this.frontier); this.frontier = Math.max(this.frontier, next);
    if (this.distance >= this.setup.tilesPerLeg) this.pending = true;
  }
  tick(session: LocalSession): void {
    this.recovery.tick(session);
    const player = session.players.find(candidate => candidate.seat === this.activeSeat);
    if (this.pending && player?.participation === 'active' && player.state === 'playing' && session.isRecoverySafePosition(player)) { this.phase = 'handoff'; this.generation++; this.pending = false; }
  }
  snapshot() {
    return Object.freeze({ phase: this.phase, activeSeat: this.activeSeat, incomingSeat: this.incomingSeat, leg: this.leg, distance: this.distance, tilesPerLeg: this.setup.tilesPerLeg, transferGeneration: this.generation, roster: this.setup.seats });
  }
  confirmation(): RelayConfirmation {
    const incoming = this.session.players.find(player => player.seat === this.incomingSeat)!;
    return Object.freeze({ seat: incoming.seat, device: incoming.device, participantId: incoming.participantId, generation: this.generation, lifecycleGeneration: this.session.lifecycle.length });
  }
  /** Only a fresh router edge bound to this transfer generation may call this. */
  confirm(input: RelayConfirmation): boolean {
    const incoming = this.session.players.find(player => player.seat === this.incomingSeat);
    if (this.phase !== 'handoff' || input.generation !== this.generation || input.lifecycleGeneration !== this.session.lifecycle.length || input.participantId !== incoming?.participantId || input.seat !== this.incomingSeat || input.device !== incoming?.device || !this.session.transferPosition(this.activeSeat, this.incomingSeat)) return false;
    this.index = (this.index + 1) % this.setup.seats.length; this.leg++; this.distance = 0; this.frontier = this.session.world.frontier; this.phase = 'running';
    return true;
  }
}

export function createRelayDefinition(base: ModeDefinition, relay: RelayCoordinator): SessionModeDefinition {
  return Object.freeze({ definition: base, handlers: Object.freeze({
    attach: (session: LocalSession) => relay.attach(session),
    canAct: (seat: SeatId) => relay.canAct(seat), canAdmit: () => false,
    simulates: (player: SessionPlayer) => player.seat === relay.activeSeat,
    canAdvance: () => relay.snapshot().phase === 'running',
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
