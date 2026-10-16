import { CHARACTERS } from './content.js';
import type { Game } from './game.js';
import type { ModeDefinition } from './mode-rules.js';
import { composeSessionModeDefinition, LocalSession } from './session.js';
import type { DeviceId, SeatId, SessionModeDefinition, SessionResult } from './session.js';
import { SessionRecoveryController } from './session-recovery.js';
import type { RunSeed } from './run-seed.js';

export const RACE_DEFAULTS = Object.freeze({ finishTiles: 500, activeSeconds: 180 });
export interface RaceSettings { readonly finishTiles: number; readonly activeSeconds: number }
export interface RaceSeat { readonly seat: SeatId; readonly characterId: string; readonly device: DeviceId; readonly disconnected?: boolean }
export interface RaceProposal { readonly seats: readonly RaceSeat[]; readonly finishTiles?: number | string; readonly activeSeconds?: number | string }
export interface RaceSetup { readonly seats: readonly RaceSeat[]; readonly settings: RaceSettings }
export interface RaceDescriptor extends RaceSetup { readonly seed: number; readonly seedCode: string | null; readonly runSeed: RunSeed | null; readonly schema: 'race-1'; readonly itemVersion: 'race-items-1' }
export interface RaceResult extends SessionResult { readonly mode: 'race'; readonly outcome: 'finish' | 'time'; readonly descriptor: RaceDescriptor; readonly winners: readonly SeatId[]; readonly elapsed: number; readonly players: readonly Readonly<{ seat: SeatId; characterId: string; distance: number }>[] }

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
  readonly recovery = new SessionRecoveryController();
  constructor(readonly descriptor: RaceDescriptor) {}
  get session(): LocalSession { if (!this.attached) throw new Error('Race has not started.'); return this.attached; }
  get result(): RaceResult | undefined { return this.session.result as RaceResult | undefined; }
  get elapsed(): number { return this.result?.elapsed ?? Math.max(0, (this.session.world.time - this.origin) / this.session.world.rules.simulation.worldTimeScale); }
  attach(session: LocalSession): void { this.attached = session; this.origin = session.world.time; this.recovery.attach(session); }
  isFinished(seat: SeatId): boolean { return this.finishTicks.has(seat); }
  tick(session: LocalSession): void {
    if (session.result) return;
    this.recovery.tick(session);
    const finishers = session.players.filter(p => p.participation === 'active' && p.state === 'playing' && p.completedForwardTiles >= this.descriptor.settings.finishTiles);
    for (const player of finishers) if (!this.finishTicks.has(player.seat)) this.finishTicks.set(player.seat, session.world.simulationTick);
    const allFinished = session.players.every(p => this.isFinished(p.seat));
    if (!allFinished && this.elapsed < this.descriptor.settings.activeSeconds) return;
    const players = Object.freeze(session.players.map(p => Object.freeze({ seat: p.seat, characterId: p.characterId, distance: p.completedForwardTiles })));
    const maximum = Math.max(...players.map(p => p.distance));
    const earliest = Math.min(...this.finishTicks.values());
    const winners = Object.freeze(this.finishTicks.size ? players.filter(p => this.finishTicks.get(p.seat) === earliest).map(p => p.seat) : players.filter(p => p.distance === maximum).map(p => p.seat));
    session.completeResult(Object.freeze({ mode: 'race', outcome: allFinished ? 'finish' : 'time', descriptor: this.descriptor, winners, elapsed: this.elapsed, players }) as RaceResult);
  }
}

export function composeRaceDefinition(base: ModeDefinition, race: RaceCoordinator): SessionModeDefinition {
  return composeSessionModeDefinition(base, {
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
  const descriptor: RaceDescriptor = Object.freeze({ ...setup, seed: game.world.seed, seedCode: game.world.seedCode, runSeed: game.runSeed ? Object.freeze({ ...game.runSeed }) : null, schema: 'race-1', itemVersion: 'race-items-1' });
  const race = new RaceCoordinator(descriptor), primary = setup.seats.find(p => p.seat === 'p1')!;
  const original = game.characterId;
  try {
    game.setCharacter(primary.characterId);
    LocalSession.stage(game, { primaryDevice: primary.device, roster: setup.seats.filter((p): p is RaceSeat & { seat: Exclude<SeatId,'p1'> } => p.seat !== 'p1'), mode: composeRaceDefinition(game.definition, race) }).commit();
  } catch (error) { game.setCharacter(original); throw error; }
  return race;
}
