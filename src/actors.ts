import type { Lane } from './game.js';

export type ActorKind = 'car' | 'truck' | 'sports' | 'platform' | 'train';
export interface LaneActor {
  /** Stable across frames, including the frame that enters or leaves view. */
  id: number; x: number; previousX: number; speed: number; length: number;
  variant: number; kind: ActorKind; accelerating?: boolean;
}
export interface ActorDefinition {
  kind: ActorKind; length: number; variant: number;
  /** Multiplier of the lane clock's base speed. */
  speedFactor: number;
  /** Clear space behind this actor, before the next actor enters. */
  gap: number;
  boost?: number;
}
export interface ActorPattern {
  kind: 'traffic' | 'platforms'; slots: ActorDefinition[];
  offsets: number[]; span: number; duration: number; tier: number;
}

const ENTRY = -13;
const RENDER_EDGE = 11;
const TRAVEL_DISTANCE = -2 * ENTRY;
/** One third of the playable eleven-tile crossing, measured from its entrance. */
const BOOST_DISTANCE = -5.5 + 11 / 3 - ENTRY;
const ACCELERATION = .72;
const positiveModulo = (value: number, span: number): number => ((value % span) + span) % span;
const direction = (lane: Lane): number => lane.speed < 0 ? -1 : lane.speed > 0 ? 1 : lane.direction ?? 1;

function boostEnd(actor: ActorDefinition): number {
  return BOOST_DISTANCE + ((actor.boost ?? actor.speedFactor) ** 2 - actor.speedFactor ** 2) / (2 * ACCELERATION);
}
/** Inverse trajectory, in base-lane distance units. No integration or frame history. */
function arrival(actor: ActorDefinition, distance: number): number {
  if (!actor.boost || distance <= BOOST_DISTANCE) return distance / actor.speedFactor;
  const end = boostEnd(actor);
  const boostTime = (actor.boost - actor.speedFactor) / ACCELERATION;
  return BOOST_DISTANCE / actor.speedFactor + (distance < end
    ? (Math.sqrt(actor.speedFactor ** 2 + 2 * ACCELERATION * (distance - BOOST_DISTANCE)) - actor.speedFactor) / ACCELERATION
    : boostTime + (distance - end) / actor.boost);
}
function motion(actor: ActorDefinition, clock: number): { distance: number; velocity: number; accelerating: boolean } {
  const start = BOOST_DISTANCE / actor.speedFactor;
  if (!actor.boost || clock <= start) return { distance: clock * actor.speedFactor, velocity: actor.speedFactor, accelerating: false };
  const elapsed = clock - start;
  const boostTime = (actor.boost - actor.speedFactor) / ACCELERATION;
  if (elapsed < boostTime) return {
    distance: BOOST_DISTANCE + actor.speedFactor * elapsed + ACCELERATION * elapsed ** 2 / 2,
    velocity: actor.speedFactor + ACCELERATION * elapsed, accelerating: true,
  };
  return { distance: boostEnd(actor) + (elapsed - boostTime) * actor.boost, velocity: actor.boost, accelerating: false };
}
function velocitySquared(actor: ActorDefinition, distance: number): number {
  if (!actor.boost || distance <= BOOST_DISTANCE) return actor.speedFactor ** 2;
  return Math.min(actor.boost ** 2, actor.speedFactor ** 2 + 2 * ACCELERATION * (distance - BOOST_DISTANCE));
}

/**
 * Delay a follower until it cannot catch the leader anywhere across the field.
 * Maximise T_leader(d + clearance) - T_follower(d). Squared speeds are piecewise
 * linear in distance, so endpoints and their intersections are the exact extrema.
 */
function headway(leader: ActorDefinition, follower: ActorDefinition): number {
  const clearance = (leader.length + follower.length) / 2 + leader.gap;
  const points = [0, TRAVEL_DISTANCE, BOOST_DISTANCE - clearance, boostEnd(leader) - clearance, BOOST_DISTANCE, boostEnd(follower)]
    .filter(value => value >= 0 && value <= TRAVEL_DISTANCE).sort((a, b) => a - b);
  let result = 0;
  const difference = (distance: number) => arrival(leader, distance + clearance) - arrival(follower, distance);
  for (let index = 0; index < points.length; index++) {
    const start = points[index]!;
    result = Math.max(result, difference(start));
    if (index === points.length - 1) continue;
    const end = points[index + 1]!;
    const atStart = velocitySquared(leader, start + clearance) - velocitySquared(follower, start);
    const atEnd = velocitySquared(leader, end + clearance) - velocitySquared(follower, end);
    if (atStart * atEnd < 0) result = Math.max(result, difference(start + (end - start) * -atStart / (atEnd - atStart)));
  }
  return result + 1e-8;
}

/** The small repeating recipe is regenerated from the row seed, never frame order. */
export function createActorPattern(kind: ActorPattern['kind'], slots: ActorDefinition[], tier: number): ActorPattern {
  const pattern: ActorPattern = { kind, slots, offsets: [0], span: 0, duration: 0, tier };
  rebuildPattern(pattern);
  return pattern;
}
function rebuildPattern(pattern: ActorPattern): void {
  const { slots } = pattern;
  pattern.offsets = [0];
  let span = 0;
  for (let index = 0; index < slots.length; index++) {
    const actor = slots[index]!, next = slots[(index + 1) % slots.length]!;
    span += pattern.kind === 'traffic' ? headway(actor, next) : (actor.length + next.length) / 2 + actor.gap;
    if (index < slots.length - 1) pattern.offsets.push(span);
  }
  pattern.span = span;
  pattern.duration = pattern.kind === 'traffic' ? Math.max(...slots.map(actor => arrival(actor, TRAVEL_DISTANCE + actor.length))) : span;
}

/** Apply only when a new row is created. Existing rows retain their trajectories. */
export function applyActorEffects(lane: Lane, effects: { trafficSpacing: number; platformLength: number }): void {
  const pattern = lane.actors;
  if (!pattern) return;
  for (const actor of pattern.slots) {
    if (pattern.kind === 'traffic') actor.gap *= effects.trafficSpacing;
    else actor.length *= effects.platformLength;
  }
  rebuildPattern(pattern);
}

/** Returns no actors for legacy rows: their original tiling remains in game.ts. */
export function progressiveActors(lane: Lane, time: number, previousTime = time): LaneActor[] {
  const pattern = lane.actors;
  if (!pattern) return [];
  const sign = direction(lane), clock = sign * (lane.phase + time * lane.speed);
  const previousClock = sign * (lane.phase + previousTime * lane.speed);
  const actors: LaneActor[] = [];
  const count = pattern.slots.length;
  if (pattern.kind === 'platforms') {
    const widest = Math.max(...pattern.slots.map(actor => actor.length));
    const start = Math.floor((-RENDER_EDGE - widest / 2 - clock) / pattern.span) - 1;
    const end = Math.ceil((RENDER_EDGE + widest / 2 - clock) / pattern.span);
    for (let cycle = start; cycle <= end; cycle++) for (let slot = 0; slot < count; slot++) {
      const actor = pattern.slots[slot]!, offset = cycle * pattern.span + pattern.offsets[slot]!;
      const x = sign * (clock + offset);
      if (Math.abs(x) > RENDER_EDGE + actor.length / 2) continue;
      actors.push({ id: cycle * count + slot, x, previousX: sign * (previousClock + offset), speed: lane.speed, length: actor.length, variant: actor.variant, kind: 'platform' });
    }
  } else {
    const start = Math.floor((clock - pattern.duration) / pattern.span) - 1;
    const end = Math.floor(clock / pattern.span) + 1;
    for (let cycle = start; cycle <= end; cycle++) for (let slot = 0; slot < count; slot++) {
      const actor = pattern.slots[slot]!, birth = cycle * pattern.span + pattern.offsets[slot]!;
      const state = motion(actor, clock - birth), x = sign * (ENTRY + state.distance);
      if (Math.abs(x) > RENDER_EDGE + actor.length / 2) continue;
      actors.push({ id: cycle * count + slot, x, previousX: sign * (ENTRY + motion(actor, previousClock - birth).distance), speed: lane.speed * state.velocity, length: actor.length, variant: actor.variant, kind: actor.kind, accelerating: lane.speed !== 0 && state.accelerating });
    }
  }
  return actors.sort((a, b) => a.x - b.x);
}

/** One coin follows a sequence slot; any reassignment happens outside the field. */
export function progressiveCoinPosition(lane: Lane, time: number, id: number): number | null {
  const pattern = lane.actors;
  if (pattern?.kind !== 'platforms') return null;
  const count = pattern.slots.length, slot = positiveModulo(id, count), cycle = Math.floor(id / count);
  const sign = direction(lane), clock = sign * (lane.phase + time * lane.speed);
  const repeat = Math.ceil(26 / pattern.span) * pattern.span;
  const physical = sign * (clock + cycle * pattern.span + pattern.offsets[slot]!);
  const x = positiveModulo(physical + repeat / 2, repeat) - repeat / 2;
  return Math.abs(x) <= RENDER_EDGE ? x : null;
}
