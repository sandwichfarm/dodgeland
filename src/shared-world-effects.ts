import { defaultModifiers } from './market/run.js';
import type { RunModifiers } from './market/types.js';

export type SharedEffectScope = 'owner-local' | 'world-shared';
export type BenefitDirection = 'higher' | 'lower';
export interface SharedEffectDescriptor {
  readonly scope: SharedEffectScope;
  readonly direction: BenefitDirection;
  /** `riverCoinBonus` has one stored source but separate world-roll and owner-payout consumers. */
  readonly ownerPayoutAlso?: boolean;
}

/** Every stored modifier declares whether the shared course may consume it. */
export const SHARED_WORLD_EFFECTS = {
  coinRadius: { scope: 'owner-local', direction: 'higher' },
  coinMultiplier: { scope: 'owner-local', direction: 'higher' },
  roadCoinBonus: { scope: 'owner-local', direction: 'higher' },
  // The resolver selects this value for river generation. `Game.collectCoins`
  // deliberately still reads the collecting owner's stored modifier for payout.
  riverCoinBonus: { scope: 'world-shared', direction: 'higher', ownerPayoutAlso: true },
  trafficSpeed: { scope: 'world-shared', direction: 'lower' },
  trafficSpacing: { scope: 'world-shared', direction: 'higher' },
  riverSpeed: { scope: 'world-shared', direction: 'lower' },
  platformLength: { scope: 'world-shared', direction: 'higher' },
  trainPeriod: { scope: 'world-shared', direction: 'higher' },
  trainWarning: { scope: 'world-shared', direction: 'higher' },
  rearDamage: { scope: 'owner-local', direction: 'lower' },
  sideDamage: { scope: 'owner-local', direction: 'lower' },
  hurtRecovery: { scope: 'owner-local', direction: 'higher' },
  regenBonus: { scope: 'owner-local', direction: 'higher' },
  waveSpeed: { scope: 'world-shared', direction: 'lower' },
  waveTrail: { scope: 'world-shared', direction: 'higher' },
  mobSpeed: { scope: 'world-shared', direction: 'lower' },
  mobWindup: { scope: 'world-shared', direction: 'higher' },
  mobRecovery: { scope: 'world-shared', direction: 'higher' },
  mobSpawnDelay: { scope: 'world-shared', direction: 'higher' },
  coinChance: { scope: 'world-shared', direction: 'higher' },
  sceneryClear: { scope: 'world-shared', direction: 'higher' },
  shield: { scope: 'owner-local', direction: 'higher' },
  cardSlots: { scope: 'owner-local', direction: 'higher' },
} as const satisfies Record<keyof RunModifiers, SharedEffectDescriptor>;

export interface SharedEffectContributor { readonly seat: string; readonly effects: RunModifiers }
export interface ResolvedSharedWorldEffects { readonly effects: RunModifiers; readonly contributors: Readonly<Partial<Record<keyof RunModifiers, string>>> }

/** Select exactly one active-seat value for every course-owned property. */
export function resolveSharedWorldEffects(active: readonly SharedEffectContributor[]): ResolvedSharedWorldEffects {
  const ordered = [...active].sort((a, b) => a.seat.localeCompare(b.seat));
  const fallback = defaultModifiers();
  const first = ordered[0];
  const effects: RunModifiers = first ? { ...first.effects } : fallback;
  const contributors: Partial<Record<keyof RunModifiers, string>> = {};
  for (const key of Object.keys(SHARED_WORLD_EFFECTS) as (keyof RunModifiers)[]) {
    const descriptor = SHARED_WORLD_EFFECTS[key];
    if (descriptor.scope === 'owner-local') continue;
    const winner = ordered.reduce<SharedEffectContributor | undefined>((best, candidate) => {
      if (!best) return candidate;
      const comparison = candidate.effects[key] - best.effects[key];
      return (descriptor.direction === 'higher' ? comparison > 0 : comparison < 0) ? candidate : best;
    }, undefined);
    if (winner) { effects[key] = winner.effects[key]; contributors[key] = winner.seat; }
  }
  return Object.freeze({ effects: Object.freeze(effects), contributors: Object.freeze(contributors) });
}
