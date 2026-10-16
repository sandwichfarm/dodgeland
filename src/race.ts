import { CHARACTERS } from './content.js';
import type { Game } from './game.js';
import type { ModeDefinition } from './mode-rules.js';
import { composeSessionModeDefinition, LocalSession } from './session.js';
import type { DeviceId, SeatId, SessionModeDefinition, SessionResult } from './session.js';
import { SessionRecoveryController } from './session-recovery.js';
import type { RunSeed } from './run-seed.js';

export const RACE_DEFAULTS = Object.freeze({ finishTiles: 500, activeSeconds: 180 });
export const RACE_PRESSURE = Object.freeze({ version: 'race-pressure-1', buffer: 12, interval: 1, damage: 1 });
export interface RaceFogState { readonly exposure: number; readonly seconds: number; readonly attempts: number; readonly landed: number; readonly protectionUntil: number }
export interface RaceMovement { readonly tick: number; readonly seat: SeatId; readonly earned: number }
export interface RaceSettings { readonly finishTiles: number; readonly activeSeconds: number }
export interface RaceSeat { readonly seat: SeatId; readonly characterId: string; readonly device: DeviceId; readonly disconnected?: boolean }
export interface RaceProposal { readonly seats: readonly RaceSeat[]; readonly finishTiles?: number | string; readonly activeSeconds?: number | string }
export interface RaceSetup { readonly seats: readonly RaceSeat[]; readonly settings: RaceSettings }
export interface RaceDescriptor extends RaceSetup { readonly seed: number; readonly seedCode: string | null; readonly runSeed: RunSeed | null; readonly schema: 'race-1'; readonly itemVersion: 'race-items-1'; readonly pressure: typeof RACE_PRESSURE }
export interface RaceResult extends SessionResult { readonly mode: 'race'; readonly outcome: 'finish' | 'time' | 'eliminated'; readonly descriptor: RaceDescriptor; readonly winners: readonly SeatId[]; readonly elapsed: number; readonly players: readonly Readonly<{ seat: SeatId; characterId: string; distance: number }>[] }

function integer(value: unknown, fallback: number, min: number, max: number, message: string): number {
  const candidate = value === undefined ? fallback : value;
  if ((typeof candidate !== 'number' && typeof candidate !== 'string') || !/^[1-9]\d*$/.test(String(candidate)) || !Number.isSafeInteger(Number(candidate)) || Number(candidate) < min || Number(candidate) > max) throw new RangeError(message);
  return Number(candidate);
}
export function validateRaceSetup(proposal: RaceProposal): RaceSetup {
  if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal) || Object.keys(proposal).some(key => !['seats', 'finishTiles', 'activeSeconds'].includes(key))) throw new TypeError('Unknown Race setting.');
  const settings = Object.freeze({
    finishTiles: integer(proposal.finishTiles, 500, 1, 9999, 'Choose 1–9999 whole finish tiles.'),
    activeSeconds: integer(proposal.activeSeconds, 180, 30, 3600, 'Choose 30–3600 whole seconds.'),
  });
  const seats = proposal.seats;
  if (Array.isArray(seats) && seats.some(p => p && (typeof p.device !== 'string' || typeof p.characterId !== 'string' || (p.disconnected !== undefined && typeof p.disconnected !== 'boolean')))) throw new TypeError('Choose two to four ready players with different devices.');
  if (!Array.isArray(seats) || seats.length < 2 || seats.length > 4 || !seats.some(p => p?.seat === 'p1') || seats.some(p => !p || Object.keys(p).some(key => !['seat', 'device', 'characterId', 'disconnected'].includes(key)) || !['p1','p2','p3','p4'].includes(p.seat) || p.disconnected || !/^(keyboard-[ab]|gamepad-(?:0|[1-9]\d*))$/.test(p.device) || !CHARACTERS.some(c => c.id === p.characterId)) || new Set(seats.map(p => p.seat)).size !== seats.length || new Set(seats.map(p => p.device)).size !== seats.length) throw new TypeError('Choose two to four ready players with different devices.');
  for (const seat of seats) { const first = seats.find(p => p.characterId === seat.characterId)!; if (first !== seat) throw new TypeError(`Already chosen by ${first.seat.toUpperCase()}.`); }
  return Object.freeze({ settings, seats: Object.freeze([...seats].sort((a,b) => a.seat.localeCompare(b.seat)).map(p => Object.freeze({ seat: p.seat, characterId: p.characterId, device: p.device }))) });
}

export class RaceCoordinator {
  private attached?: LocalSession;
  private origin = 0;
  private readonly finishTicks = new Map<SeatId, number>();
  private readonly movements: RaceMovement[] = [];
  private readonly earned = new Map<SeatId, number>();
  private readonly fog = new Map<SeatId, RaceFogState>();
  private lastTime = 0;
  private readonly closures: Readonly<{ seat: SeatId; tick: number; reason: 'race-timeout' }>[] = [];
  get recoveryClosures(): readonly Readonly<{ seat: SeatId; tick: number; reason: 'race-timeout' }>[] { return Object.freeze([...this.closures]); }
  leaderFrontier = 0;
  fogBoundary = -RACE_PRESSURE.buffer;
  get movementLedger(): readonly RaceMovement[] { return Object.freeze([...this.movements]); }
  fogState(seat: SeatId): RaceFogState { return this.fog.get(seat) ?? Object.freeze({ exposure: 0, seconds: 0, attempts: 0, landed: 0, protectionUntil: 0 }); }
  /** Defensive effect policy; item validation/debit remains with its transaction. */
  protectFog(seat: SeatId, seconds: number): boolean {
    const player = this.session.players.find(p => p.seat === seat);
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 10 || this.result || !player || player.participation !== 'active' || player.state !== 'playing' || this.isFinished(seat)) return false;
    this.fog.set(seat, Object.freeze({ ...this.fogState(seat), exposure: 0, protectionUntil: this.elapsed + seconds })); return true;
  }
  readonly recovery = new SessionRecoveryController();
  constructor(readonly descriptor: RaceDescriptor) {}
  get session(): LocalSession { if (!this.attached) throw new Error('Race has not started.'); return this.attached; }
  get result(): RaceResult | undefined { return this.session.result as RaceResult | undefined; }
  get elapsed(): number { return this.result?.elapsed ?? Math.max(0, (this.session.world.time - this.origin) / this.session.world.rules.simulation.worldTimeScale); }
  attach(session: LocalSession): void { this.attached = session; this.origin = this.lastTime = session.world.time; this.recovery.attach(session); }
  isFinished(seat: SeatId): boolean { return this.finishTicks.has(seat); }
  finishTick(seat: SeatId): number | undefined { return this.finishTicks.get(seat); }
  tick(session: LocalSession): void {
    if (session.result) return;
    const dt = Math.max(0, (session.world.time - this.lastTime) / session.world.rules.simulation.worldTimeScale);
    this.lastTime = session.world.time;
    // Accepted personal movement survives same-tick death; forced spatial
    // placement never enters this feed. Stable seat sorting is observational.
    for (const player of [...session.players].sort((a,b) => a.seat.localeCompare(b.seat))) {
      if (player.earnedDistance <= (this.earned.get(player.seat) ?? 0)) continue;
      this.earned.set(player.seat, player.earnedDistance);
      this.movements.push(Object.freeze({ tick: session.world.simulationTick, seat: player.seat, earned: player.earnedDistance }));
      this.leaderFrontier = Math.max(this.leaderFrontier, player.earnedDistance);
    }
    this.recovery.tick(session);
    const finishers = session.players.filter(p => p.participation === 'active' && p.state === 'playing' && p.completedForwardTiles >= this.descriptor.settings.finishTiles);
    for (const player of finishers) if (!this.finishTicks.has(player.seat)) this.finishTicks.set(player.seat, session.world.simulationTick);
    this.fogBoundary = Math.max(this.fogBoundary, this.leaderFrontier - RACE_PRESSURE.buffer);
    for (const player of [...session.players].sort((a,b) => a.seat.localeCompare(b.seat))) {
      const previous = this.fogState(player.seat);
      if (player.participation !== 'active' || player.state !== 'playing' || this.isFinished(player.seat)) continue;
      const exposed = player.participation === 'active' && player.state === 'playing' && !this.isFinished(player.seat)
        && player.groundY < this.fogBoundary && (player.recovery?.protectionUntil ?? 0) <= session.world.time && previous.protectionUntil <= this.elapsed;
      let exposure = exposed ? previous.exposure + dt : 0, attempts = previous.attempts, landed = previous.landed;
      while (exposure + 1e-9 >= RACE_PRESSURE.interval) {
        exposure = Math.max(0, exposure - RACE_PRESSURE.interval); attempts++;
        landed += session.damage(player.seat, { cause: 'fog', amount: RACE_PRESSURE.damage, reason: 'The fog took your last feather.' }).landed;
        if (player.state !== 'playing') { exposure = 0; break; }
      }
      this.fog.set(player.seat, Object.freeze({ ...previous, exposure, seconds: previous.seconds + (exposed ? dt : 0), attempts, landed }));
    }
    const allFinished = session.players.every(p => this.isFinished(p.seat));
    const timeout = this.elapsed + 1e-9 >= this.descriptor.settings.activeSeconds;
    if (timeout) for (const player of [...session.players].sort((a,b) => a.seat.localeCompare(b.seat))) {
      if (!player.recovery?.offer) continue;
      session.updateRecovery(player, recovery => ({ ...recovery, offer: undefined }));
      this.closures.push(Object.freeze({ seat: player.seat, tick: session.world.simulationTick, reason: 'race-timeout' }));
    }
    const remaining = session.players.some(p => !this.isFinished(p.seat) && (p.participation === 'device-lost' || p.participation === 'active' && p.state === 'playing'));
    if (!allFinished && !timeout && (remaining || this.recovery.pending(session))) return;
    const players = Object.freeze([...session.players].sort((a,b) => a.seat.localeCompare(b.seat)).map(p => Object.freeze({ seat: p.seat, characterId: p.characterId, distance: p.completedForwardTiles })));
    const maximum = Math.max(...players.map(p => p.distance));
    const earliest = Math.min(...this.finishTicks.values());
    const winners = Object.freeze(this.finishTicks.size ? players.filter(p => this.finishTicks.get(p.seat) === earliest).map(p => p.seat) : players.filter(p => p.distance === maximum).map(p => p.seat));
    session.completeResult(Object.freeze({ mode: 'race', outcome: allFinished || !remaining && this.finishTicks.size && !this.recovery.pending(session) ? 'finish' : timeout ? 'time' : 'eliminated', descriptor: this.descriptor, winners, elapsed: this.elapsed, players }) as RaceResult);
  }
}

export function composeRaceDefinition(base: ModeDefinition, race: RaceCoordinator): SessionModeDefinition {
  return composeSessionModeDefinition(base, {
    suppressPursuit: true,
    retainDeadDevice: true,
    attach: session => race.attach(session), canAdmit: () => false,
    canAct: seat => !race.result && !race.isFinished(seat), canTransact: () => false, canAdvance: () => !race.result,
    simulates: player => !race.isFinished(player.seat),
    canLifecycle: (_kind, seat, device) => !race.result && race.descriptor.seats.some(p => p.seat === seat && (!device || p.device === device)),
    preserveReclaimPosition: true,
    depart: () => ({ archiveContribution: true }),
    death: record => race.recovery.death(record.seat),
    pending: session => race.recovery.pending(session), recover: (session, request) => race.recovery.recover(session, request),
    tick: session => race.tick(session),
  });
}
export function createRaceSession(game: Game, proposal: RaceProposal): RaceCoordinator {
  const setup = validateRaceSetup(proposal);
  if (game.state !== 'ready') throw new TypeError('Race starts from a fresh ready course.');
  const descriptor: RaceDescriptor = Object.freeze({ ...setup, seed: game.world.seed, seedCode: game.world.seedCode, runSeed: game.runSeed ? Object.freeze({ ...game.runSeed }) : null, schema: 'race-1', itemVersion: 'race-items-1', pressure: RACE_PRESSURE });
  const race = new RaceCoordinator(descriptor), primary = setup.seats.find(p => p.seat === 'p1')!;
  const original = game.characterId;
  try {
    game.setCharacter(primary.characterId);
    LocalSession.stage(game, { primaryDevice: primary.device, roster: setup.seats.filter((p): p is RaceSeat & { seat: Exclude<SeatId,'p1'> } => p.seat !== 'p1'), mode: composeRaceDefinition(game.definition, race) }).commit();
  } catch (error) { game.setCharacter(original); throw error; }
  return race;
}
