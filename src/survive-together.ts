import type { ModeDefinition } from './mode-rules.js';
import { isLivingRecoverySubject } from './recovery.js';
import { SessionRecoveryController } from './session-recovery.js';
import { createSurviveTogetherResult } from './survive-results.js';
import type { LocalSession, SessionModeDefinition, SessionRecoveryRequest } from './session.js';

class SurviveTogetherController {
  private session: LocalSession | undefined;
  private readonly recovery = new SessionRecoveryController(['personal', 'revival', 'flare']);
  attach(session: LocalSession): void { this.session = session; this.recovery.attach(session); session.installCoOpMarket(); session.installSharedWorldEffects(); }
  death(seat: string): void {
    const session = this.session, player = session?.players.find(candidate => candidate.seat === seat);
    if (!session || !player || !player.recovery || player.participation !== 'dead') return;
    session.clearConsumables(player.seat);
    this.recovery.death(seat);
  }
  pending(session: LocalSession): boolean { return this.recovery.pending(session); }
  tick(session: LocalSession): void {
    this.recovery.tick(session);
    const active = session.players.some(isLivingRecoverySubject);
    if (!active && !this.pending(session) && !session.result) session.completeResult(createSurviveTogetherResult({ time: session.world.time, distance: session.world.frontier, players: session.players, archived: session.contributions }));
  }
  recover(session: LocalSession, request: SessionRecoveryRequest): boolean { return this.recovery.recover(session, request); }
}

/** Compose recovery policy over either stored base definition without mode-name branches. */
export function createSurviveTogetherDefinition(base: ModeDefinition): SessionModeDefinition {
  const controller = new SurviveTogetherController();
  const handlers: SessionModeDefinition['handlers'] = {
    attach: (session: LocalSession) => controller.attach(session), join: () => {}, deviceLost: () => {}, reclaim: () => {}, depart: () => ({ releaseSeat: true }),
    death: record => controller.death(record.seat), progress: () => {}, result: () => {}, pending: (session: LocalSession) => controller.pending(session), tick: (session: LocalSession) => controller.tick(session), recover: (session: LocalSession, request: SessionRecoveryRequest) => controller.recover(session, request),
  };
  return Object.freeze({ definition: base, handlers: Object.freeze(handlers) });
}
