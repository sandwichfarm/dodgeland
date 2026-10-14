import type { Game } from './game.js';
import type { PursuerRules } from './mode-rules.js';

export type MobKind = 'slime' | 'crab' | 'wasp';
export interface Mob {
  id: number; kind: MobKind; x: number; y: number;
  fromX: number; fromY: number; targetX: number; targetY: number;
  phase: 'spawning' | 'walking' | 'windup' | 'moving' | 'rest';
  phaseLeft: number; phaseDuration: number;
  /** Speed at the start of a motion; rebase duration when a card changes it. */
  motionSpeed?: number;
}
export const MOB_TYPES: readonly { id: MobKind; name: string; unlock: number; hint: string; radius: number }[] = [
  { id: 'slime', name: 'Moss Slime', unlock: 160, hint: 'Keep a step ahead of its slow walk.', radius: .22 },
  { id: 'crab', name: 'Snap Crab', unlock: 320, hint: 'Sidestep its marked charge.', radius: .25 },
  { id: 'wasp', name: 'Bramble Wasp', unlock: 480, hint: 'Leave its marked dive path.', radius: .2 },
];
export const MOB_SPAWN_GRACE = 1.8;
export const MOB_FIRST_SPAWN_TIME = 45;
export const MOB_MIN_SPAWN_PROGRESS = 24;
const DEFAULT_PURSUER_RULES: PursuerRules = {
  enabled: true, introductionThresholds: [160, 320, 480], firstSpawnTime: MOB_FIRST_SPAWN_TIME,
  minimumSpawnProgress: MOB_MIN_SPAWN_PROGRESS, spawnInterval: 18, minimumSpawnInterval: 14,
  intervalProgress: 160, populationCap: 2,
};
/** Encounter pacing is separate from the aggression of an existing pursuer. */
export function mobPacing(score: number, rules: PursuerRules = DEFAULT_PURSUER_RULES): { interval: number; cap: number } {
  const first = rules.introductionThresholds[0]!, final = rules.introductionThresholds.at(-1)!;
  return {
    interval: Math.max(rules.minimumSpawnInterval, rules.spawnInterval - Math.max(0, score - first) / rules.intervalProgress),
    cap: score < first ? 0 : score < final ? Math.min(1, rules.populationCap) : rules.populationCap,
  };
}
/** Rendering and body collisions use the very same eased position. */
export function mobMotionProgress(kind: MobKind, phase: Mob['phase'], fraction: number): number {
  const t = Math.max(0, Math.min(1, fraction));
  if (phase !== 'moving' || kind === 'slime') return t;
  if (kind === 'crab') return 1 - (1 - t) ** 3;
  return t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}
export const PLAYER_MOB_RADIUS = .2;
/** A session supplies fixed per-seat operation views; the director remains singular. */
export interface MobParticipant { readonly seat: string; readonly game: Game; readonly previousX: number; readonly previousY: number }
export function mobDefinition(kind: MobKind): typeof MOB_TYPES[number] { return MOB_TYPES.find(definition => definition.id === kind)!; }
/** Each species ramps from its own debut, then stops accelerating. */
export function mobTuning(kind: MobKind, score: number): { walkSpeed: number; speed: number; windup: number; recovery: number; range: number } {
  const age = Math.min(1, Math.max(0, score - mobDefinition(kind).unlock) / 320);
  if (kind === 'slime') return { walkSpeed: .65 + .3 * age, speed: .65 + .3 * age, windup: 0, recovery: 0, range: 0 };
  if (kind === 'crab') return { walkSpeed: .85 + .3 * age, speed: 2.4 + .7 * age, windup: 1.2 - .25 * age, recovery: 2.2 - .5 * age, range: 1.3 };
  return { walkSpeed: .75 + .3 * age, speed: 2 + .9 * age, windup: 1.35 - .25 * age, recovery: 2.6 - .6 * age, range: 1.8 };
}
/** Item modules modify shared behavior hooks without naming individual cards. */
function runTuning(game: Game, kind: MobKind): ReturnType<typeof mobTuning> {
  const tuning = mobTuning(kind, game.maxY), effects = game.run.effects;
  return { ...tuning, walkSpeed: tuning.walkSpeed * Math.max(.001, effects.mobSpeed), speed: tuning.speed * Math.max(.001, effects.mobSpeed), windup: tuning.windup * effects.mobWindup, recovery: tuning.recovery * effects.mobRecovery };
}
/** Relative swept body cores prevent tunneling without counting decorative parts. */
export function sweptMobContact(ax: number, ay: number, bx: number, by: number, px: number, py: number, qx: number, qy: number, radius: number): boolean {
  const x = ax - px, y = ay - py, dx = bx - qx - x, dy = by - qy - y;
  const t = Math.max(0, Math.min(1, -(x * dx + y * dy) / (dx * dx + dy * dy || 1)));
  return (x + t * dx) ** 2 + (y + t * dy) ** 2 < radius * radius;
}

export class MobDirector {
  mobs: Mob[] = [];
  private nextId = 1;
  private nextSpawn = 0;
  private lastSpawnScore = -Infinity;
  private retryAt = 0;
  private spawnDelay = 0;
  private modifierRetryAt = 0;
  private introduced = new Set<MobKind>();
  constructor(private rng: () => number) {}

  private clearPath(game: Game, mob: Mob, x: number, y: number): boolean {
    if (mob.kind === 'wasp') return true;
    const steps = Math.max(1, Math.ceil(Math.hypot(x - mob.x, y - mob.y) / .12));
    for (let step = 0; step <= steps; step++) {
      const fraction = step / steps;
      if (game.mobBlocked(mob.x + (x - mob.x) * fraction, mob.y + (y - mob.y) * fraction, mobDefinition(mob.kind).radius)) return false;
    }
    return true;
  }

  private plan(game: Game, mob: Mob): void {
    const tuning = runTuning(game, mob.kind);
    const dx = game.groundX - mob.x, dy = game.groundY - mob.y, distance = Math.hypot(dx, dy);
    let target: { x: number; y: number } | undefined;
    // Crab charges are cardinal and must line up first. A wasp can commit to
    // a diagonal dive. Both lock a nearby target for the whole warning/strike.
    if (mob.kind !== 'slime' && distance > .08 && distance <= tuning.range) {
      if (mob.kind === 'wasp') target = { x: game.groundX, y: game.groundY };
      else if (Math.min(Math.abs(dx), Math.abs(dy)) <= .25) {
        const candidate = Math.abs(dx) >= Math.abs(dy) ? { x: game.groundX, y: mob.y } : { x: mob.x, y: game.groundY };
        if (this.clearPath(game, mob, candidate.x, candidate.y)) target = candidate;
      }
    }
    mob.fromX = mob.x; mob.fromY = mob.y;
    if (target) {
      mob.targetX = target.x; mob.targetY = target.y;
      mob.phase = 'windup'; mob.phaseDuration = mob.phaseLeft = tuning.windup;
      delete mob.motionSpeed;
      game.onMobAttack(mob);
      return;
    }
    if (mob.kind === 'wasp' && distance > .08) {
      const scale = Math.min(1, .5 / distance);
      target = { x: mob.x + dx * scale, y: mob.y + dy * scale };
    } else if (distance > .08) target = this.walkTarget(game, mob);
    mob.targetX = target?.x ?? mob.x; mob.targetY = target?.y ?? mob.y;
    // A blocked route retries quietly; ordinary steps join with no windup,
    // recovery, attack marker or sound.
    mob.phase = 'walking';
    mob.motionSpeed = tuning.walkSpeed;
    mob.phaseDuration = mob.phaseLeft = target ? Math.hypot(target.x - mob.x, target.y - mob.y) / tuning.walkSpeed : .25;
  }

  private walkTarget(game: Game, mob: Mob): { x: number; y: number } | undefined {
    type Step = { x: number; y: number; depth: number; first?: { x: number; y: number } };
    const queue: Step[] = [{ x: mob.x, y: mob.y, depth: 0 }], visited = new Set(['0:0']);
    let bestDistance = Math.hypot(mob.x - game.groundX, mob.y - game.groundY), target: Step['first'];
    // A small cardinal search can turn around a tree instead of oscillating
    // against it. Only the first half-tile is committed; the duck is rechecked
    // at every step. A river with no route leaves the ground mob on its bank.
    for (let index = 0; index < queue.length; index++) {
      const step = queue[index]!;
      if (step.depth >= 6) continue;
      const choices = [[.5, 0], [-.5, 0], [0, .5], [0, -.5]].map(([x, y]) => ({ x: step.x + x!, y: step.y + y! }))
        .sort((a, b) => Math.hypot(a.x - game.groundX, a.y - game.groundY) - Math.hypot(b.x - game.groundX, b.y - game.groundY));
      for (const candidate of choices) {
        const key = `${Math.round((candidate.x - mob.x) * 2)}:${Math.round((candidate.y - mob.y) * 2)}`;
        if (visited.has(key)) continue;
        visited.add(key);
        if (!this.clearPath(game, { ...mob, x: step.x, y: step.y }, candidate.x, candidate.y)) continue;
        const first = step.first ?? candidate, distance = Math.hypot(candidate.x - game.groundX, candidate.y - game.groundY);
        if (distance < bestDistance - 1e-6) { bestDistance = distance; target = first; }
        if (distance < .26) return first;
        queue.push({ ...candidate, depth: step.depth + 1, first });
      }
    }
    return target;
  }

  private spawn(game: Game): void {
    const rules = game.rules.pursuers;
    const available = MOB_TYPES.filter((_definition, index) => game.maxY >= rules.introductionThresholds[index]!);
    const pacing = mobPacing(game.maxY, rules);
    if (!available.length || this.mobs.length >= pacing.cap || game.hop > 0 || game.warning || game.run.market ||
      game.time < Math.max(rules.firstSpawnTime, this.nextSpawn, this.retryAt, this.modifierRetryAt) ||
      game.maxY - this.lastSpawnScore < rules.minimumSpawnProgress) return;
    // A new species gets priority only after the normal breathing room. Wait
    // for a meadow landing so a new threat never stacks onto a crossing.
    if (game.lane?.kind !== 'meadow' || game.mobHazard(game.x, game.y, game.x, game.y, game.time, game.time, .23)) return;
    const debut = available.find(candidate => !this.introduced.has(candidate.id));
    const definition = debut ?? available[Math.floor(this.rng() * available.length)]!;
    const candidates: { x: number; y: number }[] = [];
    const exits = [[game.x - 1, game.y], [game.x + 1, game.y], [game.x, game.y - 1], [game.x, game.y + 1]].filter(([x, y]) =>
      Math.abs(x!) <= 5 && game.rows.has(y!) && !game.rows.get(y!)!.blocked.includes(Math.round(x!)) &&
      this.mobs.every(mob => Math.hypot(mob.x - x!, mob.y - y!) > mobDefinition(mob.kind).radius + PLAYER_MOB_RADIUS + .15));
    if (!exits.length) { this.retryAt = game.time + .5; return; }
    for (let y = Math.ceil(Math.max(game.groundY - 2, game.maxY - 2)); y <= Math.floor(game.groundY); y++) for (let x = -5; x <= 5; x++) {
      const distance = Math.hypot(x - game.groundX, y - game.groundY);
      if (distance < 2.5 || distance > 3.5 || Math.abs(x - game.groundX) > 3.25 || y <= game.waveRow + .55 || game.rows.get(y)?.kind !== 'meadow' || game.mobBlocked(x, y, definition.radius)) continue;
      if (this.mobs.some(mob => Math.hypot(mob.x - x, mob.y - y) < 1.2)) continue;
      if (!exits.some(([ex, ey]) => Math.hypot(ex! - x, ey! - y) > definition.radius + PLAYER_MOB_RADIUS + .15)) continue;
      candidates.push({ x, y });
    }
    if (!candidates.length) { this.retryAt = game.time + .5; return; }
    const { x, y } = candidates[Math.floor(this.rng() * candidates.length)]!;
    const mob: Mob = { id: this.nextId++, kind: definition.id, x, y, fromX: x, fromY: y, targetX: x, targetY: y, phase: 'spawning', phaseLeft: MOB_SPAWN_GRACE, phaseDuration: MOB_SPAWN_GRACE };
    this.mobs.push(mob); this.introduced.add(mob.kind);
    this.lastSpawnScore = game.maxY;
    this.nextSpawn = game.time + pacing.interval + this.spawnDelay;
    game.onMobSpawn(mob);
  }

  update(game: Game, dt: number, previousX: number, previousY: number, participants: readonly MobParticipant[] = []): void {
    if (!game.rules.pursuers.enabled) { this.mobs.length = 0; return; }
    const delay = game.run.effects.mobSpawnDelay;
    if (delay !== this.spawnDelay) {
      const change = delay - this.spawnDelay;
      this.nextSpawn = Math.max(game.time, this.nextSpawn) + change;
      this.modifierRetryAt = Math.max(game.time, this.modifierRetryAt) + change;
      this.spawnDelay = delay;
    }
    const retained: Mob[] = [];
    const targets = participants.length ? participants : [{ seat: 'p1', game, previousX, previousY }];
    for (const mob of this.mobs) {
      const target = [...targets].sort((a, b) => Math.hypot(a.game.groundX - mob.x, a.game.groundY - mob.y) - Math.hypot(b.game.groundX - mob.x, b.game.groundY - mob.y) || a.seat.localeCompare(b.seat))[0]!;
      const targetGame = target.game;
      const radius = mobDefinition(mob.kind).radius;
      if (mob.y <= game.waveRow + radius || mob.y < game.maxY - 8 || mob.y > game.groundY + 9 || Math.abs(mob.x) > 5.5) continue;
      const frozen = game.run.effects.mobSpeed === 0;
      let remaining = frozen ? 0 : dt, elapsed = 0, removed = false;
      // A fixed step usually visits just one phase; splitting boundary steps
      // keeps spawn immunity and swept contacts exact at phase transitions.
      do {
        if (!frozen && (mob.phase === 'walking' || mob.phase === 'moving') && mob.motionSpeed !== undefined) {
          const tuning = runTuning(game, mob.kind), speed = mob.phase === 'walking' ? tuning.walkSpeed : tuning.speed;
          const ratio = mob.motionSpeed / speed;
          mob.phaseDuration *= ratio; mob.phaseLeft *= ratio; mob.motionSpeed = speed;
        }
        // Eased strikes need short collision slices even if the caller gives
        // one large update, because the duck and mob move at different rates.
        const duration = Math.min(remaining, mob.phaseLeft, mob.phase === 'moving' ? 1 / 120 : Infinity);
        const oldX = mob.x, oldY = mob.y, harmless = mob.phase === 'spawning';
        mob.phaseLeft = Math.max(0, mob.phaseLeft - duration);
        if (mob.phase === 'moving' || mob.phase === 'walking') {
          const fraction = mobMotionProgress(mob.kind, mob.phase, 1 - mob.phaseLeft / mob.phaseDuration);
          mob.x = mob.fromX + (mob.targetX - mob.fromX) * fraction;
          mob.y = mob.fromY + (mob.targetY - mob.fromY) * fraction;
        }
        const start = dt > 0 ? elapsed / dt : 0, end = !frozen && dt > 0 ? (elapsed + duration) / dt : 1;
        if (mob.y <= game.waveRow + radius || (mob.kind !== 'wasp' && game.mobHazard(oldX, oldY, mob.x, mob.y, game.time - dt + elapsed, frozen ? game.time : game.time - dt + elapsed + duration, radius))) { removed = true; break; }
        if (!harmless) for (const participant of targets) {
          const player = participant.game;
          if (player.state !== 'playing' || player.powerAvoidsMobs || player.run.effects.shield > 0) continue;
          if (!sweptMobContact(oldX, oldY, mob.x, mob.y, participant.previousX + (player.groundX - participant.previousX) * start, participant.previousY + (player.groundY - participant.previousY) * start, participant.previousX + (player.groundX - participant.previousX) * end, participant.previousY + (player.groundY - participant.previousY) * end, radius + PLAYER_MOB_RADIUS)) continue;
          const definition = mobDefinition(mob.kind);
          player.end(`${definition.name} caught you! ${definition.hint}`, 'mob');
        }
        remaining -= duration; elapsed += duration;
        if (!frozen && mob.phaseLeft <= 0) {
          if (mob.phase === 'spawning' || mob.phase === 'walking' || mob.phase === 'rest') this.plan(targetGame, mob);
          else if (mob.phase === 'windup') {
            mob.phase = 'moving'; mob.motionSpeed = runTuning(game, mob.kind).speed;
            mob.phaseDuration = mob.phaseLeft = Math.max(.001, Math.hypot(mob.targetX - mob.fromX, mob.targetY - mob.fromY) / mob.motionSpeed);
          } else {
            mob.phase = 'rest'; delete mob.motionSpeed; mob.phaseDuration = mob.phaseLeft = Math.max(.25, runTuning(game, mob.kind).recovery);
          }
        }
      } while (remaining > 1e-9);
      if (!removed) retained.push(mob);
    }
    this.mobs = retained;
    this.spawn(game);
  }
}
