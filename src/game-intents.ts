import { decodeRunSeed } from './run-seed.js';
import type { RunSeed } from './run-seed.js';

export const GAME_OPEN_CONVENTION = 'napplet:game/open';
export type GameLaunch = { seed?: RunSeed; mode?: RunSeed['mode'] };
export type GameOpenRequest = { kind: 'open'; launch: GameLaunch } | { kind: 'invalid' };

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** The game owns this payload contract; the runtime owns sender and routing. */
export function parseGameOpenIntent(delivery: unknown): GameOpenRequest | null {
  if (!record(delivery) || delivery.archetype !== 'game' || delivery.action !== 'open' || delivery.convention !== GAME_OPEN_CONVENTION) return null;
  const payload = delivery.payload;
  if (payload === undefined) return { kind: 'open', launch: {} };
  if (!record(payload) || Object.keys(payload).some(key => key !== 'seed' && key !== 'mode')) return { kind: 'invalid' };
  const launch: GameLaunch = {};
  if (Object.hasOwn(payload, 'mode')) {
    if (payload.mode !== 'arcade' && payload.mode !== 'stroll') return { kind: 'invalid' };
    launch.mode = payload.mode;
  }
  if (Object.hasOwn(payload, 'seed')) {
    if (typeof payload.seed !== 'string') return { kind: 'invalid' };
    try { launch.seed = decodeRunSeed(payload.seed); } catch { return { kind: 'invalid' }; }
    // A copied seed pins its mode; an intent must not silently change its course.
    if (launch.mode && launch.mode !== launch.seed.mode) return { kind: 'invalid' };
  }
  return { kind: 'open', launch };
}
