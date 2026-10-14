import { Game, WAVE_TRAIL } from './game.js';
import type { ItemDefinition } from './market/types.js';

/** This module is reachable only from the compile-time development import. */
export const DEVELOPMENT_SCORE_LIMIT = 100_000;
export function developmentScore(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(DEVELOPMENT_SCORE_LIMIT, Math.floor(value))) : 0;
}

function copyCallbacks(current: Game, next: Game): Game {
  next.onCoin = current.onCoin; next.onEnd = current.onEnd;
  next.onMobSpawn = current.onMobSpawn; next.onMobAttack = current.onMobAttack;
  next.onHurt = current.onHurt; next.onHeal = current.onHeal;
  next.onPower = current.onPower;
  next.setCharacter(current.characterId);
  return next;
}

/** Resolve the full identity before a caller replaces or marks the current run. */
export function loadDevelopmentRun(current: Game, code: string, definitions: readonly ItemDefinition[]): Game {
  const next = Game.fromSeed(code.trim(), definitions);
  next.state = 'paused';
  return copyCallbacks(current, next);
}

/** Replace the run, including private collision, spawn and milestone state. */
export function jumpDevelopmentRun(current: Game, value: number): Game {
  const score = developmentScore(value);
  const definitions = [...current.run.catalog.values()];
  const next = current.runSeed
    ? new Game(current.runSeed, undefined, undefined, undefined, definitions)
    : new Game(current.seed, current.home, current.mode, current.gentle, definitions);
  next.time = score * .45;
  next.rows.clear();
  next.y = next.fromY = next.maxY = Math.max(0, score - 1);
  next.ensureRows();
  // A teleport should allow inspection before the first dangerous step. Only
  // the landing tile changes; neighboring rows retain real seeded generation.
  const landing = next.rows.get(score)!;
  Object.assign(landing, { kind: 'meadow', blocked: [], decorations: [], coin: null });
  delete landing.coinActor;
  delete landing.coinDenomination;
  delete landing.actors;
  if (score > 0) next.move('forward');
  next.hop = 0; next.fromX = next.x = 0; next.fromY = next.y = score;
  next.waveRow = score - WAVE_TRAIL;
  next.state = 'paused';
  return copyCallbacks(current, next);
}

export function developmentDiagnostics(game: Game, sandbox: boolean): string {
  const market = game.run.market;
  const mobs = game.mobs.length ? game.mobs.map(mob => `${mob.kind}:${mob.phase} (${mob.x.toFixed(1)},${mob.y.toFixed(1)})`).join(' · ') : 'none';
  return [
    `${sandbox ? 'SANDBOX · records disabled' : 'UNMODIFIED RUN'} · ${game.state} · ${game.mode}`,
    `score ${game.maxY} · position ${game.groundX.toFixed(2)}, ${game.groundY.toFixed(2)} · hop ${game.hop.toFixed(3)}`,
    `seed ${game.seed} · chapter ${Math.floor(game.maxY / 32) + 1} · ${game.lane.world.name} / ${game.lane.kind}`,
    `code ${game.seedCode ?? 'unregistered world · no replay code'}`,
    `time ${game.time.toFixed(2)}s · wave ${game.waveRow.toFixed(2)} · gap ${game.waveGap.toFixed(2)}`,
    `health ${game.health.toFixed(2)}/${game.maxHealth} · recovery ${game.hurtRemaining.toFixed(2)}s`,
    `traveler ${game.characterId} · ${game.power.name} · ${game.powerReady ? 'ready' : `${game.powerRemaining} blocks`} · rescue ${game.powerRescue?.remaining.toFixed(2) ?? 'none'}`,
    `wallet ${game.run.wallet} · cards ${game.run.cards.length} · powers ${game.run.powers.length}`,
    `market ${market ? `${market.milestone} · ${market.remaining.toFixed(1)}s${game.run.isOpen ? ' · open' : ''}` : 'none'}`,
    `mobs ${mobs}`,
    `rows ${game.rows.size} · ${Math.min(...game.rows.keys())}…${Math.max(...game.rows.keys())}`,
  ].join('\n');
}
