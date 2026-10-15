import type { SessionContribution, SessionParticipation, SessionPlayer } from './session.js';

export interface SurviveContribution {
  readonly seat: string;
  readonly characterId: string;
  readonly participantId: string;
  readonly lifecycle: SessionParticipation;
  readonly furthestDistance: number;
  readonly coins: number;
  readonly deaths: number;
  readonly selfRevives: number;
  readonly teammateRevives: number;
  readonly itemsFound: number;
  readonly itemsUsed: number;
  readonly ghostSeconds: number;
}
export interface SurviveTogetherResult {
  readonly mode: 'survive-together';
  readonly outcome: 'all-dead';
  readonly distance: number;
  readonly elapsedSeconds: number;
  readonly podium: 'team';
  readonly contributions: readonly SurviveContribution[];
}

function contribution(player: SessionPlayer): SurviveContribution {
  return Object.freeze({
    seat: player.seat, characterId: player.characterId, participantId: player.participantId,
    lifecycle: player.participation, furthestDistance: Math.max(player.statistics.distance, player.completedForwardTiles),
    coins: player.statistics.coins, deaths: player.statistics.deaths,
    selfRevives: player.statistics.selfRevives, teammateRevives: player.statistics.teammateRevives,
    itemsFound: player.statistics.itemsFound, itemsUsed: player.statistics.itemsUsed,
    ghostSeconds: player.statistics.deviceLostDuration,
  });
}
function archived(record: SessionContribution): SurviveContribution {
  return Object.freeze({
    seat: record.seat, characterId: record.characterId, participantId: record.participantId,
    lifecycle: 'departed', furthestDistance: record.statistics.distance, coins: record.statistics.coins,
    deaths: record.statistics.deaths, selfRevives: record.statistics.selfRevives, teammateRevives: record.statistics.teammateRevives,
    itemsFound: record.statistics.itemsFound, itemsUsed: record.statistics.itemsUsed, ghostSeconds: record.statistics.deviceLostDuration,
  });
}

/** Freeze the final shared team record once; callers retain no mutable session objects. */
export function createSurviveTogetherResult(input: { readonly time: number; readonly distance: number; readonly players: readonly SessionPlayer[]; readonly archived: readonly SessionContribution[] }): SurviveTogetherResult {
  const contributions = [...input.players].sort((a, b) => a.seat.localeCompare(b.seat)).map(contribution)
    .concat([...input.archived].sort((a, b) => a.seat.localeCompare(b.seat)).map(archived));
  return Object.freeze({ mode: 'survive-together', outcome: 'all-dead', distance: input.distance, elapsedSeconds: input.time, podium: 'team', contributions: Object.freeze(contributions) });
}
