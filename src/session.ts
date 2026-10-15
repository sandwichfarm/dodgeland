import { CHARACTERS, DEFAULT_CHARACTER, characterById } from './content.js';
import { HALF_WIDTH, laneActors, platformSupports, platformSurface } from './game.js';
import type { DeathCause, Direction, Game, GameWorldExtension, HurtEvent, Lane, RunState } from './game.js';
import type { ModeDefinition, ModeRules } from './mode-rules.js';
import { DEFAULT_COIN_GRAVITY, RunInventory } from './market/run.js';
import { characterPower } from './character-powers.js';
import type { CharacterPower } from './character-powers.js';
import type { RecoveryKind } from './recovery.js';
import { advanceCoinPull } from './coin-pull.js';
import { planConsumableCredit, planConsumableDebit } from './consumables.js';
import type { ConsumableId } from './consumables.js';
import { sampleConsumableDrop } from './consumable-drops.js';

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
  attach?(session: LocalSession): void;
  join?(record: SessionLifecycleRecord): void;
  deviceLost?(record: SessionLifecycleRecord): void;
  reclaim?(record: SessionLifecycleRecord): void;
  depart?(record: SessionLifecycleRecord): { readonly releaseSeat?: boolean } | void;
  death?(record: SessionLifecycleRecord): void;
  progress?(player: SessionPlayer, session: LocalSession): void;
  result?(session: LocalSession): void;
  tick?(session: LocalSession): void;
  /** Whether an otherwise all-dead session may advance one more active-time tick. */
  pending?(session: LocalSession): boolean;
  recover?(session: LocalSession, request: SessionRecoveryRequest): boolean;
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
  /** Spatial high-water rejects repeated rows after an alias returns or a regroup relocates it. */
  readonly spatialFrontierY: number;
  readonly deathGeneration: number;
  readonly offer?: Readonly<{ generation: number; deadline: number }>;
  readonly protectionUntil?: number;
  readonly lastSafe?: Readonly<{ x: number; y: number }>;
}
export interface SessionRecoveryRequest {
  readonly kind: RecoveryKind;
  readonly ownerSeat: SeatId;
  readonly targetSeat?: SeatId;
  /** Later consumable plans supply an owned debit capability. */
  readonly debit?: () => boolean;
}
export interface ConsumablePickupSnapshot { readonly id: string; readonly itemId: ConsumableId; readonly row: number; readonly slot: number; readonly x: number; readonly y: number; readonly z: number }
export interface ConsumableChargeSnapshot { readonly seat: SeatId; readonly ownerGeneration: number; readonly inventoryGeneration: number; readonly revival: number; readonly flare: number }
export interface ConsumableWorldSnapshot { readonly generation: number; readonly pickups: readonly ConsumablePickupSnapshot[]; readonly charges: readonly ConsumableChargeSnapshot[]; readonly claims: readonly Readonly<{ pickupId: string; seat: SeatId }>[]; readonly protected: readonly Readonly<{ seat: SeatId; until: number }>[] }
export interface ConsumableAction { readonly actionId: string; readonly ownerSeat: SeatId; readonly itemId: ConsumableId; readonly targetSeat?: SeatId; readonly expectedInventoryGeneration: number; readonly expectedOwnerGeneration: number; readonly expectedTargetDeathGeneration?: number }
export interface SessionContribution {
  readonly seat: SeatId;
  readonly characterId: string;
  readonly participantId: string;
  readonly statistics: Readonly<SessionPlayer['statistics']>;
  readonly recovery: SessionRecoveryProvenance;
  readonly reason: string;
}
export interface SessionResult { readonly mode: string; readonly outcome: string; }
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
  readonly protectionUntil?: number;
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
  /** Lowest active seat row retained with the shared course. */
  activeFloor: number;
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
    this.frontier = game.maxY; this.activeFloor = game.maxY;
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
  /** Assigned by LocalSession; movement stays production-owned even in direct player tests. */
  session: LocalSession | undefined;
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
  /** Only completed forward hops feed personal revival credit. */
  completedForwardTiles = 0;
  /** Spatial high-water is reset by forced return placement; only landed new rows count. */
  personalFrontierY = -Infinity;
  participation: SessionParticipation = 'active';
  deviceLostAt: number | null = null;
  readonly statistics = { distance: 0, coins: 0, pickups: 0, damage: 0, deaths: 0, selfRevives: 0, teammateRevives: 0, itemsFound: 0, itemsUsed: 0, deviceLostDuration: 0, deathCause: null as DeathCause | null };

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
  render(): PlayerRender {
    const protectionUntil = this.recovery?.protectionUntil;
    const base: Omit<PlayerRender, 'protectionUntil'> = { seat: this.seat, marker: this.marker, label: this.label, characterId: this.characterId, x: this.x, y: this.y, groundX: this.groundX, groundY: this.groundY, hop: this.hop, fromY: this.fromY, state: this.state, run: this.run, hurtRemaining: this.hurtRemaining, powerRescue: this.powerRescue, powerFlash: this.powerFlash, power: this.power, caughtByWave: this.caughtByWave, deathSpill: this.deathSpill };
    return protectionUntil !== undefined && protectionUntil > 0 ? { ...base, protectionUntil } : base;
  }

  start(): boolean {
    return this.world.host.startPlayer(this);
  }

  move(direction: Direction): boolean {
    const beforeY = this.y;
    const moved = this.world.host.movePlayer(this, direction);
    if (moved && direction === 'forward' && this.y > beforeY) this.session?.noteForwardHop(this, this.y);
    return moved;
  }

  update(dt: number, previousTime: number, drivesWorld: boolean): void {
    this.world.host.updateSessionPlayer(this, dt, previousTime, drivesWorld);
  }
}

type MutableConsumablePickup = Omit<ConsumablePickupSnapshot, 'x' | 'y'> & { x: number; y: number; z: number; speed: number; actorId?: number };
type ConsumableCharge = { ownerGeneration: number; inventoryGeneration: number; revival: number; flare: number };
/** Handler-owned item state.  It is absent until its definition explicitly installs it. */
class ConsumableWorld implements GameWorldExtension {
  private readonly pickups = new Map<string, MutableConsumablePickup>();
  private readonly charges = new Map<string, ConsumableCharge>();
  private readonly claims = new Map<string, SeatId>();
  private readonly actions = new Map<string, number>();
  private generation = 0;
  private nextInventoryGeneration = 1;
  private game: Game | undefined;
  constructor(private readonly session: LocalSession) {}
  attach(game: Game): void {
    this.game = game;
    for (const player of this.session.players) this.charge(player);
  }
  initialize(player: SessionPlayer): void { this.charge(player); }
  row(game: Game, lane: Lane): void {
    const drop = sampleConsumableDrop({ courseSeed: game.runSeed?.seed ?? game.seed, row: lane.index, slot: 0 });
    if (!drop.itemId || this.pickups.has(drop.pickupId) || this.claims.has(drop.pickupId)) return;
    const actor = lane.kind === 'river' ? laneActors(lane, game.time).sort((a, b) => Math.abs(a.x) - Math.abs(b.x) || a.id - b.id)[0] : undefined;
    const landAnchor = [0, ...Array.from({ length: HALF_WIDTH }, (_, offset) => [-(offset + 1), offset + 1]).flat()].find(x => !lane.blocked.includes(x));
    if (!actor && landAnchor === undefined) return;
    this.pickups.set(drop.pickupId, { id: drop.pickupId, itemId: drop.itemId, row: lane.index, slot: 0, x: actor?.x ?? landAnchor!, y: lane.index, z: platformSurface(lane), speed: 0, actorId: actor?.id });
  }
  private ownerId(player: SessionPlayer): string { return player.participantId || player.seat; }
  private charge(player: SessionPlayer): ConsumableCharge {
    const ownerId = this.ownerId(player);
    let charge = this.charges.get(ownerId);
    if (!charge) {
      charge = { ownerGeneration: player.recovery?.deathGeneration ?? 0, inventoryGeneration: this.nextInventoryGeneration++, revival: 0, flare: 0 };
      this.charges.set(ownerId, charge);
    }
    return charge;
  }
  private eligible(player: SessionPlayer, itemId: ConsumableId): boolean {
    if (player.participation !== 'active' || player.state !== 'playing') return false;
    const charge = this.charge(player);
    return planConsumableCredit({ mode: { capabilities: ['survive-together'] }, owner: { id: player.seat, generation: charge.ownerGeneration }, inventory: { owner: { id: player.seat, generation: charge.ownerGeneration }, generation: charge.inventoryGeneration, charges: { revival: charge.revival, flare: charge.flare } }, expectedInventoryGeneration: charge.inventoryGeneration, itemId }).ok;
  }
  tick(game: Game, _session: LocalSession, players: readonly SessionPlayer[], frame: WorldFrame, dt: number): void {
    for (const pickup of [...this.pickups.values()]) {
      const lane = game.rows.get(pickup.row);
      if (lane?.kind === 'river' && pickup.actorId !== undefined) {
        const actor = laneActors(lane, game.time).find(candidate => candidate.id === pickup.actorId);
        if (actor) pickup.x = actor.x;
      }
      // The shared row window follows its slowest active traveler.  Keep an
      // attracted item to that same cleanup horizon, never merely the leader.
      const retentionFloor = Math.min(game.world.frontier, game.world.activeFloor);
      if (pickup.y < retentionFloor - game.rules.retention.rowsBehind) { this.pickups.delete(pickup.id); continue; }
      const eligible = players.filter(player => this.eligible(player, pickup.itemId));
      const contacts = eligible.map(player => {
        const before = frame.playerGround.get(player) ?? { x: player.groundX, y: player.groundY };
        const startX = before.x - pickup.x, startY = before.y - pickup.y, endX = player.groundX - pickup.x, endY = player.groundY - pickup.y;
        const dx = endX - startX, dy = endY - startY, a = dx * dx + dy * dy, b = 2 * (startX * dx + startY * dy), c = startX * startX + startY * startY - .32 ** 2;
        const discriminant = b * b - 4 * a * c;
        const fraction = c <= 0 ? 0 : a > 1e-12 && discriminant >= 0 ? (-b - Math.sqrt(discriminant)) / (2 * a) : Infinity;
        return { player, distance: endX * endX + endY * endY, fraction: fraction >= 0 && fraction <= 1 ? fraction : Infinity };
      });
      const winner = contacts.filter(candidate => candidate.fraction !== Infinity).sort((a, b) => a.fraction - b.fraction || a.distance - b.distance || a.player.seat.localeCompare(b.player.seat))[0];
      if (winner && this.credit(winner.player, pickup)) { this.claims.set(pickup.id, winner.player.seat); this.pickups.delete(pickup.id); continue; }
      const candidates = contacts.filter(candidate => candidate.distance <= (game.rules.retention.captureDistance + DEFAULT_COIN_GRAVITY) ** 2);
      if (!candidates.length) continue;
      const target = [...candidates].sort((a, b) => a.distance - b.distance || a.player.seat.localeCompare(b.player.seat))[0]!;
      const pull = { x: pickup.x, y: pickup.y, z: pickup.z, speed: pickup.speed };
      advanceCoinPull(pull, target.player.groundX, target.player.groundY, platformSurface(game.rows.get(target.player.y)), dt);
      pickup.x = pull.x; pickup.y = pull.y; pickup.z = pull.z; pickup.speed = pull.speed; delete pickup.actorId;
    }
  }
  private credit(player: SessionPlayer, pickup: MutableConsumablePickup): boolean {
    const charge = this.charge(player);
    const plan = planConsumableCredit({ mode: { capabilities: ['survive-together'] }, owner: { id: player.seat, generation: charge.ownerGeneration }, inventory: { owner: { id: player.seat, generation: charge.ownerGeneration }, generation: charge.inventoryGeneration, charges: { revival: charge.revival, flare: charge.flare } }, expectedInventoryGeneration: charge.inventoryGeneration, itemId: pickup.itemId });
    if (!plan.ok) return false;
    charge.revival = plan.resultingCharges.revival; charge.flare = plan.resultingCharges.flare; charge.inventoryGeneration = this.nextInventoryGeneration++;
    player.statistics.itemsFound++; this.generation++; return true;
  }
  use(action: ConsumableAction): boolean {
    const game = this.game, owner = this.session.players.find(player => player.seat === action.ownerSeat);
    if (!game || !owner || !/^[-a-zA-Z0-9_.]{1,128}$/.test(action.actionId) || this.actions.get(action.actionId) !== undefined || this.actions.has(`${game.world.simulationTick}:${this.ownerId(owner)}`)) return false;
    if (owner.participation !== 'active' || owner.state !== 'playing') return false;
    const charge = this.charge(owner);
    if (charge.inventoryGeneration !== action.expectedInventoryGeneration || charge.ownerGeneration !== action.expectedOwnerGeneration) return false;
    const targets = action.itemId === 'revival' ? action.targetSeat ? this.session.players.filter(player => player.seat === action.targetSeat) : []
      : this.session.players.filter(player => player !== owner && ((player.participation === 'dead' && player.state === 'dead') || (player.participation === 'active' && player.state === 'playing')));
    if (action.itemId === 'revival' && (!targets[0]?.recovery || action.expectedTargetDeathGeneration === undefined || targets[0].recovery.deathGeneration !== action.expectedTargetDeathGeneration)) return false;
    const plan = planConsumableDebit({ mode: { capabilities: ['survive-together'] }, owner: { id: owner.seat, generation: charge.ownerGeneration }, inventory: { owner: { id: owner.seat, generation: charge.ownerGeneration }, generation: charge.inventoryGeneration, charges: { revival: charge.revival, flare: charge.flare } }, expectedInventoryGeneration: action.expectedInventoryGeneration, itemId: action.itemId, targets: targets.map(player => ({ id: player.seat, lifecycle: player.participation === 'dead' && player.state === 'dead' ? 'dead' : 'living' })) });
    if (!plan.ok) return false;
    const request: SessionRecoveryRequest = action.itemId === 'revival' ? { kind: 'revival', ownerSeat: owner.seat, targetSeat: action.targetSeat, debit: () => this.debit(action, plan.resultingCharges) }
      : { kind: 'flare', ownerSeat: owner.seat, debit: () => this.debit(action, plan.resultingCharges) };
    return this.session.recover(request);
  }
  private debit(action: ConsumableAction, charges: Readonly<Record<ConsumableId, number>>): boolean {
    const owner = this.session.players.find(player => player.seat === action.ownerSeat), current = owner ? this.charges.get(this.ownerId(owner)) : undefined;
    if (!current || current.inventoryGeneration !== action.expectedInventoryGeneration || this.actions.has(action.actionId) || this.actions.has(`${this.session.world.simulationTick}:${owner ? this.ownerId(owner) : ''}`)) return false;
    current.revival = charges.revival; current.flare = charges.flare; current.inventoryGeneration = this.nextInventoryGeneration++;
    this.actions.set(action.actionId, this.session.world.simulationTick); this.actions.set(`${this.session.world.simulationTick}:${this.ownerId(owner!)}`, this.session.world.simulationTick); this.generation++; return true;
  }
  clear(player: SessionPlayer): void { const charge = this.charges.get(this.ownerId(player)); if (charge) { charge.revival = 0; charge.flare = 0; charge.inventoryGeneration = this.nextInventoryGeneration++; charge.ownerGeneration++; this.generation++; } }
  snapshot(): ConsumableWorldSnapshot {
    const pickups = [...this.pickups.values()].map(({ speed: _speed, actorId: _actorId, ...pickup }) => Object.freeze({ ...pickup })).sort((a, b) => a.id.localeCompare(b.id));
    const charges = this.session.players.map(player => Object.freeze({ seat: player.seat, ...this.charges.get(this.ownerId(player))! })).sort((a, b) => a.seat.localeCompare(b.seat));
    const claims = [...this.claims.entries()].map(([pickupId, seat]) => Object.freeze({ pickupId, seat })).sort((a, b) => a.pickupId.localeCompare(b.pickupId));
    const protectedSeats = this.session.players.filter(player => (player.recovery?.protectionUntil ?? 0) > this.session.world.time).map(player => Object.freeze({ seat: player.seat, until: player.recovery?.protectionUntil ?? 0 }));
    return Object.freeze({ generation: this.generation, pickups: Object.freeze(pickups), charges: Object.freeze(charges), claims: Object.freeze(claims), protected: Object.freeze(protectedSeats) });
  }
  dispose(): void { this.pickups.clear(); this.charges.clear(); this.claims.clear(); this.actions.clear(); this.game = undefined; }
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
  private readonly pendingForwardHops = new Map<SessionPlayer, number>();
  private resultRecord: SessionResult | undefined;
  private nextGrant = 1;
  private active = false;
  private consumableWorld: ConsumableWorld | undefined;
  private releaseWorldExtension: (() => void) | undefined;

  constructor(world: SharedWorld, players: readonly SessionPlayer[], options: { config?: SessionConfig; onLifecycle?: SessionLifecycleHandler; mode?: SessionModeDefinition } = {}) {
    this.config = options.config ?? DEFAULT_SESSION_CONFIG;
    if (!Number.isInteger(this.config.capacity) || this.config.capacity < 1 || this.config.capacity > 4) throw new RangeError('Session capacity must be a validated integer from one through four.');
    if (players.length < 1 || players.length > this.config.capacity || new Set(players.map(player => player.seat)).size !== players.length || new Set(players.map(player => player.device)).size !== players.length || new Set(players.map(player => player.characterId)).size !== players.length) throw new TypeError('A local session needs unique stable seats, devices, and characters within its configured capacity.');
    if (options.mode && options.mode.definition !== world.definition) throw new TypeError('A session mode must compose the exact live world definition.');
    this.world = world; this.roster = [...players].sort((a, b) => a.seat.localeCompare(b.seat)); this.definition = world.definition; this.mode = options.mode; this.id = `local-${world.seed.toString(36)}-${world.simulationTick}`; this.lifecycleHandler = options.onLifecycle ?? (() => {});
  }

  get players(): readonly SessionPlayer[] { return this.roster; }
  get contributions(): readonly SessionContribution[] { return this.contributionRecords; }
  get result(): SessionResult | undefined { return this.resultRecord; }
  /** A mode handler opts in after its staged adoption is committed. */
  installConsumableWorld(): void {
    if (this.consumableWorld) return;
    const capability = new ConsumableWorld(this);
    this.releaseWorldExtension = this.world.host.installWorldExtension(capability);
    this.consumableWorld = capability;
  }
  consumableSnapshot(): ConsumableWorldSnapshot | undefined { return this.consumableWorld?.snapshot(); }
  useConsumable(action: ConsumableAction): boolean { return !!this.consumableWorld && !this.resultRecord && this.consumableWorld.use(action); }
  clearConsumables(seat: SeatId): void { const player = this.players.find(candidate => candidate.seat === seat); if (player) this.consumableWorld?.clear(player); }

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
      player.session = this; player.personalFrontierY = Math.max(player.personalFrontierY, player.groundY);
      player.start();
    }
    this.world.sessionActive = true; this.world.host.resetSharedWorldEffects(); this.active = true; this.mode?.handlers.attach?.(this);
  }
  dispatch(action: SeatAction): boolean {
    const player = this.players.find(candidate => candidate.seat === action.seat);
    const moved = !!player && this.active && player.participation === 'active' && player.move(action.direction);
    return moved;
  }
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
  /** Current-world safe cells for the one recovery planner.  Stable offsets make plans deterministic. */
  recoverySafeCells(kind: RecoveryKind, owner: SessionPlayer, targets: readonly SessionPlayer[]): readonly Readonly<{ x: number; y: number }>[] {
    const returning = new Set(kind === 'flare' ? [owner, ...targets] : targets);
    if (kind === 'personal') returning.add(owner);
    const living = this.players.filter(player => player.participation === 'active' && player.state === 'playing');
    const livingAnchor = [...living].sort((a, b) => b.groundY - a.groundY || a.seat.localeCompare(b.seat))[0];
    const allDeadPersonal = kind === 'personal' && !livingAnchor;
    const anchor = allDeadPersonal && owner.recovery?.lastSafe ? owner.recovery.lastSafe
      : kind === 'flare' ? { x: owner.groundX, y: owner.groundY }
        : livingAnchor ? { x: livingAnchor.groundX, y: livingAnchor.groundY } : undefined;
    if (!anchor) return Object.freeze([]);
    const frontier = livingAnchor?.groundY ?? anchor.y;
    const occupied = new Set(this.players.filter(player => !returning.has(player) && player.participation === 'active' && player.state === 'playing').map(player => `${Math.round(player.groundX)}:${Math.round(player.groundY)}`));
    const cells: { x: number; y: number }[] = [];
    const offsets = [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5];
    for (const row of [Math.round(anchor.y), Math.round(anchor.y) - 1, Math.round(anchor.y) - 2]) {
      if (!allDeadPersonal && row > frontier + 1e-9) continue;
      const lane = this.world.rows.get(row);
      if (!lane || (this.world.rules.pursuit.strategy === 'wave' && row <= this.world.waveRow + .2)) continue;
      for (const offset of offsets) {
        const x = Math.round(anchor.x + offset);
        const key = `${x}:${row}`;
        if (x < -5 || x > 5 || occupied.has(key) || cells.some(cell => cell.x === x && cell.y === row) || lane.blocked.includes(x)) continue;
        if (lane.kind === 'river' && !platformSupports(lane, x, this.world.time)) continue;
        if ((lane.kind === 'road' || lane.kind === 'rail') && !laneActors(lane, this.world.time).every(actor => Math.abs(actor.x - x) > actor.length / 2 + .2)) continue;
        if (this.world.mobs.some(mob => mob.phase !== 'spawning' && Math.hypot(mob.x - x, mob.y - row) < .7)) continue;
        cells.push(Object.freeze({ x, y: row }));
      }
    }
    if (kind === 'flare') {
      const row = Math.round(owner.groundY), lane = this.world.rows.get(row);
      const exact = { x: owner.groundX, y: row };
      const anchorSafe = !!lane && exact.x >= -5 && exact.x <= 5 && !lane.blocked.includes(Math.round(exact.x))
        && (lane.kind !== 'river' || platformSupports(lane, exact.x, this.world.time))
        && ((lane.kind !== 'road' && lane.kind !== 'rail') || laneActors(lane, this.world.time).every(actor => Math.abs(actor.x - exact.x) > actor.length / 2 + .2))
        && !this.world.mobs.some(mob => mob.phase !== 'spawning' && Math.hypot(mob.x - exact.x, mob.y - row) < .7);
      if (!anchorSafe) return Object.freeze([]);
      const remaining = cells.filter(cell => !(cell.y === row && Math.round(cell.x) === Math.round(exact.x)));
      const ordered = [...targets].sort((left, right) => left.seat.localeCompare(right.seat));
      if (remaining.length < ordered.length - 1) return Object.freeze([]);
      let index = 0;
      return Object.freeze(ordered.map(player => player === owner ? Object.freeze(exact) : remaining[index++]!));
    }
    return Object.freeze(cells);
  }
  /** A retained personal anchor must be a settled, currently hazard-free cell. */
  isRecoverySafePosition(player: SessionPlayer): boolean {
    if (player.hop > 0 || player.powerRescue || Math.round(player.y) !== player.y) return false;
    const lane = this.world.rows.get(player.y);
    if (!lane || lane.blocked.includes(Math.round(player.x))) return false;
    if (this.world.rules.pursuit.strategy === 'wave' && player.y <= this.world.waveRow + .2) return false;
    if (lane.kind === 'river' && !platformSupports(lane, player.x, this.world.time)) return false;
    if ((lane.kind === 'road' || lane.kind === 'rail') && !laneActors(lane, this.world.time).every(actor => Math.abs(actor.x - player.x) > actor.length / 2 + .2)) return false;
    return !this.world.mobs.some(mob => mob.phase !== 'spawning' && Math.hypot(mob.x - player.x, mob.y - player.y) < .7);
  }
  private recoveryFor(admission: SessionAdmission): SessionRecoveryProvenance {
    const exact = admission.participantId ? this.provenanceAliases.get(`participant:${admission.participantId}`) : undefined;
    const alias = !admission.participantId ? this.provenanceAliases.get(`device:${admission.device}`) ?? this.provenanceAliases.get(`character:${admission.characterId}`) : undefined;
    return exact ?? alias ?? Object.freeze({
      grantId: `${this.id}:grant-${this.nextGrant++}`,
      participantId: admission.participantId ?? `${this.id}:anonymous-${this.nextGrant}`,
      aliases: Object.freeze([]), charge: 'available', personalHighWater: 0, nextRecharge: 250, spatialFrontierY: -Infinity, deathGeneration: 0, protectionUntil: 0,
    });
  }
  private bindRecovery(player: SessionPlayer, admission: SessionAdmission): void {
    const recovery = this.recoveryFor(admission);
    const aliases = new Set([...recovery.aliases, `device:${admission.device}`, `character:${admission.characterId}`]);
    if (admission.participantId) aliases.add(`participant:${admission.participantId}`);
    const bound = Object.freeze({ ...recovery, aliases: Object.freeze([...aliases].sort()), spatialFrontierY: Math.max(recovery.spatialFrontierY, player.groundY, player.maxY), lastSafe: recovery.lastSafe ?? Object.freeze({ x: player.groundX, y: player.groundY }) });
    for (const alias of bound.aliases) this.provenanceAliases.set(alias, bound);
    player.participantId = admission.participantId ?? bound.participantId; player.recovery = bound;
    player.completedForwardTiles = bound.personalHighWater; player.personalFrontierY = bound.spatialFrontierY;
  }
  private addRecoveryDeviceAlias(player: SessionPlayer, device: DeviceId): void {
    if (!player.recovery) return;
    const aliases = new Set([...player.recovery.aliases, `device:${device}`]);
    const bound = Object.freeze({ ...player.recovery, aliases: Object.freeze([...aliases].sort()) });
    for (const alias of bound.aliases) this.provenanceAliases.set(alias, bound);
    player.recovery = bound;
  }
  /** Replace the immutable provenance record everywhere its aliases are known. */
  updateRecovery(player: SessionPlayer, update: (recovery: SessionRecoveryProvenance) => SessionRecoveryProvenance): SessionRecoveryProvenance | undefined {
    if (!player.recovery) return undefined;
    const next = Object.freeze(update(player.recovery));
    for (const alias of next.aliases) this.provenanceAliases.set(alias, next);
    for (const candidate of this.roster) if (candidate.recovery?.grantId === next.grantId) candidate.recovery = next;
    return next;
  }
  /** Finished movement only: a started hop that dies cannot mint revival credit. */
  private settleForwardHop(player: SessionPlayer): void {
    const target = this.pendingForwardHops.get(player);
    if (target === undefined || player.state !== 'playing' || player.participation !== 'active' || player.hop > 0 || Math.round(player.groundY) !== target) return;
    this.pendingForwardHops.delete(player);
    if (target <= player.personalFrontierY) return;
    player.personalFrontierY = target; player.completedForwardTiles++;
    this.recordPersonalProgress(player, player.completedForwardTiles);
    this.updateRecovery(player, recovery => ({ ...recovery, spatialFrontierY: Math.max(recovery.spatialFrontierY, target) }));
    this.mode?.handlers.progress?.(player, this);
  }
  /** Records an initiated hop only; `settleForwardHop` waits for its landing. */
  noteForwardHop(player: SessionPlayer, targetY: number): void {
    if (this.active && player.participation === 'active') this.pendingForwardHops.set(player, Math.round(targetY));
  }
  cancelForwardHop(player: SessionPlayer): void { this.pendingForwardHops.delete(player); }
  /** Public for deterministic production-state tests; progress cannot go backwards. */
  recordPersonalProgress(player: SessionPlayer, absoluteProgress: number): void {
    if (!player.recovery || !Number.isInteger(absoluteProgress) || absoluteProgress <= player.recovery.personalHighWater) return;
    const recovery = player.recovery;
    const charged = recovery.charge === 'spent' && absoluteProgress >= recovery.nextRecharge ? 'available' : recovery.charge;
    const nextRecharge = charged === 'available' && recovery.charge === 'spent' ? recovery.nextRecharge + 250 : recovery.nextRecharge;
    this.updateRecovery(player, current => ({ ...current, personalHighWater: absoluteProgress, charge: charged, nextRecharge }));
  }
  recover(request: SessionRecoveryRequest): boolean { return !this.resultRecord && !!this.mode?.handlers.recover?.(this, request); }
  /** A player can explicitly close only their current personal-revival offer. */
  declineRecovery(seat: SeatId): boolean {
    const player = this.players.find(candidate => candidate.seat === seat);
    const recovery = player?.recovery;
    const offer = recovery?.offer;
    if (!player || !recovery || player.participation !== 'dead' || player.state !== 'dead' || !offer || offer.generation !== recovery.deathGeneration || offer.deadline <= this.world.time) return false;
    this.updateRecovery(player, recovery => ({ ...recovery, offer: undefined }));
    this.mode?.handlers.tick?.(this);
    return true;
  }
  completeResult(result: SessionResult): boolean {
    if (this.resultRecord) return false;
    this.resultRecord = result; this.mode?.handlers.result?.(this); return true;
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
    this.bindRecovery(player, admission); this.consumableWorld?.initialize(player);
    if (this.active) player.session = this; this.roster.push(player); this.roster.sort((a, b) => a.seat.localeCompare(b.seat));
    if (emit) this.emit('player-joined', player, 'departed', 'active', 'live-admission');
    return true;
  }
  admit(admission: SessionAdmission): boolean {
    const plan = this.active && !this.resultRecord ? this.prepareAdmission(admission) : undefined;
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
    if (this.world.host.state === 'paused') return;
    // Tests and shell integrations may deliver a completed production death
    // between fixed session ticks.  Observe it once before all-dead liveness.
    for (const player of this.players) if (player.participation === 'active' && player.state === 'dead') {
      player.participation = 'dead'; player.statistics.deaths++; player.statistics.deathCause = player.deathCause;
      this.pendingForwardHops.delete(player); this.emit('player-death', player, 'active', 'dead', player.deathCause ?? 'unknown');
    }
    // There is exactly one course advance per fixed tick. Seat iteration is
    // deterministic only for personal timers, never as world authority.
    const activePlayers = this.players.filter(player => player.state === 'playing' && player.participation === 'active');
    if (!activePlayers.length) {
      if (!this.mode?.handlers.pending?.(this)) { this.mode?.handlers.tick?.(this); return; }
      this.world.update(dt);
      this.mode?.handlers.tick?.(this);
      return;
    }
    this.world.releaseInactivePickupClaims(this.players);
    const frame = this.world.beginFrame(activePlayers);
    const priorStates = new Map(activePlayers.map(player => [player, player.state]));
    const previousTime = this.world.update(dt);
    this.world.activeFloor = Math.min(...activePlayers.flatMap(player => [Math.floor(player.groundY), Math.floor(player.fromY), Math.floor(player.y)]));
    this.world.host.ensureRows();
    const groundBefore = frame.playerGround;
    for (const player of this.players) {
      if (!activePlayers.includes(player)) continue;
      this.world.resolvePlayer(player, () => player.update(dt, previousTime, false));
    }
    this.world.host.updateSessionWorldExtension(this, activePlayers, frame, this.world.time - previousTime);
    this.world.resolvePickups();
    this.world.host.updateSessionMobs(activePlayers, this.world.time - previousTime, groundBefore);
    const terminal = activePlayers.flatMap(player => {
      const transition = this.collectCompletedState(player, priorStates.get(player)!);
      return transition ? [transition] : [];
    });
    for (const transition of terminal) { this.pendingForwardHops.delete(transition.player); this.emit('player-death', transition.player, transition.previous, 'dead', transition.cause); }
    for (const player of activePlayers) this.settleForwardHop(player);
    this.mode?.handlers.tick?.(this);
  }
  /** Rendering owns this clock so each terminal spill ages once per frame. */
  advanceDeathVisuals(dt: number): void { for (const player of this.players) this.world.host.advancePlayerDeathVisuals(player, dt); }
  get running(): boolean { return this.active; }
  views(): PlayerRender[] { return this.players.map(player => player.render()); }
  stop(): void { this.active = false; this.releaseWorldExtension?.(); this.releaseWorldExtension = undefined; this.consumableWorld = undefined; }
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
