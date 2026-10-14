import { CHARACTERS, DEFAULT_CHARACTER, characterById } from './content.js';
import { platformSupports } from './game.js';
import type { Direction, Game, Lane, RunState } from './game.js';
import type { ModeDefinition, ModeRules } from './mode-rules.js';
import { RunInventory } from './market/run.js';
import { characterPower } from './character-powers.js';
import type { CharacterPower } from './character-powers.js';

/** A stable local identity. Seat order is never simulation authority. */
export type SeatId = 'p1' | 'p2';
export type DeviceId = 'keyboard-a' | 'keyboard-b';

export interface SeatAction { seat: SeatId; direction: Direction }

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
    alias(this, game, ['rows', 'attractedCoins', 'time', 'waveRow', 'seed', 'home', 'mode', 'gentle', 'runSeed', 'seedCode', 'mobDirector', 'laneSpeeds']);
  }

  get mobs() { return this.host.mobs; }
  update(dt: number, continueWithoutPrimary = false): void {
    if (this.host.state === 'playing') this.host.update(dt);
    else if (continueWithoutPrimary) {
      // A living companion keeps the course clock moving, but never revives
      // the terminal solo facade just to re-run its collision/reward hooks.
      this.time += dt * this.rules.simulation.worldTimeScale;
    }
    this.simulationTick++;
  }
  view(): SharedWorld { return this; }
}

/** Per-seat mutable state. The primary player is a live alias of the solo run. */
export class SessionPlayer {
  readonly seat: SeatId;
  readonly device: DeviceId;
  readonly marker: string;
  readonly label: string;
  readonly world: SharedWorld;
  readonly primary: boolean;
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
  declare deathCause: unknown;
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
    this.label = `${this.marker} · ${character.name}`;
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
    this.state = 'ready'; this.x = spawn; this.y = anchorY; this.maxY = world.host.maxY; this.idle = 0; this.hop = 0; this.fromX = spawn; this.fromY = anchorY; this.coins = 0;
    this.caughtByWave = false; this.health = world.host.maxHealth; this.maxHealth = world.host.maxHealth; this.hurtRemaining = 0;
    this.deathCause = null; this.deathSpill = null; this.reason = ''; this.characterId = character.id;
    this.powerRescue = null; this.powerReadyAt = 0; this.powerNotice = 0; this.powerLandingGrace = 0; this.healedMilestone = 0; this.touchingCars = new Set();
  }

  private get rescueFraction(): number {
    if (!this.powerRescue) return 0;
    const t = this.powerRescue.remaining / this.powerRescue.power.duration;
    return t * t * (3 - 2 * t);
  }
  get groundX(): number { return this.powerRescue ? this.x + (this.powerRescue.fromX - this.x) * this.rescueFraction : this.x + (this.fromX - this.x) * this.hop / this.world.rules.movement.hopDuration; }
  get groundY(): number { return this.powerRescue ? this.y + (this.powerRescue.fromY - this.y) * this.rescueFraction : this.y + (this.fromY - this.y) * this.hop / this.world.rules.movement.hopDuration; }
  get power(): CharacterPower { return this.primary ? this.world.host.power : characterPower(this.characterId); }
  get powerFlash(): number { return this.primary ? this.world.host.powerFlash : Math.min(1, this.powerNotice / .9); }
  render(): PlayerRender { return { seat: this.seat, marker: this.marker, label: this.label, characterId: this.characterId, x: this.x, y: this.y, groundX: this.groundX, groundY: this.groundY, hop: this.hop, fromY: this.fromY, state: this.state, run: this.run, hurtRemaining: this.hurtRemaining, powerRescue: this.powerRescue, powerFlash: this.powerFlash, power: this.power, caughtByWave: this.caughtByWave, deathSpill: this.deathSpill }; }

  start(): boolean {
    if (this.primary) return this.world.host.start();
    if (this.state !== 'ready') return false;
    this.state = 'playing'; return true;
  }

  move(direction: Direction): boolean {
    if (this.primary) return this.world.host.move(direction);
    if (this.state === 'ready') this.start();
    if (this.state !== 'playing' || this.hop > 0) return false;
    const nx = this.x + (direction === 'left' ? -1 : direction === 'right' ? 1 : 0);
    const ny = this.y + (direction === 'forward' ? 1 : direction === 'back' ? -1 : 0);
    const lane = this.world.rows.get(ny);
    if (!lane || nx < -5 || nx > 5 || lane.blocked.includes(Math.round(nx))) return false;
    this.fromX = this.x; this.fromY = this.y; this.x = nx; this.y = ny; this.hop = this.world.rules.movement.hopDuration;
    if (ny > this.maxY) {
      this.maxY = ny; this.idle = 0; this.earnedDistance++;
      const amount = this.run.creditCoins(this.run.advanceScore(this.earnedDistance) * this.run.effects.coinMultiplier);
      this.coins += amount;
    }
    return true;
  }

  update(dt: number): void {
    if (this.primary) return;
    if (this.state === 'dead') {
      if (this.deathSpill && Number.isFinite(dt) && dt > 0) this.deathSpill.age = Math.min(3, this.deathSpill.age + dt);
      return;
    }
    if (this.state !== 'playing') return;
    this.run.tick(dt); this.idle += dt; this.hop = Math.max(0, this.hop - dt); this.hurtRemaining = Math.max(0, this.hurtRemaining - dt);
    this.powerNotice = Math.max(0, this.powerNotice - dt); this.powerLandingGrace = Math.max(0, this.powerLandingGrace - dt);
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

  start(): void { for (const player of this.players) player.start(); this.active = true; }
  dispatch(action: SeatAction): boolean { const player = this.players.find(candidate => candidate.seat === action.seat); return !!player && this.active && player.move(action.direction); }
  update(dt: number): void {
    if (!this.active) return;
    // There is exactly one course advance per fixed tick. Seat iteration is
    // deterministic only for personal timers, never as world authority.
    this.world.update(dt, this.players.some(player => !player.primary && player.state === 'playing'));
    for (const player of this.players) player.update(dt);
  }
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
