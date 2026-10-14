import { CHARACTERS, DEFAULT_CHARACTER, characterById } from './content.js';
import { platformSupports } from './game.js';
import type { DeathCause, Direction, Game, HurtEvent, Lane, RunState } from './game.js';
import type { ModeDefinition, ModeRules } from './mode-rules.js';
import { RunInventory } from './market/run.js';
import { characterPower } from './character-powers.js';
import type { CharacterPower } from './character-powers.js';

/** A stable local identity. Seat order is never simulation authority. */
export type SeatId = 'p1' | 'p2';
export type DeviceId = 'keyboard-a' | 'keyboard-b';

export interface SeatAction { seat: SeatId; direction: Direction }

/** Per-seat lifecycle delivery never shares the legacy solo facade callbacks. */
export interface SessionPlayerCallbacks {
  onCoin(amount: number): void;
  onHurt(event: HurtEvent): void;
  onEnd(event: { reason: string; cause: DeathCause }): void;
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
  update(dt: number, primary?: SessionPlayer, driver?: SessionPlayer): number {
    const previousTime = this.time;
    // Keep the released primary facade path verbatim while it owns a living
    // seat. Once it is terminal, a surviving seat advances the shared clock.
    if (primary?.state === 'playing') this.host.update(dt);
    else {
      if (driver) this.host.syncSharedEffects(driver);
      this.host.advanceSharedWorld(dt);
    }
    this.simulationTick++;
    return previousTime;
  }
  releaseInactivePickupClaims(players: readonly SessionPlayer[]): void {
    const activeSeats = new Set(players.filter(player => player.state === 'playing').map(player => player.seat));
    for (const [row, seat] of this.pickupOwners) if (!activeSeats.has(seat as SeatId)) this.pickupOwners.delete(row);
  }
  view(): SharedWorld { return this; }
}

/** Per-seat mutable state. The primary player is a live alias of the solo run. */
export class SessionPlayer {
  readonly seat: SeatId;
  readonly device: DeviceId;
  readonly marker: string;
  readonly world: SharedWorld;
  readonly primary: boolean;
  onCoin: SessionPlayerCallbacks['onCoin'] = () => {};
  onHurt: SessionPlayerCallbacks['onHurt'] = () => {};
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

  constructor(world: SharedWorld, seat: SeatId, device: DeviceId, characterId: string, primary = false) {
    this.world = world; this.seat = seat; this.device = device; this.marker = seat === 'p1' ? 'P1' : 'P2';
    this.primary = primary;
    const character = characterById(characterId);
    if (primary) {
      alias(this, world.host, ['run', 'state', 'x', 'y', 'maxY', 'idle', 'hop', 'fromX', 'fromY', 'coins', 'caughtByWave', 'health', 'maxHealth', 'hurtRemaining', 'deathCause', 'deathSpill', 'reason', 'characterId', 'powerRescue', 'powerReadyAt', 'powerNotice', 'powerLandingGrace', 'healedMilestone', 'touchingCars']);
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
  readonly players: readonly SessionPlayer[];
  private active = false;

  constructor(world: SharedWorld, players: readonly SessionPlayer[]) {
    if (players.length !== 2 || new Set(players.map(player => player.seat)).size !== players.length) throw new TypeError('A local session needs two unique stable seats.');
    this.world = world; this.players = [...players].sort((a, b) => a.seat.localeCompare(b.seat)); this.definition = world.definition;
  }

  static stage(game: Game, options: { secondaryCharacterId?: string } = {}): LocalSessionStage {
    const world = (game as Game & { world?: SharedWorld }).world ?? new SharedWorld(game);
    const primary = (game as Game & { player?: SessionPlayer }).player ?? new SessionPlayer(world, 'p1', 'keyboard-a', game.characterId, true);
    const used = new Set([primary.characterId]);
    const fallback = CHARACTERS.find(character => !used.has(character.id))?.id ?? DEFAULT_CHARACTER;
    const secondary = new SessionPlayer(world, 'p2', 'keyboard-b', options.secondaryCharacterId && !used.has(options.secondaryCharacterId) ? options.secondaryCharacterId : fallback);
    return new LocalSessionStage(game, new LocalSession(world, [primary, secondary]));
  }

  start(): void { for (const player of this.players) player.start(); this.world.sessionActive = true; this.active = true; }
  dispatch(action: SeatAction): boolean { const player = this.players.find(candidate => candidate.seat === action.seat); return !!player && this.active && player.move(action.direction); }
  update(dt: number): void {
    if (!this.active) return;
    // There is exactly one course advance per fixed tick. Seat iteration is
    // deterministic only for personal timers, never as world authority.
    const activePlayers = this.players.filter(player => player.state === 'playing');
    if (!activePlayers.length) return;
    const primary = activePlayers.find(player => player.primary);
    this.world.releaseInactivePickupClaims(this.players);
    const previousTime = this.world.update(dt, primary, activePlayers[0]);
    for (const player of this.players) {
      if (player.primary) continue;
      player.update(dt, previousTime, !primary && player === activePlayers[0]);
    }
  }
  /** Rendering owns this clock so each terminal spill ages once per frame. */
  advanceDeathVisuals(dt: number): void { for (const player of this.players) this.world.host.advancePlayerDeathVisuals(player, dt); }
  get running(): boolean { return this.active; }
  views(): PlayerRender[] { return this.players.map(player => player.render()); }
  stop(): void { this.active = false; }
}

export class LocalSessionStage {
  private state: 'staged' | 'cancelled' | 'committed' = 'staged';
  constructor(readonly game: Game, readonly session: LocalSession) {}
  cancel(): Game {
    if (this.state === 'committed') throw new Error('A committed LocalSession cannot return to staged solo ownership.');
    this.session.stop(); this.state = 'cancelled'; return this.game;
  }
  commit(): LocalSession {
    if (this.state === 'cancelled') throw new Error('A cancelled LocalSession stage cannot be committed.');
    if (this.state === 'staged') { this.session.start(); this.state = 'committed'; }
    return this.session;
  }
}
