import { CHARACTERS, DEFAULT_CHARACTER, characterById } from './content.js';
import { laneActors, platformSupports } from './game.js';
import type { DeathCause, Direction, Game, HurtEvent, Lane, RunState } from './game.js';
import type { ModeDefinition, ModeRules } from './mode-rules.js';
import { RunInventory } from './market/run.js';
import { characterPower } from './character-powers.js';
import type { CharacterPower } from './character-powers.js';

/** A stable local identity. Seat order is never simulation authority. */
export type SeatId = 'p1' | 'p2' | 'p3' | 'p4';
export type DeviceId = 'keyboard-a' | 'keyboard-b' | 'keyboard-c' | 'keyboard-d' | `gamepad-${number}`;

export interface SeatAction { seat: SeatId; direction: Direction }
export interface SessionSeatSpec { readonly seat: Exclude<SeatId, 'p1'>; readonly device: DeviceId; readonly characterId: string }
export interface SessionConfig { readonly capacity: number }
export const DEFAULT_SESSION_CONFIG: SessionConfig = Object.freeze({ capacity: 4 });
export type SessionLifecycleType = 'player-joined' | 'player-death' | 'device-lost' | 'reclaim-offered' | 'reclaimed' | 'departed';
export type SessionParticipation = 'active' | 'device-lost' | 'departed' | 'dead';
export interface SessionLifecycleRecord {
  readonly sessionId: string;
  readonly playerId: string;
  readonly type: SessionLifecycleType;
  readonly seat: SeatId;
  readonly device: DeviceId;
  readonly offeredDevice?: DeviceId;
  readonly previous: SessionParticipation;
  readonly next: SessionParticipation;
  readonly simulationTick: number;
  readonly cause: string;
}
export interface WorldFrame {
  readonly previousTime: number;
  readonly playerGround: ReadonlyMap<SessionPlayer, Readonly<{ x: number; y: number }>>;
}
export type SessionLifecycleHandler = (record: SessionLifecycleRecord) => void;

/** Mode policies receive lifecycle facts through this generic session boundary. */
export interface SessionModeHandlers {
  join?(record: SessionLifecycleRecord): void;
  deviceLost?(record: SessionLifecycleRecord): void;
  reclaim?(record: SessionLifecycleRecord): void;
  depart?(record: SessionLifecycleRecord): { readonly releaseSeat?: boolean } | void;
  death?(record: SessionLifecycleRecord): void;
  progress?(record: SessionLifecycleRecord): void;
  result?(record: SessionLifecycleRecord): void;
}
export interface SessionModeDefinition {
  readonly definition: ModeDefinition;
  readonly handlers: SessionModeHandlers;
}
export interface SessionAdmission {
  readonly device: DeviceId;
  readonly characterId: string;
  readonly seat?: Exclude<SeatId, 'p1'>;
  /** A stronger identity is preferred over device/character aliases on re-entry. */
  readonly participantId?: string;
}
export interface SessionAdmissionPlan {
  readonly admission: SessionAdmission;
  readonly seat: Exclude<SeatId, 'p1'>;
  readonly placement: Readonly<{ x: number; y: number }>;
}
export interface SessionRecoveryProvenance {
  readonly grantId: string;
  readonly participantId: string;
  readonly aliases: readonly string[];
  readonly charge: 'available' | 'spent';
  readonly personalHighWater: number;
  readonly nextRecharge: number;
}
export interface SessionContribution {
  readonly seat: SeatId;
  readonly characterId: string;
  readonly participantId: string;
  readonly statistics: Readonly<SessionPlayer['statistics']>;
  readonly recovery: SessionRecoveryProvenance;
  readonly reason: string;
}
const isDeviceId = (device: unknown): device is DeviceId => typeof device === 'string' &&
  (['keyboard-a', 'keyboard-b', 'keyboard-c', 'keyboard-d'].includes(device) || /^gamepad-(?:0|[1-9]\d*)$/.test(device));

/** Per-seat lifecycle delivery never shares the legacy solo facade callbacks. */
export interface SessionPlayerCallbacks {
  onCoin(amount: number): void;
  onHurt(event: HurtEvent): void;
  onHeal(amount: number): void;
  /** Legacy Game end callbacks receive no argument; terminal facts live on the player and lifecycle record. */
  onEnd(): void;
  onPower(event: { power: CharacterPower; cause: DeathCause }): void;
}

export interface PlayerRender {
  readonly seat: SeatId;
  readonly marker: string;
  readonly label: string;
  readonly characterId: string;
  readonly x: number;
  readonly y: number;
  readonly groundX: number;
  readonly groundY: number;
  readonly hop: number;
  readonly fromY: number;
  readonly state: RunState;
  readonly run: RunInventory;
  readonly hurtRemaining: number;
  readonly powerRescue: Game['powerRescue'];
  readonly powerFlash: number;
  readonly power: CharacterPower;
  readonly caughtByWave: boolean;
  readonly deathSpill: Game['deathSpill'];
}

function alias(owner: object, host: object, keys: readonly string[]): void {
  const record = host as Record<string, unknown>;
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(host, key);
    if (!descriptor?.configurable) continue;
    const value = record[key];
    (owner as Record<string, unknown>)[key] = value;
    Object.defineProperty(host, key, {
      configurable: true,
      enumerable: descriptor.enumerable,
      get: () => (owner as Record<string, unknown>)[key],
      set: next => { (owner as Record<string, unknown>)[key] = next; },
    });
  }
}

/**
 * The one mutable course. During the extraction the solo facade keeps its
 * established methods, while those methods read these aliased owner fields.
 */
export class SharedWorld {
  readonly definition: ModeDefinition;
  readonly rules: ModeRules;
  readonly host: Game;
  simulationTick = 0;
  /** Furthest live course row. This is terrain retention, never a player's score. */
  frontier: number;
  sessionActive = false;
  /** One seat owns each in-flight pickup pull until it resolves or leaves. */
  readonly pickupOwners = new Map<number, string>();
  /** The explicit player being resolved, retained as a stack for callback re-entry. */
  private readonly resolvingPlayers: SessionPlayer[] = [];
  private readonly pickupClaims: { player: SessionPlayer; lane: Lane; time: number; distance: number; raw: number }[] = [];
  /** Pull ownership is elected after every seat has proposed, never during seat iteration. */
  private readonly pickupPullClaims: { player: SessionPlayer; lane: Lane; time: number; distance: number; pull: NonNullable<Lane['coinPull']> }[] = [];
  frame: WorldFrame | null = null;
  declare rows: Map<number, Lane>;
  declare attractedCoins: Map<number, Lane>;
  declare time: number;
  declare waveRow: number;
  declare seed: number;
  declare home: string;
  declare mode: string;
  declare gentle: boolean;
  declare runSeed: unknown;
  declare seedCode: string | null;
  declare mobDirector: unknown;
  declare laneSpeeds: unknown;

  constructor(game: Game) {
    this.host = game;
    this.definition = game.definition;
    this.rules = game.rules;
    this.frontier = game.maxY;
    alias(this, game, ['rows', 'attractedCoins', 'time', 'waveRow', 'seed', 'home', 'mode', 'gentle', 'runSeed', 'seedCode', 'mobDirector', 'laneSpeeds']);
  }

  get mobs() { return this.host.mobs; }
  noteProgress(row: number): void { this.frontier = Math.max(this.frontier, row); }
  beginFrame(players: readonly SessionPlayer[]): WorldFrame {
    return this.frame = Object.freeze({ previousTime: this.time, playerGround: new Map(players.map(player => [player, Object.freeze({ x: player.groundX, y: player.groundY })])) });
  }
  update(dt: number): number {
    const previousTime = this.time;
    this.host.advanceSharedWorld(dt);
    this.host.advanceSharedPursuit(previousTime);
    this.simulationTick++;
    return previousTime;
  }
  get resolvingPlayer(): SessionPlayer | undefined { return this.resolvingPlayers.at(-1); }
  resolvePlayer<T>(player: SessionPlayer, operation: () => T): T {
    this.resolvingPlayers.push(player);
    try { return operation(); }
    finally { this.resolvingPlayers.pop(); }
  }
  claimPickup(player: SessionPlayer, lane: Lane, collisionTime: number, distance: number, raw: number): void {
    this.pickupClaims.push({ player, lane, time: collisionTime, distance, raw });
  }
  claimPickupPull(player: SessionPlayer, lane: Lane, collisionTime: number, distance: number, pull: NonNullable<Lane['coinPull']>): void {
    this.pickupPullClaims.push({ player, lane, time: collisionTime, distance, pull });
  }
  resolvePickups(): void {
    this.pickupClaims.sort((a, b) => a.time - b.time || a.distance - b.distance || a.player.seat.localeCompare(b.player.seat));
    for (const claim of this.pickupClaims) {
      if (claim.lane.coin === null) continue;
      claim.lane.coin = null; delete claim.lane.coinDenomination; delete claim.lane.coinPull;
      this.attractedCoins.delete(claim.lane.index); this.pickupOwners.delete(claim.lane.index);
      this.host.awardSessionPickup(claim.player, claim.raw);
      claim.player.statistics.pickups++;
    }
    this.pickupClaims.length = 0;
    this.pickupPullClaims.sort((a, b) => a.time - b.time || a.distance - b.distance || a.player.seat.localeCompare(b.player.seat));
    const electedPulls = new Set<number>();
    for (const claim of this.pickupPullClaims) {
      if (claim.lane.coin === null || electedPulls.has(claim.lane.index)) continue;
      claim.lane.coinPull = claim.pull;
      this.attractedCoins.set(claim.lane.index, claim.lane);
      this.pickupOwners.set(claim.lane.index, claim.player.seat);
      electedPulls.add(claim.lane.index);
    }
    this.pickupPullClaims.length = 0;
  }
  selectMobTarget(players: readonly SessionPlayer[]): SessionPlayer | undefined {
    return [...players].sort((a, b) => {
      const ad = this.mobs.length ? Math.min(...this.mobs.map(mob => Math.hypot(a.groundX - mob.x, a.groundY - mob.y))) : 0;
      const bd = this.mobs.length ? Math.min(...this.mobs.map(mob => Math.hypot(b.groundX - mob.x, b.groundY - mob.y))) : 0;
      return ad - bd || a.seat.localeCompare(b.seat);
    })[0];
  }
  releaseInactivePickupClaims(players: readonly SessionPlayer[]): void {
    const activeSeats = new Set(players.filter(player => player.state === 'playing').map(player => player.seat));
    for (const [row, seat] of this.pickupOwners) if (!activeSeats.has(seat as SeatId)) this.pickupOwners.delete(row);
  }
  view(): SharedWorld { return this; }
}

/** Per-seat mutable state. The primary player remains a live alias of the solo facade. */
export class SessionPlayer {
  readonly seat: SeatId;
  device: DeviceId;
  readonly marker: string;
  readonly world: SharedWorld;
  readonly primary: boolean;
  participantId = '';
  recovery: SessionRecoveryProvenance | undefined;
  onCoin: SessionPlayerCallbacks['onCoin'] = () => {};
  onHurt: SessionPlayerCallbacks['onHurt'] = () => {};
  onHeal: SessionPlayerCallbacks['onHeal'] = () => {};
  onEnd: SessionPlayerCallbacks['onEnd'] = () => {};
  onPower: SessionPlayerCallbacks['onPower'] = () => {};
  declare run: RunInventory;
  declare state: RunState;
  declare x: number;
  declare y: number;
  declare maxY: number;
  declare idle: number;
  declare hop: number;
  declare fromX: number;
  declare fromY: number;
  declare coins: number;
  declare caughtByWave: boolean;
  declare health: number;
  declare maxHealth: number;
  declare hurtRemaining: number;
  declare deathCause: DeathCause | null;
  declare deathSpill: Game['deathSpill'];
  declare reason: string;
  declare characterId: string;
  declare powerRescue: Game['powerRescue'];
  declare powerReadyAt: number;
  declare powerNotice: number;
  declare powerLandingGrace: number;
  declare healedMilestone: number;
  declare touchingCars: Set<string>;
  earnedDistance = 0;
  participation: SessionParticipation = 'active';
  deviceLostAt: number | null = null;
  readonly statistics = { distance: 0, coins: 0, pickups: 0, damage: 0, deaths: 0, deviceLostDuration: 0, deathCause: null as DeathCause | null };

  constructor(world: SharedWorld, seat: SeatId, device: DeviceId, characterId: string, primary = false) {
    this.world = world; this.seat = seat; this.device = device; this.marker = seat.toUpperCase();
    this.primary = primary;
    const character = characterById(characterId);
    if (primary) {
      alias(this, world.host, ['run', 'state', 'x', 'y', 'maxY', 'idle', 'hop', 'fromX', 'fromY', 'coins', 'caughtByWave', 'health', 'maxHealth', 'hurtRemaining', 'deathCause', 'deathSpill', 'reason', 'characterId', 'powerRescue', 'powerReadyAt', 'powerNotice', 'powerLandingGrace', 'healedMilestone', 'touchingCars', 'onCoin', 'onEnd', 'onHurt', 'onHeal', 'onPower']);
      return;
    }
    // Each seat has a run inventory. Course generation, actors, and rewards
    // remain on SharedWorld; no second Game is constructed for this inventory.
    this.run = new RunInventory(world.host.seed ^ 0x5f3759df, [...world.host.run.catalog.values()], world.rules.economy);
    const anchorY = world.host.y;
    const spawn = [-1, 1, -2, 2].map(offset => world.host.x + offset).find(x => {
      const lane = world.rows.get(anchorY);
      return x >= -5 && x <= 5 && !!lane && !lane.blocked.includes(Math.round(x)) && (lane.kind !== 'river' || platformSupports(lane, x, world.time));
    });
    if (spawn === undefined) throw new Error('No safe distinct seat is available on the live solo course.');
    this.state = 'ready'; this.x = spawn; this.y = anchorY; this.maxY = anchorY; this.idle = 0; this.hop = 0; this.fromX = spawn; this.fromY = anchorY; this.coins = 0;
    this.caughtByWave = false; this.health = world.host.maxHealth; this.maxHealth = world.host.maxHealth; this.hurtRemaining = 0;
    this.deathCause = null; this.deathSpill = null; this.reason = ''; this.characterId = character.id;
    this.powerRescue = null; this.powerReadyAt = 0; this.powerNotice = 0; this.powerLandingGrace = 0; this.healedMilestone = 0; this.touchingCars = new Set();
  }

  get label(): string { return `${this.marker} · ${characterById(this.characterId).name}`; }

  private get rescueFraction(): number {
    if (!this.powerRescue) return 0;
    const t = this.powerRescue.remaining / this.powerRescue.power.duration;
    return t * t * (3 - 2 * t);
  }
  get groundX(): number { return this.powerRescue ? this.x + (this.powerRescue.fromX - this.x) * this.rescueFraction : this.x + (this.fromX - this.x) * this.hop / this.world.rules.movement.hopDuration; }
  get groundY(): number { return this.powerRescue ? this.y + (this.powerRescue.fromY - this.y) * this.rescueFraction : this.y + (this.fromY - this.y) * this.hop / this.world.rules.movement.hopDuration; }
  get power(): CharacterPower { return this.primary ? this.world.host.power : characterPower(this.characterId); }
  get powerRemaining(): number { return Math.max(0, Math.ceil(this.powerReadyAt - (this.primary ? this.maxY : this.earnedDistance))); }
  get powerReady(): boolean { return this.powerRemaining === 0 && !this.powerRescue; }
  get powerFlash(): number { return this.primary ? this.world.host.powerFlash : Math.min(1, this.powerNotice / .9); }
  render(): PlayerRender { return { seat: this.seat, marker: this.marker, label: this.label, characterId: this.characterId, x: this.x, y: this.y, groundX: this.groundX, groundY: this.groundY, hop: this.hop, fromY: this.fromY, state: this.state, run: this.run, hurtRemaining: this.hurtRemaining, powerRescue: this.powerRescue, powerFlash: this.powerFlash, power: this.power, caughtByWave: this.caughtByWave, deathSpill: this.deathSpill }; }

  start(): boolean {
    return this.world.host.startPlayer(this);
  }

  move(direction: Direction): boolean {
    return this.world.host.movePlayer(this, direction);
  }

  update(dt: number, previousTime: number, drivesWorld: boolean): void {
    this.world.host.updateSessionPlayer(this, dt, previousTime, drivesWorld);
  }
}

export class LocalSession {
  readonly definition: ModeDefinition;
  readonly world: SharedWorld;
  private readonly roster: SessionPlayer[];
  readonly config: SessionConfig;
  readonly id: string;
  readonly mode: SessionModeDefinition | undefined;
  private readonly lifecycleHandler: SessionLifecycleHandler;
  private readonly lifecycleRecords: SessionLifecycleRecord[] = [];
  private readonly provenanceAliases = new Map<string, SessionRecoveryProvenance>();
  private readonly contributionRecords: SessionContribution[] = [];
  private nextGrant = 1;
  private active = false;

  constructor(world: SharedWorld, players: readonly SessionPlayer[], options: { config?: SessionConfig; onLifecycle?: SessionLifecycleHandler; mode?: SessionModeDefinition } = {}) {
    this.config = options.config ?? DEFAULT_SESSION_CONFIG;
    if (!Number.isInteger(this.config.capacity) || this.config.capacity < 1 || this.config.capacity > 4) throw new RangeError('Session capacity must be a validated integer from one through four.');
    if (players.length < 1 || players.length > this.config.capacity || new Set(players.map(player => player.seat)).size !== players.length || new Set(players.map(player => player.device)).size !== players.length || new Set(players.map(player => player.characterId)).size !== players.length) throw new TypeError('A local session needs unique stable seats, devices, and characters within its configured capacity.');
    if (options.mode && options.mode.definition !== world.definition) throw new TypeError('A session mode must compose the exact live world definition.');
    this.world = world; this.roster = [...players].sort((a, b) => a.seat.localeCompare(b.seat)); this.definition = world.definition; this.mode = options.mode; this.id = `local-${world.seed.toString(36)}-${world.simulationTick}`; this.lifecycleHandler = options.onLifecycle ?? (() => {});
  }

  get players(): readonly SessionPlayer[] { return this.roster; }
  get contributions(): readonly SessionContribution[] { return this.contributionRecords; }

  static stage(game: Game, options: { secondaryCharacterId?: string; roster?: readonly SessionSeatSpec[]; config?: SessionConfig; onLifecycle?: SessionLifecycleHandler; mode?: SessionModeDefinition; primaryDevice?: DeviceId } = {}): LocalSessionStage {
    const world = (game as Game & { world?: SharedWorld }).world ?? new SharedWorld(game);
    const primary = (game as Game & { player?: SessionPlayer }).player ?? new SessionPlayer(world, 'p1', 'keyboard-a', game.characterId, true);
    const used = new Set([primary.characterId]);
    const fallback = CHARACTERS.find(character => !used.has(character.id))?.id ?? DEFAULT_CHARACTER;
    const roster = options.roster ?? [{ seat: 'p2' as const, device: 'keyboard-b' as const, characterId: options.secondaryCharacterId && !used.has(options.secondaryCharacterId) ? options.secondaryCharacterId : fallback }];
    if (new Set(roster.map(spec => spec.seat)).size !== roster.length || new Set(roster.map(spec => spec.device)).size !== roster.length || roster.some(spec => used.has(spec.characterId))) throw new TypeError('Session seats, devices, and characters must be unique.');
    const originalPrimaryDevice = primary.device;
    if (options.primaryDevice) primary.device = options.primaryDevice;
    try {
      const session = new LocalSession(world, [primary], { config: options.config, onLifecycle: options.onLifecycle, mode: options.mode });
      for (const spec of roster) {
        const plan = session.prepareAdmission(spec);
        if (!plan || !session.admitPlan(plan, false, false)) throw new Error('No safe distinct session seat is available on the live course.');
        used.add(spec.characterId);
      }
      return new LocalSessionStage(game, session, originalPrimaryDevice);
    } catch (error) {
      primary.device = originalPrimaryDevice;
      throw error;
    }
  }

  start(): void {
    for (const player of this.players) {
      if (!player.recovery) this.bindRecovery(player, { device: player.device, characterId: player.characterId, participantId: `${this.id}:${player.seat}` });
      player.start();
    }
    this.world.sessionActive = true; this.world.host.resetSharedWorldEffects(); this.active = true;
  }
  dispatch(action: SeatAction): boolean { const player = this.players.find(candidate => candidate.seat === action.seat); return !!player && this.active && player.participation === 'active' && player.move(action.direction); }
  private lifecycleRecord(type: SessionLifecycleType, player: SessionPlayer, previous: SessionParticipation, next: SessionParticipation, cause: string, offeredDevice?: DeviceId): SessionLifecycleRecord {
    return Object.freeze({ sessionId: this.id, playerId: `${this.id}:${player.seat}`, type, seat: player.seat, device: player.device, offeredDevice, previous, next, simulationTick: this.world.simulationTick, cause });
  }
  private dispatchMode(record: SessionLifecycleRecord): { readonly releaseSeat?: boolean } | void {
    const { type } = record;
    if (type === 'player-joined') return this.mode?.handlers.join?.(record);
    if (type === 'device-lost') return this.mode?.handlers.deviceLost?.(record);
    if (type === 'reclaimed') return this.mode?.handlers.reclaim?.(record);
    if (type === 'departed') return this.mode?.handlers.depart?.(record);
    if (type === 'player-death') return this.mode?.handlers.death?.(record);
  }
  private publish(record: SessionLifecycleRecord): void { this.lifecycleRecords.push(record); this.lifecycleHandler(record); }
  private emit(type: SessionLifecycleType, player: SessionPlayer, previous: SessionParticipation, next: SessionParticipation, cause: string, offeredDevice?: DeviceId): { readonly releaseSeat?: boolean } | void {
    const record = this.lifecycleRecord(type, player, previous, next, cause, offeredDevice);
    const disposition = this.dispatchMode(record); this.publish(record);
    return disposition;
  }
  get lifecycle(): readonly SessionLifecycleRecord[] { return this.lifecycleRecords; }
  private safePlacement(exclude?: SessionPlayer): { readonly x: number; readonly y: number } | undefined {
    const candidates = this.players.filter(player => player !== exclude && player.participation === 'active');
    const anchor = candidates.reduce((best, player) => player.maxY > best.maxY ? player : best, candidates[0] ?? this.players[0]);
    if (!anchor) return undefined;
    if (this.world.rules.pursuit.strategy === 'wave' && anchor.y <= this.world.waveRow) return undefined;
    const lane = this.world.rows.get(anchor.y);
    const occupied = new Set(candidates.map(player => Math.round(player.groundX)));
    const x = [-1, 1, -2, 2, -3, 3, -4, 4, -5, 5].map(offset => anchor.groundX + offset).find(candidate => {
      if (candidate < -5 || candidate > 5 || occupied.has(Math.round(candidate)) || !lane || lane.blocked.includes(Math.round(candidate))) return false;
      if (lane.kind === 'river' && !platformSupports(lane, candidate, this.world.time)) return false;
      if ((lane.kind === 'road' || lane.kind === 'rail') && !laneActors(lane, this.world.time).every(actor => Math.abs(actor.x - candidate) > actor.length / 2 + .2)) return false;
      return !this.world.mobs.some(mob => mob.phase !== 'spawning' && Math.hypot(mob.x - candidate, mob.y - anchor.y) < .7);
    });
    return x === undefined ? undefined : Object.freeze({ x, y: anchor.y });
  }
  private recoveryFor(admission: SessionAdmission): SessionRecoveryProvenance {
    const exact = admission.participantId ? this.provenanceAliases.get(`participant:${admission.participantId}`) : undefined;
    const alias = !admission.participantId ? this.provenanceAliases.get(`device:${admission.device}`) ?? this.provenanceAliases.get(`character:${admission.characterId}`) : undefined;
    return exact ?? alias ?? Object.freeze({
      grantId: `${this.id}:grant-${this.nextGrant++}`,
      participantId: admission.participantId ?? `${this.id}:anonymous-${this.nextGrant}`,
      aliases: Object.freeze([]), charge: 'available', personalHighWater: 0, nextRecharge: 250,
    });
  }
  private bindRecovery(player: SessionPlayer, admission: SessionAdmission): void {
    const recovery = this.recoveryFor(admission);
    const aliases = new Set([...recovery.aliases, `device:${admission.device}`, `character:${admission.characterId}`]);
    if (admission.participantId) aliases.add(`participant:${admission.participantId}`);
    const bound = Object.freeze({ ...recovery, aliases: Object.freeze([...aliases].sort()) });
    for (const alias of bound.aliases) this.provenanceAliases.set(alias, bound);
    player.participantId = admission.participantId ?? bound.participantId; player.recovery = bound;
  }
  private addRecoveryDeviceAlias(player: SessionPlayer, device: DeviceId): void {
    if (!player.recovery) return;
    const aliases = new Set([...player.recovery.aliases, `device:${device}`]);
    const bound = Object.freeze({ ...player.recovery, aliases: Object.freeze([...aliases].sort()) });
    for (const alias of bound.aliases) this.provenanceAliases.set(alias, bound);
    player.recovery = bound;
  }
  prepareAdmission(admission: SessionAdmission): SessionAdmissionPlan | undefined {
    if (!isDeviceId(admission.device) || !CHARACTERS.some(character => character.id === admission.characterId)) return undefined;
    const occupiedSeats = new Set(this.players.map(player => player.seat));
    const seat = admission.seat ?? (['p2', 'p3', 'p4'] as const).find(candidate => !occupiedSeats.has(candidate));
    if (!seat || !(['p2', 'p3', 'p4'] as const).includes(seat) || this.players.length >= this.config.capacity || occupiedSeats.has(seat) || this.players.some(player => player.device === admission.device || player.characterId === admission.characterId)) return undefined;
    const placement = this.safePlacement();
    return placement && Object.freeze({ admission: Object.freeze({ ...admission, seat }), seat, placement });
  }
  private admitPlan(plan: SessionAdmissionPlan, start = true, emit = true): boolean {
    const { admission, seat, placement } = plan;
    const player = new SessionPlayer(this.world, seat, admission.device, admission.characterId);
    player.x = player.fromX = placement.x; player.y = player.fromY = placement.y; player.maxY = placement.y;
    if (start && !player.start()) return false;
    this.bindRecovery(player, admission);
    this.roster.push(player); this.roster.sort((a, b) => a.seat.localeCompare(b.seat));
    if (emit) this.emit('player-joined', player, 'departed', 'active', 'live-admission');
    return true;
  }
  admit(admission: SessionAdmission): boolean {
    const plan = this.active ? this.prepareAdmission(admission) : undefined;
    return !!plan && this.admitPlan(plan);
  }
  deviceLost(seat: SeatId, cause = 'device-lost'): boolean {
    const player = this.players.find(candidate => candidate.seat === seat);
    if (!player || player.participation !== 'active') return false;
    player.participation = 'device-lost'; player.deviceLostAt = this.world.time;
    this.emit('device-lost', player, 'active', 'device-lost', cause); return true;
  }
  offerReclaim(seat: SeatId, device: DeviceId): boolean {
    const player = this.players.find(candidate => candidate.seat === seat);
    if (!player || player.participation !== 'device-lost') return false;
    this.emit('reclaim-offered', player, 'device-lost', 'device-lost', 'device-reclaim-offered', device);
    return true;
  }
  reclaim(seat: SeatId, device: DeviceId): boolean {
    const player = this.players.find(candidate => candidate.seat === seat);
    if (!player || player.participation !== 'device-lost' || this.players.some(candidate => candidate !== player && candidate.participation === 'active' && candidate.device === device)) return false;
    const placement = this.mode?.handlers.reclaim ? this.safePlacement(player) : undefined;
    if (this.mode?.handlers.reclaim && !placement) return false;
    player.device = device; this.addRecoveryDeviceAlias(player, device); player.participation = 'active';
    if (placement) { player.x = player.fromX = placement.x; player.y = player.fromY = placement.y; }
    player.statistics.deviceLostDuration += Math.max(0, this.world.time - (player.deviceLostAt ?? this.world.time)); player.deviceLostAt = null;
    this.emit('reclaimed', player, 'device-lost', 'active', 'device-reclaimed'); return true;
  }
  depart(seat: SeatId, cause = 'departed'): boolean {
    const player = this.players.find(candidate => candidate.seat === seat);
    if (!player || player.participation === 'departed') return false;
    const previous = player.participation; player.participation = 'departed';
    const record = this.lifecycleRecord('departed', player, previous, 'departed', cause);
    const disposition = this.dispatchMode(record);
    if (disposition?.releaseSeat) {
      this.contributionRecords.push(Object.freeze({ seat: player.seat, characterId: player.characterId, participantId: player.participantId, statistics: Object.freeze({ ...player.statistics }), recovery: player.recovery!, reason: cause }));
      this.roster.splice(this.roster.indexOf(player), 1);
    }
    this.publish(record);
    return true;
  }
  private collectCompletedState(player: SessionPlayer, prior: RunState): { player: SessionPlayer; previous: SessionParticipation; cause: string } | undefined {
    player.statistics.distance = Math.max(player.statistics.distance, player.primary ? player.maxY : player.earnedDistance);
    player.statistics.coins = player.coins;
    if (prior === 'playing' && player.state === 'dead') {
      const previous = player.participation; player.participation = 'dead'; player.statistics.deaths++; player.statistics.deathCause = player.deathCause;
      return { player, previous, cause: player.deathCause ?? 'unknown' };
    }
  }
  update(dt: number): void {
    if (!this.active) return;
    // There is exactly one course advance per fixed tick. Seat iteration is
    // deterministic only for personal timers, never as world authority.
    const activePlayers = this.players.filter(player => player.state === 'playing' && player.participation === 'active');
    if (!activePlayers.length) return;
    this.world.releaseInactivePickupClaims(this.players);
    const frame = this.world.beginFrame(activePlayers);
    const previousTime = this.world.update(dt);
    const groundBefore = frame.playerGround;
    const priorStates = new Map(activePlayers.map(player => [player, player.state]));
    for (const player of this.players) {
      if (!activePlayers.includes(player)) continue;
      this.world.resolvePlayer(player, () => player.update(dt, previousTime, false));
    }
    this.world.resolvePickups();
    this.world.host.updateSessionMobs(activePlayers, this.world.time - previousTime, groundBefore);
    const terminal = activePlayers.flatMap(player => {
      const transition = this.collectCompletedState(player, priorStates.get(player)!);
      return transition ? [transition] : [];
    });
    for (const transition of terminal) this.emit('player-death', transition.player, transition.previous, 'dead', transition.cause);
  }
  /** Rendering owns this clock so each terminal spill ages once per frame. */
  advanceDeathVisuals(dt: number): void { for (const player of this.players) this.world.host.advancePlayerDeathVisuals(player, dt); }
  get running(): boolean { return this.active; }
  views(): PlayerRender[] { return this.players.map(player => player.render()); }
  stop(): void { this.active = false; }
}

export class LocalSessionStage {
  private state: 'staged' | 'cancelled' | 'committed' = 'staged';
  private readonly stagedPrimaryDevice: DeviceId | undefined;
  constructor(readonly game: Game, readonly session: LocalSession, private readonly originalPrimaryDevice = session.players.find(player => player.primary)?.device) {
    this.stagedPrimaryDevice = session.players.find(player => player.primary)?.device;
  }
  cancel(): Game {
    if (this.state === 'committed') throw new Error('A committed LocalSession cannot return to staged solo ownership.');
    this.session.stop();
    const primary = this.session.players.find(player => player.primary);
    if (primary && this.originalPrimaryDevice) primary.device = this.originalPrimaryDevice;
    this.state = 'cancelled'; return this.game;
  }
  commit(): LocalSession {
    if (this.state === 'cancelled') throw new Error('A cancelled LocalSession stage cannot be committed.');
    if (this.state === 'staged') {
      const primary = this.session.players.find(player => player.primary);
      if (primary && this.stagedPrimaryDevice) primary.device = this.stagedPrimaryDevice;
      this.session.start(); this.state = 'committed';
    }
    return this.session;
  }
  commitAdmission(admission: SessionAdmission): LocalSession | undefined {
    if (this.state !== 'staged') return undefined;
    if (!this.session.prepareAdmission(admission)) return undefined;
    this.commit();
    return this.session.admit(admission) ? this.session : undefined;
  }
}
