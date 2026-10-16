import { CHARACTERS, DEFAULT_CHARACTER, TRAIN_BOUNDS, WORLDS, characterById, worldById } from './content.js';
import { characterPower, powerMatches } from './character-powers.js';
import type { CharacterPower } from './character-powers.js';
import type { LaneKind, Voxel, World } from './content.js';
import { MobDirector } from './mobs.js';
import type { Mob } from './mobs.js';
import { RunInventory, defaultModifiers } from './market/run.js';
import type { ItemDefinition, RunModifiers } from './market/types.js';
import type { CoinPull } from './coin-pull.js';
import { createDeathSpill } from './death-spill.js';
import type { DeathSpill } from './death-spill.js';
import { advanceCoinPull } from './coin-pull.js';
import { coinDenomination, coinDenominationForRow, touchesCoin } from './coin-denominations.js';
import type { CoinDenominationId } from './coin-denominations.js';
import { createRunSeed, decodeRunSeed, encodeRunSeed, validateRunSeed } from './run-seed.js';
import type { RunSeed } from './run-seed.js';
import { generateSeedLane } from './levels/index.js';
import { HOME_IDS_V1 } from './levels/v1-content.js';
import { BASE_COIN_CHANCE_V1, difficulty, generateLane as generateLaneV1, random, wrap, worldForRow as worldForRowV1 } from './levels/v1.js';
import { applyActorEffects, progressiveActors, progressiveCoinPosition } from './actors.js';
import type { ActorPattern, LaneActor } from './actors.js';
import { vehicleModel, vehicleModelWidth } from './vehicle-models.js';
import { SOLO_ARCADE_MODE, isModeDefinition, soloModeDefinition } from './mode-rules.js';
import type { ModeDefinition, ModeRules, SoloLifecycleEventName, SoloMode } from './mode-rules.js';
import { SharedWorld, SessionPlayer } from './session.js';
import type { LocalSession, WorldFrame } from './session.js';
export type { LaneActor } from './actors.js';
export { difficulty, random, wrap };
export const HALF_WIDTH = 5;
export const HOP_TIME = SOLO_ARCADE_MODE.rules.movement.hopDuration;
export const WAVE_SPEED = SOLO_ARCADE_MODE.rules.pursuit.speed;
export const WAVE_GRACE = SOLO_ARCADE_MODE.rules.pursuit.grace;
export const WAVE_TRAIL = SOLO_ARCADE_MODE.rules.pursuit.waveTrail;
export const MAX_HEALTH = SOLO_ARCADE_MODE.rules.health.maxHealth;
export const HURT_RECOVERY = SOLO_ARCADE_MODE.rules.health.hurtRecovery;
export const PLAYER_VEHICLE_RADIUS = .2;
const BASE_COIN_CHANCE = BASE_COIN_CHANCE_V1;
export type ImpactFace = 'rear' | 'side' | 'front';
export interface HurtEvent { face: ImpactFace; amount: number }
export interface VehicleBounds { minX: number; maxX: number; minY: number; maxY: number }
export interface VehicleContact { fraction: number; normalX: number; normalY: number; face: ImpactFace }
export interface Lane { index: number; kind: LaneKind; world: World; speed: number; spacing: number; length: number; phase: number; variant: number; blocked: number[]; decorations: { x: number; variant: number }[]; coin: number | null; coinDenomination?: CoinDenominationId; period: number; warning: number; direction?: number; coinActor?: number | null; coinPull?: CoinPull; actors?: ActorPattern }
/** Optional mode-owned course work.  Core Game never identifies a mode by name. */
export interface GameWorldExtension {
  attach?(game: Game): void;
  row?(game: Game, lane: Lane): void;
  tick?(game: Game, session: LocalSession, players: readonly SessionPlayer[], frame: WorldFrame, dt: number): void;
  snapshot?(): unknown;
  dispose?(): void;
}
/** Freezing an actor must not flip its model or change which bumper is front. */
export function laneDirection(lane: Lane): number { return lane.speed < 0 ? -1 : lane.speed > 0 ? 1 : lane.direction ?? 1; }
export type Mode = SoloMode;
export interface GameOptions { readonly definition?: ModeDefinition }
export type RunState = 'ready' | 'playing' | 'paused' | 'dead';
export type DeathCause = 'traffic' | 'train' | 'water' | 'wave' | 'swept' | 'trail' | 'mob' | 'fog';
export interface DamageRequest { readonly cause: DeathCause; readonly amount: number; readonly reason: string; readonly face?: ImpactFace }
export interface DamageResult { readonly landed: number; readonly fatal: boolean }
export type Direction = 'forward' | 'back' | 'left' | 'right';
/** Live content extension helpers; shareable games use the pinned schema instead. */
export function worldForRow(seed: number, row: number, home: string): World {
  return worldForRowV1(seed, row, home, WORLDS);
}
export function generateLane(seed: number, index: number, home: string, gentle = false): Lane {
  return generateLaneV1(seed, index, home, gentle, WORLDS);
}
export function trainPhase(lane: Lane, time: number): { warning: boolean; x: number | null } {
  const phase = wrap(time + lane.phase, lane.period);
  const travel = 1.75;
  return { warning: phase < lane.warning, x: phase >= lane.warning && phase < lane.warning + travel ? (phase - lane.warning) / travel * 38 * laneDirection(lane) - 19 * laneDirection(lane) : null };
}
/** Actors tile continuously; there are no discontinuities inside the play field. */
export function actorPositions(lane: Lane, time: number): number[] {
  return laneActors(lane, time).map(actor => actor.x);
}
/** One physical actor sample drives visuals, swept contacts, support and sound. */
export function laneActors(lane: Lane, time: number, previousTime = time): LaneActor[] {
  if (lane.actors && (lane.kind === 'road' || lane.kind === 'river')) return progressiveActors(lane, time, previousTime);
  if (lane.kind === 'rail') {
    const x = trainPhase(lane, time).x, speed = 38 / 1.75 * laneDirection(lane);
    return x === null ? [] : [{ id: Math.floor((time + lane.phase) / lane.period), x, previousX: x - speed * (time - previousTime),
      speed, length: lane.length, variant: lane.variant, kind: 'train' }];
  }
  const offset = wrap(lane.phase + time * lane.speed, lane.spacing);
  const actors: LaneActor[] = [];
  for (let x = -Math.ceil(10 / lane.spacing) * lane.spacing + offset; x < 11; x += lane.spacing) {
    actors.push({ id: Math.round((x - lane.phase - time * lane.speed) / lane.spacing), x, previousX: x - lane.speed * (time - previousTime),
      speed: lane.speed, length: lane.length, variant: lane.variant, kind: lane.kind === 'river' ? 'platform' : 'car' });
  }
  return actors;
}
/** River rewards ride one physical platform; collection and drawing share it. */
export function coinPosition(lane: Lane, time: number): { x: number; y: number } | null {
  if (lane.coin === null || lane.coinActor === null) return null;
  if (lane.coinPull) return { x: lane.coinPull.x, y: lane.coinPull.y };
  if (lane.coinActor === undefined) return { x: lane.coin, y: lane.index };
  if (lane.actors && lane.kind === 'river') {
    const x = progressiveCoinPosition(lane, time, lane.coinActor);
    return x === null ? null : { x, y: lane.index };
  }
  // Reassign only beyond the rendered actor field. The repeat span is an
  // integer number of platforms, so one uncollected coin always rides a log.
  const span = Math.ceil(24 / lane.spacing) * lane.spacing;
  const x = wrap(lane.phase + time * lane.speed + lane.coinActor * lane.spacing + span / 2, span) - span / 2;
  const firstActor = -Math.ceil(10 / lane.spacing) * lane.spacing + wrap(lane.phase + time * lane.speed, lane.spacing);
  return x >= Math.max(-11, firstActor - 1e-9) && x < 11 ? { x, y: lane.index } : null;
}
/** Match the rendered chassis and its direction; lights and wheels are decoration. */
export function vehicleBounds(lane: Lane, actor?: Pick<LaneActor, 'kind' | 'length' | 'variant'>): VehicleBounds {
  const model = vehicleModel(lane, actor);
  const width = vehicleModelWidth(model);
  const chassis = model.reduce((body, voxel) => voxel.w * voxel.d > body.w * body.d ? voxel : body);
  const scale = (actor?.length ?? lane.length) / width, direction = laneDirection(lane);
  const center = chassis.x * scale * direction;
  return { minX: center - chassis.w * scale / 2, maxX: center + chassis.w * scale / 2, minY: -chassis.y - chassis.d / 2, maxY: -chassis.y + chassis.d / 2 };
}
/** Sweep the forgiving body core relative to the moving vehicle in both axes. */
export function sweptVehicleContact(fromX: number, fromY: number, toX: number, toY: number, bounds: VehicleBounds, direction: number, radius = PLAYER_VEHICLE_RADIUS): VehicleContact | undefined {
  const limits = [bounds.minX - radius, bounds.maxX + radius, bounds.minY - radius, bounds.maxY + radius];
  const inside = (x: number, y: number) => x > limits[0]! + 1e-9 && x < limits[1]! - 1e-9 && y > limits[2]! + 1e-9 && y < limits[3]! - 1e-9;
  let enter = 0, leave = 1, normalX = 0, normalY = 0;
  if (inside(fromX, fromY)) {
    const faces = [[fromX - limits[0]!, -1, 0], [limits[1]! - fromX, 1, 0], [fromY - limits[2]!, 0, -1], [limits[3]! - fromY, 0, 1]].sort((a, b) => a[0]! - b[0]!);
    normalX = faces[0]![1]!; normalY = faces[0]![2]!;
  } else {
    for (const [origin, delta, low, high, axis] of [[fromX, toX - fromX, limits[0]!, limits[1]!, 0], [fromY, toY - fromY, limits[2]!, limits[3]!, 1]]) {
      if (Math.abs(delta!) < 1e-12) { if (origin! <= low! + 1e-9 || origin! >= high! - 1e-9) return undefined; continue; }
      const a = (low! - origin!) / delta!, b = (high! - origin!) / delta!;
      const entry = Math.min(a, b);
      if (entry >= enter) { enter = entry; normalX = axis === 0 ? -Math.sign(delta!) : 0; normalY = axis === 1 ? -Math.sign(delta!) : 0; }
      leave = Math.min(leave, Math.max(a, b));
      if (enter >= leave - 1e-9) return undefined;
    }
    if (enter < 0 || enter >= 1 || leave <= 0) return undefined;
  }
  const face = normalY ? 'side' : normalX === (direction < 0 ? -1 : 1) ? 'front' : 'rear';
  return { fraction: enter, normalX, normalY, face };
}
/** Broad slabs support riders; flowers and other small details do not. */
export function platformBounds(lane: Lane | undefined, actor?: Pick<LaneActor, 'length' | 'variant'>): { minX: number; maxX: number; height: number } | undefined {
  if (lane?.kind !== 'river') return undefined;
  const model = lane.world.platforms[(actor?.variant ?? lane.variant) % lane.world.platforms.length]!;
  const slab = model.reduce<Voxel | undefined>((largest, voxel) => !largest || voxel.w * voxel.d > largest.w * largest.d ? voxel : largest, undefined);
  const length = actor?.length ?? lane.length;
  return slab ? { minX: (slab.x - slab.w / 2) * length, maxX: (slab.x + slab.w / 2) * length, height: slab.z + slab.h } : undefined;
}
export function platformSurface(lane: Lane | undefined): number { return platformBounds(lane)?.height ?? 0; }
/** A foot center on the visible slab is supported, including its exact edge. */
export function platformSupports(lane: Lane, x: number, time: number): boolean {
  if (lane.kind !== 'river') return false;
  return laneActors(lane, time).some(actor => {
    const bounds = platformBounds(lane, actor);
    return Boolean(bounds && x >= actor.x + bounds.minX - 1e-9 && x <= actor.x + bounds.maxX + 1e-9);
  });
}
export class Game {
  /** Compatibility facade owners; private methods below keep their exact solo order. */
  readonly world: SharedWorld;
  readonly player: SessionPlayer;
  readonly run: RunInventory;
  readonly runSeed: RunSeed | null;
  readonly seedCode: string | null;
  state: RunState = 'ready';
  rows = new Map<number, Lane>();
  /** Captured rewards outlive their source terrain while they remain in view. */
  readonly attractedCoins = new Map<number, Lane>();
  x = 0; y = 0; maxY = 0; time = 0; idle = 0; hop = 0; fromX = 0; fromY = 0; coins = 0;
  waveRow = -4; caughtByWave = false;
  health: number; readonly maxHealth: number; hurtRemaining = 0;
  deathCause: DeathCause | null = null;
  /** Visual remains only: inventory is still cleared synchronously on death. */
  deathSpill: DeathSpill | null = null;
  reason = ''; mode: Mode; seed: number; home: string; gentle: boolean;
  onCoin: (amount: number) => void = () => {}; onEnd: () => void = () => {};
  onMobSpawn: (mob: Mob) => void = () => {}; onMobAttack: (mob: Mob) => void = () => {};
  onHurt: (event: HurtEvent) => void = () => {}; onHeal: (amount: number) => void = () => {};
  onPower: (event: { power: CharacterPower; cause: DeathCause }) => void = () => {};
  characterId: string;
  private powerReadyAt = 0;
  private powerNotice = 0;
  private powerLandingGrace = 0;
  /** Separate from ordinary hops: a rescue arc must not change hop timing. */
  powerRescue: { fromX: number; fromY: number; remaining: number; power: CharacterPower } | null = null;
  private healedMilestone = 0;
  private touchingCars = new Set<string>();
  private mobDirector: MobDirector;
  private laneSpeeds = new WeakMap<Lane, { base: number; applied: number }>();
  /** `declare` deliberately emits no own field: untouched solo Games retain their released shape. */
  declare private worldExtension: GameWorldExtension | undefined;
  readonly definition: ModeDefinition;
  declare private sharedWorldEffects: RunModifiers | undefined;
  readonly rules: ModeRules;
  /** A permanent operation facade per secondary seat; the host always remains P1. */
  private readonly playerOperations = new WeakMap<SessionPlayer, Game>();
  /** Present only on fixed secondary facades, never changed on the host Game. */
  private operationPlayer: SessionPlayer | null = null;
  constructor(seed: number | RunSeed, home = 'pond', mode: Mode = 'arcade', gentle = false, definitions: readonly ItemDefinition[] = [], characterId = DEFAULT_CHARACTER, options: GameOptions = {}) {
    this.characterId = characterById(characterId).id;
    if (typeof seed !== 'number') {
      this.runSeed = validateRunSeed(seed);
      ({ seed, home, mode, gentle } = this.runSeed);
    } else {
      if (!Number.isSafeInteger(seed)) throw new RangeError('Seed must be an integer.');
      seed >>>= 0;
      // Unregistered extension worlds remain playable without promising a stable code.
      home = home === 'shuffle' || HOME_IDS_V1.some(id => id === home) ? home : worldById(home).id;
      this.runSeed = HOME_IDS_V1.some(id => id === home) ? createRunSeed(seed, home, mode, gentle) : null;
    }
    if (options.definition !== undefined && !isModeDefinition(options.definition)) throw new TypeError('options.definition must be a validated immutable mode definition.');
    this.definition = options.definition ?? soloModeDefinition(mode);
    this.rules = this.definition.rules;
    this.maxHealth = this.rules.health.maxHealth; this.health = this.maxHealth;
    this.seedCode = this.runSeed ? encodeRunSeed(this.runSeed) : null;
    this.run = new RunInventory(seed, definitions.filter(item => !item.modes || item.modes.includes(mode)), this.rules.economy);
    this.seed = seed; this.home = home; this.mode = mode; this.gentle = gentle; this.ensureRows();
    this.mobDirector = new MobDirector(random(seed ^ 0x76ab41c3));
    // The session objects adopt these exact fields. No world, inventory, actor
    // stream, or player state is copied while a Game remains the solo facade.
    this.world = new SharedWorld(this);
    this.player = new SessionPlayer(this.world, 'p1', 'keyboard-a', this.characterId, true);
  }
  static fromSeed(code: string, definitions: readonly ItemDefinition[] = [], characterId = DEFAULT_CHARACTER): Game {
    return new Game(decodeRunSeed(code), undefined, undefined, undefined, definitions, characterId);
  }
  /**
   * Build a stable receiver whose personal fields target one player while every
   * shared field delegates to the immutable host Game. Unlike the old bridge,
   * it never changes host descriptors or host callbacks during an operation.
   */
  private operationFor(player: SessionPlayer): Game {
    if (player.primary) return this;
    const existing = this.playerOperations.get(player);
    if (existing) return existing;
    const fields = ['run', 'state', 'x', 'y', 'maxY', 'idle', 'hop', 'fromX', 'fromY', 'coins', 'caughtByWave', 'health', 'maxHealth', 'hurtRemaining', 'deathCause', 'deathSpill', 'reason', 'characterId', 'powerRescue', 'powerReadyAt', 'powerNotice', 'powerLandingGrace', 'healedMilestone', 'touchingCars', 'onCoin', 'onEnd', 'onHurt', 'onHeal', 'onPower'] as const;
    const personal = new Set<string>(fields);
    const context = Object.create(Object.getPrototypeOf(this)) as Game;
    const host = this as unknown as Record<string, unknown>;
    const source = player as unknown as Record<string, unknown>;
    for (const field of Reflect.ownKeys(this)) {
      if (typeof field !== 'string' || field === 'operationPlayer') continue;
      const descriptor = Object.getOwnPropertyDescriptor(this, field);
      Object.defineProperty(context, field, {
        configurable: false, enumerable: descriptor?.enumerable ?? true,
        get: () => personal.has(field) ? source[field] : host[field],
        set: value => { if (personal.has(field)) source[field] = value; else host[field] = value; },
      });
    }
    Object.defineProperty(context, 'operationPlayer', { configurable: false, enumerable: false, value: player });
    this.playerOperations.set(player, context);
    return context;
  }
  /** Run released Game formulas through the seat's fixed receiver. */
  private inPlayerOperation<T>(player: SessionPlayer, operation: (context: Game) => T): T {
    const context = this.operationFor(player);
    if (!player.primary) return operation(context);
    const previous = this.operationPlayer;
    this.operationPlayer = player;
    try { return operation(context); }
    finally { this.operationPlayer = previous; }
  }
  /** Session-only adapter over the released start transition. */
  startPlayer(player: SessionPlayer): boolean { return this.inPlayerOperation(player, context => context.start()); }
  /** Session-only adapter over the released movement/progress transition. */
  movePlayer(player: SessionPlayer, direction: Direction): boolean { return this.inPlayerOperation(player, context => context.move(direction)); }
  damagePlayer(player: SessionPlayer, request: DamageRequest): DamageResult { return this.inPlayerOperation(player, context => context.applyDamage(request)); }
  get pursuitEnabled(): boolean { return !(this.world?.sessionActive && this.player.session?.mode?.handlers.suppressPursuit); }
  /** Apply the elected seat's run effects once before a world-only tick. */
  syncSharedEffects(player: SessionPlayer): void { this.inPlayerOperation(player, context => context.syncEffects()); }
  /** Rendering uses this explicit path to age each player's terminal visual once. */
  advancePlayerDeathVisuals(player: SessionPlayer, dt: number): void { this.inPlayerOperation(player, context => context.advanceDeathVisuals(dt)); }
  /** Advance terrain/actor time once; player resolution happens separately. */
  advanceSharedWorld(dt: number): number {
    const previousTime = this.time;
    this.time += dt * this.rules.simulation.worldTimeScale;
    return previousTime;
  }
  /** Session terrain uses the resolved base definition; player cards stay personal. */
  advanceSharedPursuit(previousTime: number): void {
    if (!this.world?.sessionActive || !this.pursuitEnabled || this.rules.pursuit.strategy !== 'wave') return;
    const effects = this.sharedWorldEffects ?? defaultModifiers();
    const chaseTime = Math.max(0, this.time - this.rules.pursuit.grace) - Math.max(0, previousTime - this.rules.pursuit.grace);
    this.waveRow = Math.max(this.waveRow + chaseTime * this.rules.pursuit.speed * effects.waveSpeed, this.world.frontier - this.rules.pursuit.waveTrail - effects.waveTrail);
  }
  /**
   * Resolve one participant after LocalSession has advanced SharedWorld.
   * `drivesWorld` elects one stable living seat for wave and director work.
   */
  updateSessionPlayer(player: SessionPlayer, dt: number, previousTime: number, drivesWorld: boolean): void {
    this.inPlayerOperation(player, context => {
      if (context.state === 'dead') return;
      if (context.state !== 'playing' || context.run.isOpen || context.run.pendingPack) return;
      context.run.tick(dt);
      const previousX = context.groundX, previousY = context.groundY;
      const riding = context.hop === 0 && platformSupports(context.lane, context.x, previousTime);
      context.finishPlayerUpdate(dt, previousTime, previousX, previousY, riding, drivesWorld);
    });
  }
  /** Award a shared-world pickup only after SharedWorld's deterministic arbitration. */
  awardSessionPickup(player: SessionPlayer, raw: number): number { return this.inPlayerOperation(player, context => context.awardCoins(raw)); }
  /** One director advances once, with fixed views for every eligible player. */
  updateSessionMobs(players: readonly SessionPlayer[], dt: number, samples: ReadonlyMap<SessionPlayer, { x: number; y: number }>): void {
    const participants = players.filter(player => player.state === 'playing' && player.participation === 'active').map(player => ({ seat: player.seat, game: this.operationFor(player), previousX: samples.get(player)!.x, previousY: samples.get(player)!.y }));
    if (!participants.length) return;
    const primary = participants[0]!;
    const anchor = [...participants].sort((a, b) => b.game.groundY - a.game.groundY || a.seat.localeCompare(b.seat))[0]!;
    this.mobDirector.update(this, dt, primary.previousX, primary.previousY, participants, { effects: this.sharedWorldEffects ?? defaultModifiers(), frontier: this.world.frontier, anchor: anchor.game });
  }
  /** Definition-owned session policy provides one resolved value set per world tick. */
  setSharedWorldEffects(effects: RunModifiers | undefined): void {
    if (effects === undefined) delete this.sharedWorldEffects;
    else this.sharedWorldEffects = effects;
    this.syncSharedWorldEffects();
  }
  /** Remove player-card lane mutations when a shared world takes ownership. */
  resetSharedWorldEffects(): void {
    for (const lane of this.rows.values()) {
      const motion = this.laneSpeeds.get(lane);
      if (!motion || lane.speed === motion.base) continue;
      lane.phase += this.time * (lane.speed - motion.base); lane.speed = motion.base; motion.applied = motion.base;
    }
  }
  private syncSharedWorldEffects(): void {
    if (!this.world?.sessionActive) return;
    const effects = this.sharedWorldEffects ?? defaultModifiers();
    for (const lane of this.rows.values()) {
      if (lane.kind !== 'road' && lane.kind !== 'river') continue;
      let motion = this.laneSpeeds.get(lane);
      if (!motion || motion.applied !== lane.speed) { motion = { base: lane.speed, applied: lane.speed }; this.laneSpeeds.set(lane, motion); }
      const speed = motion.base * (lane.kind === 'road' ? effects.trafficSpeed : effects.riverSpeed) || 0;
      if (lane.speed === speed) continue;
      lane.direction = laneDirection(lane);
      lane.phase += this.time * (lane.speed - speed);
      lane.speed = speed; motion.applied = speed;
    }
  }
  get mobs(): Mob[] { return this.mobDirector.mobs; }
  get lane(): Lane { return this.rows.get(this.y)!; }
  get groundX(): number { return this.powerRescue ? this.x + (this.powerRescue.fromX - this.x) * this.rescueFraction : this.x + (this.fromX - this.x) * this.hop / this.rules.movement.hopDuration; }
  get groundY(): number { return this.powerRescue ? this.y + (this.powerRescue.fromY - this.y) * this.rescueFraction : this.y + (this.fromY - this.y) * this.hop / this.rules.movement.hopDuration; }
  private get rescueFraction(): number {
    const t = this.powerRescue!.remaining / this.powerRescue!.power.duration;
    return t * t * (3 - 2 * t);
  }
  get power(): CharacterPower { return characterPower(this.characterId); }
  private get scoringPlayer(): SessionPlayer | null { return this.operationPlayer ?? (this.world?.sessionActive ? this.player : null); }
  private get currentScore(): number { return this.scoringPlayer?.personalScore ?? this.maxY; }
  get powerRemaining(): number { return Math.max(0, Math.ceil(this.powerReadyAt - this.currentScore)); }
  get powerReady(): boolean { return this.powerRemaining === 0 && !this.powerRescue; }
  get powerFlash(): number { return Math.min(1, this.powerNotice / .9); }
  get powerAvoidsMobs(): boolean { return !!this.powerRescue || this.powerLandingGrace > 0; }
  /** Session recovery protection exists only while resolving a live seat; solo stays exact. */
  private sessionProtected(): boolean { return !!this.operationPlayer && (this.operationPlayer.recovery?.protectionUntil ?? 0) > this.time; }
  /** A wardrobe swap changes the ability but never refills its shared charge. */
  setCharacter(id: string): void { this.characterId = characterById(id).id; }
  get waveGap(): number { return this.groundY - this.waveRow; }
  get waveSeconds(): number { return Math.max(0, this.rules.pursuit.grace - this.time) + Math.max(0, this.waveGap) / (this.rules.pursuit.speed * this.run.effects.waveSpeed); }
  get warning(): boolean { return this.pursuitEnabled && this.rules.pursuit.strategy === 'wave' && this.waveSeconds <= this.rules.pursuit.warningSeconds; }
  /** Installs definition-owned course behavior only after a session transaction commits. */
  installWorldExtension(extension: GameWorldExtension): () => void {
    if (this.worldExtension) throw new Error('A Game already has a world extension.');
    this.worldExtension = extension;
    extension.attach?.(this);
    for (const lane of [...this.rows.values()].sort((a, b) => a.index - b.index)) extension.row?.(this, lane);
    return () => {
      if (this.worldExtension !== extension) return;
      delete (this as unknown as { worldExtension?: GameWorldExtension }).worldExtension;
      extension.dispose?.();
    };
  }
  /** Read-only presentation/test projection; no item state is retained by Game itself. */
  worldExtensionSnapshot<T = unknown>(): T | undefined { return this.worldExtension?.snapshot?.() as T | undefined; }
  updateSessionWorldExtension(session: LocalSession, players: readonly SessionPlayer[], frame: WorldFrame, dt: number): void {
    this.worldExtension?.tick?.(this, session, players, frame, dt);
  }
  ensureRows(): void {
    const frontier = this.world?.sessionActive ? this.world.frontier : this.maxY;
    const floor = this.world?.sessionActive ? Math.min(frontier, this.world.activeFloor) : frontier;
    for (let i = floor - this.rules.retention.rowsBehind; i <= frontier + this.rules.retention.rowsAhead; i++) if (!this.rows.has(i)) {
      const lane = this.runSeed ? generateSeedLane(this.runSeed, i) : generateLane(this.seed, i, this.home, this.gentle), effects = this.world?.sessionActive ? this.sharedWorldEffects ?? defaultModifiers() : this.run.effects;
      const rng = random((this.runSeed?.seed ?? this.seed) ^ Math.imul(i + 100, 0x19ab61f));
      if (lane.kind === 'road') lane.spacing = lane.length + (lane.spacing - lane.length) * effects.trafficSpacing;
      if (lane.kind === 'river') { const gap = lane.spacing - lane.length; lane.length *= effects.platformLength; lane.spacing = lane.length + gap; }
      if (lane.actors) applyActorEffects(lane, effects);
      if (lane.kind === 'rail') { lane.period *= effects.trainPeriod; lane.warning += effects.trainWarning; lane.period = Math.max(lane.period, lane.warning + 1.85); }
      if (effects.sceneryClear > 0) {
        const removed = new Set(lane.blocked.filter(() => rng() < effects.sceneryClear));
        lane.blocked = lane.blocked.filter(x => !removed.has(x));
        lane.decorations = lane.decorations.filter(decoration => !removed.has(decoration.x));
      }
      if (i > 2 && lane.coin === null && lane.kind !== 'river' && lane.kind !== 'rail' && rng() < effects.coinChance / (1 - BASE_COIN_CHANCE)) {
        const x = Math.floor(rng() * 9) - 4; lane.coin = lane.blocked.includes(x) ? 0 : x;
      }
      if (lane.kind === 'river' && (effects.riverCoinBonus > 0 || effects.coinChance > 0) && rng() < (effects.riverCoinBonus > 0 ? BASE_COIN_CHANCE : 0) + effects.coinChance) {
        lane.coin = 0; lane.coinActor = null;
      }
      // Card-created rewards use the same private per-row roll as baseline
      // rewards. Older seed codes retain their original one-coin pickups.
      if (lane.coin !== null && (!this.runSeed || this.runSeed.schema >= 3)) {
        const denomination = coinDenominationForRow(this.runSeed?.seed ?? this.seed, i);
        if (denomination !== 'coin') lane.coinDenomination = denomination;
      }
      this.rows.set(i, lane);
      this.worldExtension?.row?.(this, lane);
    }
    for (const i of this.rows.keys()) if (i < floor - this.rules.retention.rowsBehind) this.rows.delete(i);
    if (this.world?.sessionActive) this.syncSharedWorldEffects(); else this.syncEffects();
    for (const lane of this.rows.values()) if (lane.coinActor === null && lane.index <= frontier + this.rules.retention.pickupBindingAhead) {
      // Rows are generated 28 ahead. Bind near the visible approach so a log
      // reward has not already left the world before its lane can be reached.
      lane.coinActor = lane.actors
        ? laneActors(lane, this.time).sort((a, b) => Math.abs(a.x) - Math.abs(b.x))[0]?.id ?? null
        : -Math.round((lane.phase + this.time * lane.speed) / lane.spacing);
    }
  }
  /** Rebase live speeds at the same positions used by rendering and collisions. */
  syncEffects(): void {
    for (const lane of this.rows.values()) {
      if (lane.kind !== 'road' && lane.kind !== 'river') continue;
      let motion = this.laneSpeeds.get(lane);
      if (!motion || motion.applied !== lane.speed) { motion = { base: lane.speed, applied: lane.speed }; this.laneSpeeds.set(lane, motion); }
      const speed = motion.base * (lane.kind === 'road' ? this.run.effects.trafficSpeed : this.run.effects.riverSpeed) || 0;
      if (lane.speed === speed) continue;
      lane.direction = laneDirection(lane);
      lane.phase += this.time * (lane.speed - speed);
      lane.speed = speed; motion.applied = speed;
    }
  }
  awardCoins(raw: number): number {
    const amount = this.run.creditCoins(raw * this.run.effects.coinMultiplier);
    if (amount > 0) { this.coins += amount; this.onCoin(amount); }
    return amount;
  }
  openMarket(): boolean {
    if ((this.state !== 'playing' && !(this.state === 'paused' && this.run.pendingPack)) || !this.run.open()) return false;
    this.pause(); return true;
  }
  closeMarket(resume = true): void {
    const wasOpen = this.run.isOpen;
    this.run.close(); this.syncEffects();
    if (wasOpen && resume) this.resume();
  }
  /** Begin a run without moving; all normal starts emit this lifecycle transition once. */
  start(): boolean {
    if (this.state !== 'ready') return false;
    this.state = 'playing'; this.lifecycle('start');
    return true;
  }
  move(direction: Direction): boolean {
    if (this.run.isOpen || this.run.pendingPack) return false;
    if (this.state === 'ready') this.start();
    if (this.state !== 'playing' || this.hop > 0 || this.powerRescue || this.scoringPlayer && !this.scoringPlayer.canHop) return false;
    const nx = this.x + (direction === 'left' ? -1 : direction === 'right' ? 1 : 0);
    const ny = this.y + (direction === 'forward' ? 1 : direction === 'back' ? -1 : 0);
    if (nx < -HALF_WIDTH || nx > HALF_WIDTH || !this.rows.has(ny) || this.rows.get(ny)!.blocked.includes(Math.round(nx))) return false;
    this.fromX = this.x; this.fromY = this.y; this.x = nx; this.y = ny; this.hop = this.rules.movement.hopDuration;
    this.scoringPlayer?.noteHop();
    if (ny > this.maxY) {
      this.maxY = ny; this.idle = 0;
      if (this.scoringPlayer) this.scoringPlayer.earnedDistance++;
      this.world?.noteProgress(ny);
      this.awardCoins(this.run.advanceScore(this.currentScore)); this.ensureRows(); this.regenerate(); this.lifecycle('progress');
    }
    return true;
  }
  end(reason: string, cause: DeathCause = 'traffic', face?: 'front' | 'rear' | 'side'): void {
    if (this.state !== 'playing' || this.sessionProtected() || this.run.effects.shield > 0 || this.powerRescue) return;
    if (cause === 'mob' && this.powerAvoidsMobs) return;
    if (this.tryCharacterPower(cause, face)) return;
    const cosmetics = this.run.cosmetics.flatMap(id => {
      const item = this.run.catalog.get(id);
      return item?.kind === 'cosmetic' ? [item] : [];
    });
    this.deathSpill = createDeathSpill(this.run.wallet, cosmetics, this.groundX, this.groundY, 0, this.seed ^ Math.imul(this.maxY, 0x45d9f3b));
    this.health = 0; this.hurtRemaining = 0; this.reason = reason; this.deathCause = cause; this.state = 'dead';
    // The terminal state already blocks reentrant death. Mode observers retain
    // contribution before inventory clear without deciding the transaction.
    const participant = this.scoringPlayer;
    try { if (participant) participant.session?.observeDeath(participant, cause); }
    finally { this.run.clear(); this.onEnd(); this.lifecycle('terminal'); }
  }
  /** Shared health transaction; traffic supplies only its contact-specific recoil. */
  private applyDamage(request: DamageRequest, survivingImpact?: () => void): DamageResult {
    const none = Object.freeze({ landed: 0, fatal: false });
    // Session timers settle at fixed-step boundaries; sub-nanosecond residue
    // is not another interval of immunity. Legacy traffic retains its earlier
    // exact contact gate and therefore its released collision ordering.
    if (!request || !Number.isFinite(request.amount) || request.amount <= 0 || !['traffic','train','water','wave','swept','trail','mob','fog'].includes(request.cause) || this.state !== 'playing' || this.hurtRemaining > 1e-9 || this.sessionProtected() || this.run.effects.shield > 0 || this.powerRescue) return none;
    const before = this.health;
    if (before <= request.amount) this.end(request.reason, request.cause, request.face);
    else {
      this.health -= request.amount;
      this.hurtRemaining = this.rules.health.hurtRecovery * this.run.effects.hurtRecovery;
      survivingImpact?.();
      if (request.face) this.onHurt({ face: request.face, amount: request.amount });
    }
    return Object.freeze({ landed: Math.max(0, before - this.health), fatal: (this.state as RunState) === 'dead' });
  }
  advanceDeathVisuals(dt: number): void {
    if (this.state === 'dead' && this.deathSpill && Number.isFinite(dt) && dt > 0) this.deathSpill.age = Math.min(3, this.deathSpill.age + dt);
  }
  private tryCharacterPower(cause: DeathCause, face?: 'front' | 'rear' | 'side'): boolean {
    const power = this.power;
    if (!this.powerReady || !powerMatches(power, cause, face)) return false;
    const x = this.groundX, y = this.groundY;
    const landingTime = this.time + power.duration * this.rules.simulation.worldTimeScale;
    const wave = this.waveRow + power.duration * this.rules.pursuit.speed * this.run.effects.waveSpeed;
    const candidates: { x: number; y: number; cost: number }[] = [];
    // Seeded relief meadows are at most a few rows away. Landing on land avoids
    // chasing a moving platform or creating invisible support under the player.
    for (const lane of this.rows.values()) {
      if (lane.kind !== 'meadow' || Math.abs(lane.index - y) > 6 || lane.index < this.maxY - 6) continue;
      if (this.pursuitEnabled && this.rules.pursuit.strategy === 'wave' && lane.index <= wave + .85) continue;
      for (let column = -HALF_WIDTH; column <= HALF_WIDTH; column++) {
        const distance = Math.hypot(column - x, lane.index - y);
        if (distance > 6 || this.mobBlocked(column, lane.index, PLAYER_VEHICLE_RADIUS)) continue;
        if (this.mobHazard(column, lane.index, column, lane.index, this.time, landingTime, PLAYER_VEHICLE_RADIUS)) continue;
        if (this.mobs.some(mob => Math.hypot(mob.x - column, mob.y - lane.index) < 1.5)) continue;
        // A fox seeks lateral separation; other rescues prefer the nearest bank.
        const cost = distance + (power.id === 'fox-feint' ? Math.abs(lane.index - y) * .8 : 0);
        candidates.push({ x: column, y: lane.index, cost });
      }
    }
    candidates.sort((a, b) => a.cost - b.cost || b.y - a.y || a.x - b.x);
    const target = candidates[0];
    if (!target) return false;
    this.powerReadyAt = this.currentScore + power.cooldown;
    this.powerNotice = 1.8;
    this.powerRescue = { fromX: x, fromY: y, remaining: power.duration, power };
    this.x = this.fromX = target.x; this.y = this.fromY = target.y; this.hop = 0;
    // A rescue never scores skipped rows, heals old damage, or awards coins.
    // Regrow deliberately returns a single feather as its character identity.
    if (power.id === 'regrow') this.health = 1;
    this.caughtByWave = false; this.touchingCars.clear();
    this.scoringPlayer?.recordInteraction({ kind: 'innate', powerId: power.id, cause });
    this.onPower({ power, cause });
    return true;
  }
  private regenerate(): void {
    const milestone = Math.floor(this.currentScore / this.rules.health.regenerationInterval);
    if (milestone <= this.healedMilestone) return;
    const before = this.health;
    this.health = Math.min(this.maxHealth, this.health + (milestone - this.healedMilestone) * (this.rules.health.regenerationAmount + this.run.effects.regenBonus));
    this.healedMilestone = milestone;
    if (this.health > before) this.onHeal(this.health - before);
  }
  /** Short recoil returns to open ground, never selecting scenery or open water. */
  private recoil(lane: Lane, center: number, bounds: VehicleBounds, hit: VehicleContact, x: number, y: number): void {
    const awayX = center + (hit.normalX < 0 ? bounds.minX - PLAYER_VEHICLE_RADIUS - .08 : bounds.maxX + PLAYER_VEHICLE_RADIUS + .08);
    const candidates = hit.normalY ? [[x, lane.index + hit.normalY], [this.fromX, Math.round(this.fromY)]] : [[awayX, lane.index], [this.fromX, Math.round(this.fromY)]];
    candidates.push([x, lane.index - 1], [x, lane.index + 1]);
    const landingTime = this.time + this.rules.movement.hopDuration * this.rules.simulation.worldTimeScale;
    const target = candidates.find(([tx, ty]) => Math.hypot(tx! - x, ty! - y) < 1.6 && !this.mobBlocked(tx!, ty!, PLAYER_VEHICLE_RADIUS) && (!this.pursuitEnabled || this.rules.pursuit.strategy !== 'wave' || ty! > this.waveRow + .2) && !this.mobHazard(tx!, ty!, tx!, ty!, landingTime, landingTime, PLAYER_VEHICLE_RADIUS));
    // A boxed-in duck retains controls and immunity; moving traffic clears the
    // contact instead of forcing a displacement into another lethal surface.
    this.fromX = x; this.fromY = y;
    this.x = target?.[0] ?? x; this.y = target?.[1] ?? lane.index;
    this.hop = target ? this.rules.movement.hopDuration : 0;
  }
  private collideVehicles(previousX: number, previousY: number, previousTime: number): void {
    if (this.sessionProtected()) return;
    const x = this.groundX, y = this.groundY;
    const contacts: { lane: Lane; center: number; bounds: VehicleBounds; hit: VehicleContact; key: string }[] = [];
    const touching = new Set<string>();
    for (const lane of this.rows.values()) {
      if ((lane.kind !== 'road' && lane.kind !== 'rail') || Math.abs(lane.index - y) > 1.6 && Math.abs(lane.index - previousY) > 1.6) continue;
      const train = lane.kind === 'rail';
      const radius = train ? .23 : PLAYER_VEHICLE_RADIUS;
      for (const actor of laneActors(lane, this.time, previousTime)) {
        const center = actor.x;
        const bounds = train ? { ...TRAIN_BOUNDS, minY: -.36, maxY: .36 } : vehicleBounds(lane, actor);
        const key = `${lane.index}:${actor.id}`;
        if (!train && this.run.effects.shield <= 0 && sweptVehicleContact(x - center, y - lane.index, x - center, y - lane.index, bounds, laneDirection(lane), radius)) touching.add(key);
        const hit = sweptVehicleContact(previousX - actor.previousX, previousY - lane.index, x - center, y - lane.index, bounds, laneDirection(lane), radius);
        if (hit && (train || !this.touchingCars.has(key))) contacts.push({ lane, center, bounds, hit, key });
      }
    }
    this.touchingCars = touching;
    contacts.sort((a, b) => a.hit.fraction - b.hit.fraction);
    for (const { lane, center, bounds, hit } of contacts) {
      if (this.run.effects.shield > 0) continue;
      if (lane.kind === 'rail') { this.end('Train! Wait for the crossing lights to clear.', 'train'); return; }
      if (this.hurtRemaining > 0) continue;
      const amount = hit.face === 'rear' ? Math.max(.25, this.rules.health.rearDamage * this.run.effects.rearDamage) : hit.face === 'side' ? Math.max(.25, this.rules.health.sideDamage * this.run.effects.sideDamage) : this.rules.health.frontDamage;
      this.applyDamage({ amount, cause: 'traffic', face: hit.face, reason: hit.face === 'front' ? 'Head-on traffic! Stay clear of the front bumper.' : 'Out of pluck! Look for a gap before crossing.' }, () => this.recoil(lane, center, bounds, hit, previousX + (x - previousX) * hit.fraction, previousY + (y - previousY) * hit.fraction));
      return;
    }
  }
  /** Land pursuers share the occupied scenery cells and cannot enter rivers. */
  mobBlocked(x: number, y: number, radius: number): boolean {
    if (Math.abs(x) > HALF_WIDTH) return true;
    for (let row = Math.floor(y - radius - .5); row <= Math.ceil(y + radius + .5); row++) {
      if (Math.abs(y - row) >= .5 + radius) continue;
      const lane = this.rows.get(row);
      if (!lane || lane.kind === 'river' || lane.blocked.some(column => Math.abs(x - column) < .48 + radius)) return true;
    }
    return false;
  }
  /** Sweep land bodies relative to the same moving vehicle/train bounds drawn. */
  mobHazard(fromX: number, fromY: number, x: number, y: number, startTime: number, endTime: number, radius: number): boolean {
    const depth = .34 + radius;
    for (let row = Math.floor(Math.min(fromY, y) - depth); row <= Math.ceil(Math.max(fromY, y) + depth); row++) {
      const lane = this.rows.get(row);
      if (!lane || (lane.kind !== 'road' && lane.kind !== 'rail')) continue;
      for (const actor of laneActors(lane, endTime, startTime)) {
        const bounds = lane.kind === 'rail' ? { ...TRAIN_BOUNDS, minY: -.34, maxY: .34 } : vehicleBounds(lane, actor);
        const ax = fromX - actor.previousX, ay = fromY - row;
        const dx = x - actor.x - ax, dy = y - row - ay;
        let enter = 0, leave = 1;
        for (const [origin, delta, low, high] of [[ax, dx, bounds.minX - radius, bounds.maxX + radius], [ay, dy, bounds.minY - radius, bounds.maxY + radius]]) {
          if (Math.abs(delta!) < 1e-12) { if (origin! < low! || origin! > high!) { enter = 2; break; } }
          else { const a = (low! - origin!) / delta!, b = (high! - origin!) / delta!; enter = Math.max(enter, Math.min(a, b)); leave = Math.min(leave, Math.max(a, b)); }
        }
        if (enter <= leave) return true;
      }
    }
    return false;
  }
  update(dt: number): void {
    if (this.state !== 'playing' || this.run.isOpen || this.run.pendingPack) return;
    this.run.tick(dt);
    this.syncEffects();
    // Callers use fixed steps: trains and cars cannot tunnel through a hitbox.
    const previousTime = this.time;
    const previousX = this.groundX, previousY = this.groundY;
    const riding = this.hop === 0 && platformSupports(this.lane, this.x, previousTime);
    this.time += dt * this.rules.simulation.worldTimeScale;
    this.finishPlayerUpdate(dt, previousTime, previousX, previousY, riding, true);
  }
  /** The original per-player fixed-step tail, shared with LocalSession seats. */
  private finishPlayerUpdate(dt: number, previousTime: number, previousX: number, previousY: number, riding: boolean, drivesWorld: boolean): void {
    this.idle += dt;
    this.hurtRemaining = Math.max(0, this.hurtRemaining - dt);
    this.powerNotice = Math.max(0, this.powerNotice - dt);
    this.powerLandingGrace = Math.max(0, this.powerLandingGrace - dt);
    this.hop = Math.max(0, this.hop - dt);
    if (this.operationPlayer && this.hop < 1e-9) this.hop = 0;
    if (this.powerRescue) {
      // World motion continues during the escape, but no old swept contact or
      // collectible can intersect this protected airborne path.
      if (drivesWorld && this.pursuitEnabled && this.rules.pursuit.strategy === 'wave') {
        const chaseTime = Math.max(0, this.time - this.rules.pursuit.grace) - Math.max(0, previousTime - this.rules.pursuit.grace);
        this.waveRow = Math.max(this.waveRow + chaseTime * this.rules.pursuit.speed * this.run.effects.waveSpeed, this.maxY - this.rules.pursuit.waveTrail - this.run.effects.waveTrail);
      }
      this.powerRescue.remaining = Math.max(0, this.powerRescue.remaining - dt);
      if (drivesWorld) this.updateMobs(this.time - previousTime, previousX, previousY);
      if (this.powerRescue.remaining === 0) { this.powerRescue = null; this.powerLandingGrace = .45; }
      return;
    }
    if (this.pursuitEnabled && this.rules.pursuit.strategy === 'wave') {
      if (drivesWorld) {
        const chaseTime = Math.max(0, this.time - this.rules.pursuit.grace) - Math.max(0, previousTime - this.rules.pursuit.grace);
        this.waveRow = Math.max(this.waveRow + chaseTime * this.rules.pursuit.speed * this.run.effects.waveSpeed, this.maxY - this.rules.pursuit.waveTrail - this.run.effects.waveTrail);
      }
      // Use the same ground position as the drawing, including while airborne.
      if (!this.sessionProtected() && this.waveGap <= 0 && this.run.effects.shield <= 0) { this.caughtByWave = true; this.end('The wave caught you. Hop forward to stay ahead.', 'wave'); return; }
    } else if (this.pursuitEnabled && this.y < this.maxY - this.rules.pursuit.trailingLimit) { this.end('The trail moved on. Keep hopping forward!', 'trail'); return; }
    this.collideVehicles(previousX, previousY, previousTime);
    if (this.state !== 'playing' || this.powerRescue) return;
    if (this.hop > 0) { this.collectCoins(this.time - previousTime, false); if (drivesWorld) this.updateMobs(this.time - previousTime, previousX, previousY); return; }
    const lane = this.lane;
    if (lane.kind === 'river') {
      // Carry an existing rider before testing the platform's new position. A
      // fresh landing joins it now and starts drifting on the following step.
      if (riding) { this.x += lane.speed * (this.time - previousTime); this.fromX = this.x; }
      if (!platformSupports(lane, this.x, this.time)) this.end('Splash! Land on a log or a raft.', 'water');
      else if (Math.abs(this.x) > HALF_WIDTH + .5) this.end('Swept away! Hop off before the river’s edge.', 'swept');
    }
    if (this.powerRescue) return;
    if (this.state === 'playing') this.collectCoins(this.time - previousTime, true);
    if (this.state === 'playing' && drivesWorld) this.updateMobs(this.time - previousTime, previousX, previousY);
  }
  private sessionPickupContact(rewardLane: Lane, coin: { x: number; y: number }, player: SessionPlayer, x: number, y: number): { time: number; distance: number } {
    const previous = this.world.frame?.playerGround.get(player);
    const previousTime = this.world.frame?.previousTime ?? this.time;
    const priorCoin = coinPosition(rewardLane, previousTime) ?? coin;
    const startX = (previous?.x ?? x) - priorCoin.x, startY = (previous?.y ?? y) - priorCoin.y;
    const deltaX = (x - coin.x) - startX, deltaY = (y - coin.y) - startY;
    const denomination = coinDenomination(rewardLane.coinDenomination);
    const radiusX = rewardLane.coinDenomination && rewardLane.coinDenomination !== 'coin' ? .2 + denomination.width / 2 : .32;
    const radiusY = rewardLane.coinDenomination && rewardLane.coinDenomination !== 'coin' ? .2 + denomination.depth / 2 : .32;
    const a = deltaX ** 2 / radiusX ** 2 + deltaY ** 2 / radiusY ** 2;
    const b = 2 * (startX * deltaX / radiusX ** 2 + startY * deltaY / radiusY ** 2);
    const c = startX ** 2 / radiusX ** 2 + startY ** 2 / radiusY ** 2 - 1;
    const fraction = c <= 0 ? 0 : a <= 1e-12 ? 1 : Math.max(0, Math.min(1, (-b - Math.sqrt(Math.max(0, b ** 2 - 4 * a * c))) / (2 * a)));
    return { time: previousTime + fraction * (this.time - previousTime), distance: Math.hypot(startX + deltaX * fraction, startY + deltaY * fraction) };
  }
  /** Session candidates remain immutable until every seat has had an equal contact opportunity. */
  private collectSessionCoins(player: SessionPlayer, dt: number, landed: boolean): void {
    const lane = this.lane, x = this.groundX, y = this.groundY, gravity = this.run.effects.coinRadius;
    for (const rewardLane of new Set([...this.rows.values(), ...this.attractedCoins.values()])) {
      if (rewardLane.coinPull && rewardLane.coinPull.y < this.maxY - this.rules.retention.rowsBehind) continue;
      const coin = coinPosition(rewardLane, this.time);
      if (!coin) continue;
      const contactSafe = landed || lane.kind !== 'river' || (this.fromY === this.y && platformSupports(lane, x, this.time));
      const ordinary = contactSafe && (!rewardLane.coinPull || gravity <= 0) && touchesCoin(rewardLane.coinDenomination, coin.x - x, coin.y - y);
      const value = coinDenomination(rewardLane.coinDenomination).value;
      const bonus = lane.kind === 'road' ? this.run.effects.roadCoinBonus : lane.kind === 'river' ? this.run.effects.riverCoinBonus : 0;
      if (ordinary) {
        const contact = this.sessionPickupContact(rewardLane, coin, player, x, y);
        this.world.claimPickup(player, rewardLane, contact.time, contact.distance, value + bonus);
        continue;
      }
      if (gravity <= 0) continue;
      const owner = this.world.pickupOwners.get(rewardLane.index);
      if (owner && owner !== player.seat) continue;
      let pull = rewardLane.coinPull ? { ...rewardLane.coinPull } : undefined;
      if (!pull) {
        if (!landed || Math.hypot(coin.x - x, coin.y - y) > this.rules.retention.captureDistance + gravity) continue;
        pull = { ...coin, z: platformSurface(rewardLane), speed: 0 };
      }
      advanceCoinPull(pull, x, y, platformSurface(lane), dt);
      const distance = Math.hypot(pull.x - x, pull.y - y);
      const contact = this.sessionPickupContact(rewardLane, coin, player, x, y);
      if (landed && distance <= this.rules.retention.pullCompletionDistance) this.world.claimPickup(player, rewardLane, contact.time, distance, value + bonus);
      else this.world.claimPickupPull(player, rewardLane, contact.time, distance, pull);
    }
  }
  /** Captured coins accelerate visibly toward the duck; pay only on safe contact. */
  private collectCoins(dt: number, landed: boolean): void {
    const lane = this.lane, x = this.groundX, y = this.groundY, gravity = this.run.effects.coinRadius;
    const sessionPlayer = this.world?.sessionActive ? this.world.resolvingPlayer : undefined;
    if (sessionPlayer) { this.collectSessionCoins(sessionPlayer, dt, landed); return; }
    const sessionSeat = undefined;
    for (const rewardLane of new Set([...this.rows.values(), ...this.attractedCoins.values()])) {
      const pickupOwner = sessionSeat ? this.world.pickupOwners.get(rewardLane.index) : undefined;
      if (pickupOwner && pickupOwner !== sessionSeat) continue;
      // Stroll can outrun attraction. Retire only rewards whose actual position
      // has left the retained trail, never a visible coin's original lane.
      if (rewardLane.coinPull && rewardLane.coinPull.y < this.maxY - this.rules.retention.rowsBehind) {
        rewardLane.coin = null; delete rewardLane.coinPull; delete rewardLane.coinDenomination;
        this.attractedCoins.delete(rewardLane.index);
        if (sessionSeat) this.world.pickupOwners.delete(rewardLane.index);
        continue;
      }
      const coin = coinPosition(rewardLane, this.time);
      if (!coin) continue;
      // Keep a released coin where it actually is so the duck can collect it
      // manually. Removing its position would snap it back to its source row.
      if (rewardLane.coinPull && gravity <= 0) rewardLane.coinPull.speed = 0;
      // Contact while crossing land counts too: river drift leaves fractional
      // x positions, so waiting only for grid-hop endpoints can make coins
      // unreachable. Sideways river contact requires a platform beneath the
      // current body; crossing into a river still waits for a safe landing.
      const contactSafe = landed || lane.kind !== 'river' || (this.fromY === this.y && platformSupports(lane, x, this.time));
      const ordinary = contactSafe && (!rewardLane.coinPull || gravity <= 0) && touchesCoin(rewardLane.coinDenomination, coin.x - x, coin.y - y);
      if (!ordinary) {
        if (gravity <= 0) continue;
        if (!rewardLane.coinPull) {
          if (!landed || Math.hypot(coin.x - x, coin.y - y) > this.rules.retention.captureDistance + gravity) continue;
          rewardLane.coinPull = { ...coin, z: platformSurface(rewardLane), speed: 0 };
          this.attractedCoins.set(rewardLane.index, rewardLane);
          if (sessionSeat) this.world.pickupOwners.set(rewardLane.index, sessionSeat);
        }
        // Adoption may begin while a solo pull is in flight. The first active
        // seat to process it owns the continuation for this and later ticks.
        if (sessionSeat && !pickupOwner) this.world.pickupOwners.set(rewardLane.index, sessionSeat);
        advanceCoinPull(rewardLane.coinPull, x, y, platformSurface(lane), dt);
        if (!landed || Math.hypot(rewardLane.coinPull.x - x, rewardLane.coinPull.y - y) > this.rules.retention.pullCompletionDistance) continue;
      }
      const value = coinDenomination(rewardLane.coinDenomination).value;
      const bonus = lane.kind === 'road' ? this.run.effects.roadCoinBonus : lane.kind === 'river' ? this.run.effects.riverCoinBonus : 0;
      rewardLane.coin = null;
      delete rewardLane.coinDenomination;
      delete rewardLane.coinPull;
      this.attractedCoins.delete(rewardLane.index);
      if (sessionSeat) this.world.pickupOwners.delete(rewardLane.index);
      this.awardCoins(value + bonus);
    }
  }
  private updateMobs(dt: number, previousX: number, previousY: number): void { if (this.rules.pursuers.enabled || this.mode === 'stroll') this.mobDirector.update(this, dt, previousX, previousY); }
  private lifecycle(type: SoloLifecycleEventName): void {
    if (this.operationPlayer && !this.operationPlayer.primary) return;
    const observer = type === 'start' ? this.rules.lifecycle.onStart : type === 'progress' ? this.rules.lifecycle.onProgress : type === 'pause' ? this.rules.lifecycle.onPause : type === 'resume' ? this.rules.lifecycle.onResume : this.rules.lifecycle.onTerminal;
    observer?.({ type, game: this });
  }
  pause(): void { if (this.state === 'playing') { this.state = 'paused'; this.lifecycle('pause'); } }
  resume(): void { if (this.state === 'paused' && !this.run.isOpen && !this.run.pendingPack) { this.state = 'playing'; this.lifecycle('resume'); } }
}
export interface Progress { travelerVersion: 2; best: number; strollBest: number; coins: number; runs: number; selected: string; world: string; mode: Mode; reduced: boolean; muted: boolean; soundPack: string; soundAddress: string; musicVolume: number; ambienceVolume: number; effectsVolume: number }
export const freshProgress = (): Progress => ({ travelerVersion: 2, best: 0, strollBest: 0, coins: 0, runs: 0, selected: DEFAULT_CHARACTER, world: 'home', mode: 'arcade', reduced: false, muted: false, soundPack: 'pond', soundAddress: '', musicVolume: .6, ambienceVolume: .65, effectsVolume: 1 });
/** Corrupt or older scoped saves cannot inject unknown content or invalid counters. */
export function parseProgress(raw: string | null): Progress {
  const p = freshProgress(); if (!raw) return p;
  try { const data = JSON.parse(raw) as Record<string, unknown>;
    for (const key of ['best', 'strollBest', 'coins', 'runs'] as const) if (typeof data[key] === 'number' && Number.isSafeInteger(data[key]) && (data[key] as number) >= 0) p[key] = data[key] as number;
    for (const key of ['selected', 'world'] as const) if (typeof data[key] === 'string') p[key] = data[key] as string;
    // Old saves used Pip as the implicit default. Mark new saves so choosing
    // Pip explicitly after this upgrade remains a persistent choice.
    if (data.travelerVersion !== 2 && p.selected === 'pip') p.selected = DEFAULT_CHARACTER;
    if (data.mode === 'stroll' || data.mode === 'arcade') p.mode = data.mode;
    if (typeof data.reduced === 'boolean') p.reduced = data.reduced;
    if (typeof data.muted === 'boolean') p.muted = data.muted;
    for (const key of ['musicVolume', 'ambienceVolume', 'effectsVolume'] as const) if (typeof data[key] === 'number' && Number.isFinite(data[key])) p[key] = Math.max(0, Math.min(1, data[key]));
    if (['pond', 'arcade', 'custom'].includes(data.soundPack as string)) p.soundPack = data.soundPack as string;
    if (typeof data.soundAddress === 'string' && data.soundAddress.length <= 2000) p.soundAddress = data.soundAddress;
    if (p.soundPack === 'custom' && !p.soundAddress.trim()) p.soundPack = 'pond';
  } catch { /* Keep defaults for an invalid save. */ }
  if (!CHARACTERS.some(c => c.id === p.selected && p.coins >= c.coins && p.best >= c.distance)) p.selected = DEFAULT_CHARACTER;
  return p;
}
