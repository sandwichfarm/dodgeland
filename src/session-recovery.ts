/** Opt-in session recovery transactions; mode ownership, items and results stay with callers. */
import { commitRecoveryPlan, isLivingRecoverySubject, planRecovery } from './recovery.js';
import type { RecoveryDecision, RecoveryKind, RecoveryPlan, RecoverySubject } from './recovery.js';
import type { LocalSession, SessionPlayer, SessionRecoveryRequest } from './session.js';

const OFFER_SECONDS = 8;
const PROTECTION_SECONDS = 2;

function subject(player: SessionPlayer): RecoverySubject {
  return Object.freeze({ seat: player.seat, participation: player.participation, state: player.state,
    deathGeneration: player.recovery?.deathGeneration ?? 0, offerGeneration: player.recovery?.offer?.generation,
    offerDeadline: player.recovery?.offer?.deadline, charged: player.recovery?.charge === 'available' });
}
function samePlan(left: RecoveryDecision, right: RecoveryPlan): boolean {
  return left.ok && left.kind === right.kind && left.tick === right.tick && left.ownerSeat === right.ownerSeat && left.placements.length === right.placements.length
    && left.placements.every((placement, index) => placement.seat === right.placements[index]!.seat && placement.deathGeneration === right.placements[index]!.deathGeneration && placement.cell.x === right.placements[index]!.cell.x && placement.cell.y === right.placements[index]!.cell.y);
}

export class SessionRecoveryController {
  constructor(private readonly allowed: readonly RecoveryKind[] = ['personal']) {}
  private session: LocalSession | undefined;
  attach(session: LocalSession): void { this.session = session; }
  death(seat: string): void {
    const session = this.session, player = session?.players.find(candidate => candidate.seat === seat);
    if (!session || !player || !player.recovery || player.participation !== 'dead') return;
    session.updateRecovery(player, recovery => {
      const deathGeneration = recovery.deathGeneration + 1;
      const offer = recovery.charge === 'available' ? Object.freeze({ generation: deathGeneration, deadline: session.world.time + OFFER_SECONDS * session.world.rules.simulation.worldTimeScale }) : undefined;
      return { ...recovery, deathGeneration, offer };
    });
  }
  pending(session: LocalSession): boolean {
    return session.players.some(player => {
      const recovery = player.recovery, offer = recovery?.offer;
      return player.participation === 'dead' && player.state === 'dead' && !!offer && offer.generation === recovery.deathGeneration && offer.deadline > session.world.time;
    });
  }
  tick(session: LocalSession): void {
    for (const player of session.players) {
      if (player.participation === 'active' && player.state === 'playing' && player.recovery && session.isRecoverySafePosition(player)) session.updateRecovery(player, recovery => ({ ...recovery, lastSafe: Object.freeze({ x: player.groundX, y: player.groundY }) }));
      if (player.recovery?.offer && player.recovery.offer.deadline <= session.world.time) session.updateRecovery(player, recovery => ({ ...recovery, offer: undefined }));
    }
  }
  recover(session: LocalSession, request: SessionRecoveryRequest): boolean {
    const owner = session.players.find(player => player.seat === request.ownerSeat);
    if (!owner || session.result || !this.allowed.includes(request.kind)) return false;
    const targets = request.kind === 'personal' ? [] : request.kind === 'revival'
      ? (request.targetSeat ? session.players.filter(player => player.seat === request.targetSeat) : [])
      : session.players.filter(player => player.participation === 'dead' && player.state === 'dead');
    const participants = request.kind === 'flare' ? session.players.filter(player => isLivingRecoverySubject(player) || (player.participation === 'dead' && player.state === 'dead')) : undefined;
    const makePlan = (): RecoveryDecision => planRecovery({ kind: request.kind, tick: session.world.simulationTick, now: session.world.time, owner: subject(owner),
      targets: targets.map(subject), participants: participants?.map(subject), cells: session.recoverySafeCells(request.kind, owner, request.kind === 'flare' ? participants ?? [] : targets), protectionSeconds: PROTECTION_SECONDS * session.world.rules.simulation.worldTimeScale });
    const decision = makePlan();
    if (!decision.ok || (request.kind !== 'personal' && !request.debit)) return false;
    return commitRecoveryPlan(decision, { valid: plan => samePlan(makePlan(), plan), debit: request.kind === 'personal' ? undefined : () => request.debit!(), apply: plan => this.apply(session, owner, request.kind, plan) });
  }
  private apply(session: LocalSession, owner: SessionPlayer, kind: RecoveryKind, plan: RecoveryPlan): void {
    const revived = new Set(plan.placements.map(placement => session.players.find(candidate => candidate.seat === placement.seat)).filter((player): player is SessionPlayer => !!player && player.participation === 'dead').map(player => player.seat));
    for (const placement of plan.placements) {
      const player = session.players.find(candidate => candidate.seat === placement.seat);
      if (!player || player.recovery?.deathGeneration !== placement.deathGeneration) return;
      player.x = player.fromX = placement.cell.x; player.y = player.fromY = placement.cell.y;
      player.maxY = Math.max(player.maxY, placement.cell.y); player.personalFrontierY = Math.max(player.personalFrontierY, placement.cell.y);
      session.cancelForwardHop(player); player.hop = 0; player.caughtByWave = false; player.powerRescue = null;
      if (revived.has(player.seat)) { player.health = player.maxHealth; player.hurtRemaining = 0; player.run.resumeAfterDeath(); }
      player.state = player.primary && session.world.host.state === 'paused' ? 'paused' : 'playing'; player.participation = 'active';
      session.updateRecovery(player, recovery => ({ ...recovery, offer: undefined, protectionUntil: plan.protectionUntil, lastSafe: Object.freeze({ ...placement.cell }), spatialFrontierY: Math.max(recovery.spatialFrontierY, placement.cell.y), charge: kind === 'personal' ? 'spent' : recovery.charge, nextRecharge: kind === 'personal' ? recovery.personalHighWater + 250 : recovery.nextRecharge }));
    }
    if (kind === 'personal') owner.statistics.selfRevives++;
    else { owner.statistics.teammateRevives += revived.size; owner.statistics.itemsUsed++; }
  }
}

