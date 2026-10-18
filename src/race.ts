import { createRaceLedger, freezeRaceResult } from './race-results.js';
import type { RaceLedger, RaceParticipantRecord, RaceResult } from './race-results.js';
export type { RaceResult } from './race-results.js';
import { RaceItems, RACE_ITEM_SCHEMA } from './race-items.js';
import { CHARACTERS } from './content.js';
import type { Game } from './game.js';
import type { ModeDefinition } from './mode-rules.js';
import { composeSessionModeDefinition, LocalSession } from './session.js';
import type { DeviceId, DeviceReclaimToken, SeatId, SessionModeDefinition, SessionLifecycleRecord, SessionRecoveryRequest } from './session.js';
import { SessionRecoveryController } from './session-recovery.js';
import type { RunSeed } from './run-seed.js';

export const RACE_DEFAULTS = Object.freeze({ finishTiles: 500, activeSeconds: 180 });
export const RACE_PRESSURE = Object.freeze({ version: 'race-pressure-1', buffer: 12, interval: 1, damage: 1 });
export interface RaceFogState { readonly exposure: number; readonly seconds: number; readonly attempts: number; readonly landed: number; readonly protectionUntil: number }
export interface RaceMovement { readonly tick: number; readonly seat: SeatId; readonly earned: number }
export type RaceStatus = 'active' | 'finished' | 'eliminated' | 'recovery-offered' | 'disconnected-grace' | 'forfeited' | 'departed';
export interface RaceActionToken { readonly seat: SeatId; readonly participantId: string; readonly generation: number; readonly lifecycle: number }
export interface RaceLifecycleEvent { readonly seat: SeatId; readonly state: RaceStatus; readonly reason: string; readonly tick: number; readonly time: number }
export interface RaceSettings { readonly finishTiles: number; readonly activeSeconds: number }
export interface RaceSeat { readonly seat: SeatId; readonly characterId: string; readonly device: DeviceId; readonly disconnected?: boolean }
export interface RaceProposal { readonly seats: readonly RaceSeat[]; readonly finishTiles?: number | string; readonly activeSeconds?: number | string }
export interface RaceSetup { readonly seats: readonly RaceSeat[]; readonly settings: RaceSettings }
export interface RaceDescriptor extends RaceSetup { readonly seed: number; readonly seedCode: string | null; readonly runSeed: RunSeed | null; readonly schema: 'race-1'; readonly itemVersion: typeof RACE_ITEM_SCHEMA; readonly pressure: typeof RACE_PRESSURE }


function integer(value: unknown, fallback: number, min: number, max: number, message: string): number {
  const candidate = value === undefined ? fallback : value;
  if ((typeof candidate !== 'number' && typeof candidate !== 'string') || !/^[1-9]\d*$/.test(String(candidate)) || !Number.isSafeInteger(Number(candidate)) || Number(candidate) < min || Number(candidate) > max) throw new RangeError(message);
  return Number(candidate);
}
export function validateRaceSetup(proposal: RaceProposal): RaceSetup {
  if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal) || Object.keys(proposal).some(key => !['seats', 'finishTiles', 'activeSeconds'].includes(key))) throw new TypeError('Unknown Race setting.');
  const settings = Object.freeze({
    finishTiles: integer(proposal.finishTiles, 500, 1, 9999, 'Choose 1–9999 whole finish tiles.'),
    activeSeconds: integer(proposal.activeSeconds, 180, 30, 3600, 'Choose 30–3600 whole seconds.'),
  });
  const seats = proposal.seats;
  if (Array.isArray(seats) && seats.some(p => p && (typeof p.device !== 'string' || typeof p.characterId !== 'string' || (p.disconnected !== undefined && typeof p.disconnected !== 'boolean')))) throw new TypeError('Choose two to four ready players with different devices.');
  if (!Array.isArray(seats) || seats.length < 2 || seats.length > 4 || !seats.some(p => p?.seat === 'p1') || seats.some(p => !p || Object.keys(p).some(key => !['seat', 'device', 'characterId', 'disconnected'].includes(key)) || !['p1','p2','p3','p4'].includes(p.seat) || p.disconnected || !/^(keyboard-[ab]|gamepad-(?:0|[1-9]\d*))$/.test(p.device) || !CHARACTERS.some(c => c.id === p.characterId)) || new Set(seats.map(p => p.seat)).size !== seats.length || new Set(seats.map(p => p.device)).size !== seats.length) throw new TypeError('Choose two to four ready players with different devices.');
  for (const seat of seats) { const first = seats.find(p => p.characterId === seat.characterId)!; if (first !== seat) throw new TypeError(`Already chosen by ${first.seat.toUpperCase()}.`); }
  return Object.freeze({ settings, seats: Object.freeze([...seats].sort((a,b) => a.seat.localeCompare(b.seat)).map(p => Object.freeze({ seat: p.seat, characterId: p.characterId, device: p.device }))) });
}

export class RaceCoordinator {
  private attached?: LocalSession;
  private ledger!: RaceLedger;
  private readonly finishTimes = new Map<SeatId, number>();
  private readonly resultSignatures = new Map<SeatId, string>();
  private recordSequence = 0;
  get history() { return this.ledger.snapshot(); }
  private origin = 0;
  private readonly finishTicks = new Map<SeatId, number>();
  private readonly movements: RaceMovement[] = [];
  private readonly earned = new Map<SeatId, number>();
  private readonly fog = new Map<SeatId, RaceFogState>();
  private lastTime = 0;
  private revision = 0;
  private readonly forfeited = new Set<SeatId>();
  private readonly transitions: RaceLifecycleEvent[] = [];
  private readonly observed = new Map<SeatId, RaceStatus>();
  private authorizedRebind?: { seat: SeatId; device: DeviceId };
  private readonly placements = new Map<SeatId, Readonly<{x:number;y:number}>>();
  private leaving?: SeatId;
  get events(): readonly RaceLifecycleEvent[] { return Object.freeze([...this.transitions]); }
  get confirmingLeave(): SeatId | undefined { return this.leaving; }
  get generation(): string { return `${this.revision}:${this.session.lifecycle.length}`; }
  status(seat: SeatId): RaceStatus {
    const p=this.session.players.find(p=>p.seat===seat);
    if(this.forfeited.has(seat))return 'forfeited';
    if(!p || p.participation==='departed')return 'departed';
    if(this.isFinished(seat))return 'finished';
    if(p.deviceLostAt!==null)return 'disconnected-grace';
    if(p.participation==='dead')return p.recovery?.offer && p.recovery.offer.deadline>this.session.world.time?'recovery-offered':'eliminated';
    return 'active';
  }
  graceRemaining(seat:SeatId):number {
    const p=this.session.players.find(p=>p.seat===seat);
    return p?.deviceLostAt==null?0:Math.max(0,12-(this.session.world.time-p.deviceLostAt)/this.session.world.rules.simulation.worldTimeScale);
  }
  get waiting():boolean {
    return !this.result && this.session.players.some(p=>this.status(p.seat)==='disconnected-grace') && !this.session.players.some(p=>['active','recovery-offered'].includes(this.status(p.seat)));
  }
  actionToken(seat:SeatId):RaceActionToken {return Object.freeze({seat,participantId:this.session.players.find(p=>p.seat===seat)?.participantId??'',generation:this.revision,lifecycle:this.session.lifecycle.length});}
  command(token:RaceActionToken,kind:'leave'|'cancel'|'confirm'):boolean {
    const current=this.actionToken(token.seat),p=this.session.players.find(p=>p.seat===token.seat);
    if(this.result||!p||p.deviceLostAt!==null||['departed','forfeited','finished'].includes(this.status(token.seat))||token.participantId!==current.participantId||token.generation!==current.generation||token.lifecycle!==current.lifecycle)return false;
    if(kind==='leave'){this.leaving=token.seat;this.revision++;return true;}
    if(this.leaving!==token.seat)return false;
    this.leaving=undefined;this.revision++;
    if(kind==='confirm'){this.session.depart(token.seat,'confirmed-leave');this.tick(this.session);}
    return true;
  }
  reclaimToken(seat:SeatId):DeviceReclaimToken|undefined { return this.graceRemaining(seat)>1e-9?this.session.deviceReclaimToken(seat):undefined; }
  reclaim(token:DeviceReclaimToken|undefined,device:DeviceId):boolean {
    if(!token||this.result||this.graceRemaining(token.seat)<=1e-9)return false;
    this.authorizedRebind={seat:token.seat,device};
    try{return this.session.reclaim(token.seat,device,token);}finally{this.authorizedRebind=undefined;}
  }
  private safeReturn(seat:SeatId):Readonly<{x:number;y:number}>|undefined {
    const p=this.session.players.find(p=>p.seat===seat);if(!p)return;
    const top=Math.min(Math.floor(p.groundY),Math.floor(p.earnedDistance));
    const occupied=this.session.players.filter(q=>q!==p&&q.participation==='active');
    for(let y=top;y>=top-2;y--)for(const offset of [0,-1,1,-2,2,-3,3,-4,4]){
      const cell={x:Math.round(p.groundX)+offset,y};
      if(!occupied.some(q=>Math.hypot(q.groundX-cell.x,q.groundY-y)<.7)&&this.session.isSafeCell(cell))return Object.freeze(cell);
    }
  }
  allowsLifecycle(kind:string,seat:SeatId,device?:DeviceId):boolean {
    const p=this.session.players.find(p=>p.seat===seat);
    if(this.result||!p||['departed','forfeited','finished'].includes(this.status(seat)))return false;
    if(kind==='reclaimed'||kind==='reclaim-offered'){
      if(this.graceRemaining(seat)<=1e-9||!device|| (device!==p.device && !(this.authorizedRebind?.seat===seat&&this.authorizedRebind.device===device)))return false;
      if(kind==='reclaimed'&&p.state!=='dead'){const cell=this.safeReturn(seat);if(!cell)return false;this.placements.set(seat,cell);}
    }
    return true;
  }
  lifecycle(record:SessionLifecycleRecord):void {
    if(record.type==='departed'){
      if(record.cause==='grace-expired')this.forfeited.add(record.seat);
      const p=this.session.players.find(p=>p.seat===record.seat)!;this.session.updateRecovery(p,r=>({...r,offer:undefined}));
    }
    if(record.type==='reclaimed'){
      const cell=this.placements.get(record.seat),p=this.session.players.find(p=>p.seat===record.seat)!;
      if(cell){const idle=p.idle;this.session.placeTurnPosition(record.seat,cell);p.idle=idle;this.placements.delete(record.seat);}
    }
    if(this.leaving===record.seat){this.leaving=undefined;this.revision++;}
    this.record(record.seat,record.cause);
  }
  private record(seat:SeatId,reason:string):void {const state=this.status(seat);this.observed.set(seat,state);this.transitions.push(Object.freeze({seat,state,reason,tick:this.session.world.simulationTick,time:this.elapsed}));this.revision++;}
  recover(request:SessionRecoveryRequest):boolean {
    const p=this.session.players.find(p=>p.seat===request.ownerSeat);
    if(!p||p.deviceLostAt!==null||this.status(p.seat)!=='recovery-offered')return false;
    const ok=this.recovery.recover(this.session,request);if(ok)this.record(p.seat,'personal-recovery');return ok;
  }
  private readonly closures: Readonly<{ seat: SeatId; tick: number; reason: 'race-timeout' }>[] = [];
  get recoveryClosures(): readonly Readonly<{ seat: SeatId; tick: number; reason: 'race-timeout' }>[] { return Object.freeze([...this.closures]); }
  leaderFrontier = 0;
  fogBoundary = -RACE_PRESSURE.buffer;
  get movementLedger(): readonly RaceMovement[] { return Object.freeze([...this.movements]); }
  fogState(seat: SeatId): RaceFogState { return this.fog.get(seat) ?? Object.freeze({ exposure: 0, seconds: 0, attempts: 0, landed: 0, protectionUntil: 0 }); }
  /** Defensive effect policy; item validation/debit remains with its transaction. */
  protectFog(seat: SeatId, seconds: number): boolean {
    const player = this.session.players.find(p => p.seat === seat);
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 10 || this.result || !player || player.participation !== 'active' || (player.state !== 'playing' && player.state !== 'paused') || this.isFinished(seat)) return false;
    this.fog.set(seat, Object.freeze({ ...this.fogState(seat), exposure: 0, protectionUntil: this.elapsed + seconds })); return true;
  }
  readonly items = new RaceItems(this);
  readonly recovery = new SessionRecoveryController();
  constructor(readonly descriptor: RaceDescriptor) {}
  get session(): LocalSession { if (!this.attached) throw new Error('Race has not started.'); return this.attached; }
  get result(): RaceResult | undefined { return this.session.result as RaceResult | undefined; }
  get elapsed(): number { return this.result?.elapsed ?? Math.max(0, (this.session.world.time - this.origin) / this.session.world.rules.simulation.worldTimeScale); }
  attach(session: LocalSession): void { this.attached = session; this.origin = this.lastTime = session.world.time; this.recovery.attach(session); for (const p of session.players) p.run.restrictItems('appearance-only'); session.installConsumableWorld(this.items.policy()); session.installCoOpMarket({consumables:true,name:'Race',capabilities:['race-tactics'],closeOnInvalidate:true}); this.ledger=createRaceLedger(session.players.map(p=>({seat:p.seat,participantId:p.participantId,characterId:p.characterId,marker:p.marker}))); this.capture(); }
  capture(seat?:SeatId,kind:'snapshot'|'death'|'departure'='snapshot',reason=''):void {
    if(this.result)return;
    const all=this.session.players.flatMap(p=>p.interactions);
    for(const p of this.session.players.filter(p=>!seat||p.seat===seat)) {
      const interactions=p.interactions, fog=this.fogState(p.seat), status=this.status(p.seat);
      const last=[...this.transitions].reverse().find(e=>e.seat===p.seat);
      const record:RaceParticipantRecord={seat:p.seat,participantId:p.participantId,characterId:p.characterId,marker:p.marker,generation:p.recovery?.deathGeneration??0,lifecycle:p.participation,status,
        distance:p.completedForwardTiles,finishTick:this.finishTick(p.seat)??null,finishTime:this.finishTimes.get(p.seat)??null,
        terminalTime:this.finishTimes.get(p.seat)??(['departed','forfeited','eliminated'].includes(status)?last?.time??this.elapsed:this.elapsed),terminalReason:['finished','departed','forfeited','eliminated'].includes(status)?last?.reason||status:reason||last?.reason||status,
        deaths:p.statistics.deaths,selfRevives:p.statistics.selfRevives,innateUses:p.statistics.innateUses,
        fogAttempted:fog.attempts,fogLanded:fog.landed,fogSeconds:fog.seconds,
        mudCollected:interactions.filter(e=>e.kind==='collection'&&e.itemId==='mud-splash').length,mudUsed:interactions.filter(e=>e.kind==='item-use'&&e.itemId==='mud-splash').length,
        mudReceived:all.filter(e=>e.kind==='item-use'&&e.itemId==='mud-splash'&&e.targets.some(t=>t.participantId===p.participantId)).length,
        lanternCollected:interactions.filter(e=>e.kind==='collection'&&e.itemId==='fog-lantern').length,lanternUsed:interactions.filter(e=>e.kind==='item-use'&&e.itemId==='fog-lantern').length,
        pickups:p.statistics.pickups,coins:p.coins,wallet:p.run.wallet,marketInteractions:p.statistics.marketInteractions,marketPurchases:p.statistics.marketPurchases,coinsSpent:p.statistics.coinsSpent,
        ghostSeconds:(p.statistics.deviceLostDuration+(p.deviceLostAt===null?0:this.session.world.time-p.deviceLostAt))/this.session.world.rules.simulation.worldTimeScale,interactions};
      const signature=JSON.stringify({...record,terminalTime:0});
      if(kind==='snapshot'&&!reason&&this.resultSignatures.get(p.seat)===signature)continue;
      const write=this.ledger.append({seat:p.seat,participantId:p.participantId,characterId:p.characterId,marker:p.marker,generation:record.generation,id:`race-${++this.recordSequence}`,kind,reason:reason||status,tick:this.session.world.simulationTick,time:this.elapsed,record});
      if(!write.ok)throw new Error(`Race history rejected: ${write.reason}`);
      this.resultSignatures.set(p.seat,signature);
    }
  }
  isFinished(seat: SeatId): boolean { return this.finishTicks.has(seat); }
  finishTick(seat: SeatId): number | undefined { return this.finishTicks.get(seat); }
  tick(session: LocalSession): void {
    if (session.result) return;
    const dt = Math.max(0, (session.world.time - this.lastTime) / session.world.rules.simulation.worldTimeScale);
    this.lastTime = session.world.time;
    // Accepted personal movement survives same-tick death; forced spatial
    // placement never enters this feed. Stable seat sorting is observational.
    for (const player of [...session.players].sort((a,b) => a.seat.localeCompare(b.seat))) {
      if (player.earnedDistance <= (this.earned.get(player.seat) ?? 0)) continue;
      this.earned.set(player.seat, player.earnedDistance);
      this.movements.push(Object.freeze({ tick: session.world.simulationTick, seat: player.seat, earned: player.earnedDistance }));
      this.leaderFrontier = Math.max(this.leaderFrontier, player.earnedDistance);
    }
    this.recovery.tick(session);
    for(const p of [...session.players].sort((a,b)=>a.seat.localeCompare(b.seat)))if(p.deviceLostAt!==null&&this.graceRemaining(p.seat)<=1e-9)session.depart(p.seat,'grace-expired');
    const finishers = session.players.filter(p => p.participation === 'active' && p.state === 'playing' && p.completedForwardTiles >= this.descriptor.settings.finishTiles);
    for (const player of finishers) if (!this.finishTicks.has(player.seat)) { this.finishTicks.set(player.seat, session.world.simulationTick); this.finishTimes.set(player.seat,this.elapsed); }
    for(const p of [...session.players].sort((a,b)=>a.seat.localeCompare(b.seat)))if(this.observed.get(p.seat)!==this.status(p.seat))this.record(p.seat,this.status(p.seat));
    this.fogBoundary = Math.max(this.fogBoundary, this.leaderFrontier - RACE_PRESSURE.buffer);
    for (const player of [...session.players].sort((a,b) => a.seat.localeCompare(b.seat))) {
      const previous = this.fogState(player.seat);
      if (player.participation !== 'active' || player.state !== 'playing' || this.isFinished(player.seat)) continue;
      const exposed = player.participation === 'active' && player.state === 'playing' && !this.isFinished(player.seat)
        && player.groundY < this.fogBoundary && (player.recovery?.protectionUntil ?? 0) <= session.world.time && previous.protectionUntil <= this.elapsed;
      let exposure = exposed ? previous.exposure + dt : 0, attempts = previous.attempts, landed = previous.landed;
      while (exposure + 1e-9 >= RACE_PRESSURE.interval) {
        exposure = Math.max(0, exposure - RACE_PRESSURE.interval); attempts++;
        landed += session.damage(player.seat, { cause: 'fog', amount: RACE_PRESSURE.damage, reason: 'The fog took your last feather.' }).landed;
        if (player.state !== 'playing') { exposure = 0; break; }
      }
      this.fog.set(player.seat, Object.freeze({ ...previous, exposure, seconds: previous.seconds + (exposed ? dt : 0), attempts, landed }));
    }
    const allFinished = session.players.every(p => this.isFinished(p.seat));
    const timeout = this.elapsed + 1e-9 >= this.descriptor.settings.activeSeconds;
    if (timeout) for (const player of [...session.players].sort((a,b) => a.seat.localeCompare(b.seat))) {
      if (!player.recovery?.offer) continue;
      session.updateRecovery(player, recovery => ({ ...recovery, offer: undefined }));
      this.closures.push(Object.freeze({ seat: player.seat, tick: session.world.simulationTick, reason: 'race-timeout' }));
    }
    const remaining = session.players.some(p => !this.isFinished(p.seat) && (p.deviceLostAt!==null || p.participation === 'active' && (p.state === 'playing'||p.state==='paused')));
    this.capture();
    if (!allFinished && !timeout && (remaining || this.recovery.pending(session))) return;
    const outcome = allFinished || !remaining && this.finishTicks.size && !this.recovery.pending(session) ? 'finish' : timeout ? 'time' : 'eliminated';
    this.capture(undefined,'snapshot',outcome);
    session.completeResult(freezeRaceResult(this.ledger,{mode:'race',outcome,reason:outcome,descriptor:this.descriptor,course:{level:session.world.host.home,mode:session.world.host.mode},tick:session.world.simulationTick,elapsed:this.elapsed,leaderFrontier:this.leaderFrontier,fogBoundary:this.fogBoundary}));
  }
}

export function composeRaceDefinition(base: ModeDefinition, race: RaceCoordinator): SessionModeDefinition {
  return composeSessionModeDefinition(base, {
    beforeDeath: (observation,cause)=>race.capture(observation.seat,'death',cause),
    beforeDepart: observation=>race.capture(observation.seat,'departure','departure'),
    suppressPursuit: true,
    retainDeadDevice: true,
    attach: session => race.attach(session), canAdmit: () => false,
    canAct: seat => !race.result && !race.isFinished(seat), canTransact: seat => {const p=race.session.players.find(p=>p.seat===seat);return !!p&&race.items.eligible(p);}, canAdvance: () => !race.result && !race.waiting && !race.confirmingLeave,
    simulates: player => !race.isFinished(player.seat),
    retainsPosition: player => race.status(player.seat)==='disconnected-grace' && player.state!=='dead',
    canLifecycle: (kind, seat, device) => race.allowsLifecycle(kind,seat,device),
    preserveReclaimPosition: true,
    deviceLost: record=>race.lifecycle(record),reclaim: record=>race.lifecycle(record),
    depart: record => {race.lifecycle(record);return { archiveContribution: true };},
    death: record => {race.session.clearConsumables(record.seat);race.recovery.death(record.seat);race.lifecycle(record);},
    pending: session => race.recovery.pending(session), recover: (_session, request) => race.recover(request),
    tick: session => race.tick(session),
  });
}
export function createRaceSession(game: Game, proposal: RaceProposal): RaceCoordinator {
  const setup = validateRaceSetup(proposal);
  if (game.state !== 'ready') throw new TypeError('Race starts from a fresh ready course.');
  const descriptor: RaceDescriptor = Object.freeze({ ...setup, seed: game.world.seed, seedCode: game.world.seedCode, runSeed: game.runSeed ? Object.freeze({ ...game.runSeed }) : null, schema: 'race-1', itemVersion: RACE_ITEM_SCHEMA, pressure: RACE_PRESSURE });
  const race = new RaceCoordinator(descriptor), primary = setup.seats.find(p => p.seat === 'p1')!;
  const original = game.characterId;
  try {
    game.setCharacter(primary.characterId);
    LocalSession.stage(game, { primaryDevice: primary.device, roster: setup.seats.filter((p): p is RaceSeat & { seat: Exclude<SeatId,'p1'> } => p.seat !== 'p1'), mode: composeRaceDefinition(game.definition, race) }).commit();
  } catch (error) { game.setCharacter(original); throw error; }
  return race;
}
