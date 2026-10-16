import type { SeatId, SessionParticipation, SessionResult, ParticipantInteractionEvent } from './session.js';
import type { RaceDescriptor, RaceStatus } from './race.js';

export interface RaceIdentity { readonly seat: SeatId; readonly participantId: string; readonly characterId: string; readonly marker: string }
export interface RaceParticipantRecord extends RaceIdentity {
  readonly generation: number; readonly lifecycle: SessionParticipation; readonly status: RaceStatus;
  readonly distance: number; readonly finishTick: number | null; readonly finishTime: number | null;
  readonly terminalTime: number; readonly terminalReason: string;
  readonly deaths: number; readonly selfRevives: number; readonly innateUses: number;
  readonly fogAttempted: number; readonly fogLanded: number; readonly fogSeconds: number;
  readonly mudCollected: number; readonly mudUsed: number; readonly mudReceived: number;
  readonly lanternCollected: number; readonly lanternUsed: number;
  readonly pickups: number; readonly coins: number; readonly wallet: number;
  readonly marketInteractions: number; readonly marketPurchases: number; readonly coinsSpent: number;
  readonly ghostSeconds: number; readonly interactions: readonly ParticipantInteractionEvent[];
}
export interface RaceParticipantResult extends RaceParticipantRecord { readonly rank: number | null; readonly rankLabel: string; readonly dnf: 'Down' | 'Forfeited' | 'Left' | null }
export interface RaceLedgerEvent extends RaceIdentity {
  readonly id: string; readonly generation: number; readonly kind: 'snapshot' | 'death' | 'departure';
  readonly reason: string; readonly tick: number; readonly time: number; readonly record: RaceParticipantRecord;
}
export type RaceLedgerWrite = Readonly<{ok:true}> | Readonly<{ok:false;reason:'terminal'|'duplicate'|'wrong-owner'|'stale'|'invalid'}>;
/** Copy plain result data before freezing: no reference back to mutable owners. */
function frozen<T>(value:T):T {
  if (Array.isArray(value)) return Object.freeze(value.map(frozen)) as T;
  if (value && typeof value==='object') return Object.freeze(Object.fromEntries(Object.entries(value).map(([key,item])=>[key,frozen(item)]))) as T;
  return value;
}
export function createRaceLedger(roster:readonly RaceIdentity[]) {
  const identities=frozen(roster), events:RaceLedgerEvent[]=[], latest=new Map<string,RaceParticipantRecord>(),seen=new Set<string>();
  let terminal=false;
  return {
    append(event:RaceLedgerEvent):RaceLedgerWrite {
      const reject=(reason:Extract<RaceLedgerWrite,{ok:false}>['reason']):RaceLedgerWrite=>Object.freeze({ok:false,reason});
      if(terminal)return reject('terminal');
      if(seen.has(event.id))return reject('duplicate');
      const identity=identities.find(p=>p.seat===event.seat&&p.participantId===event.participantId&&p.characterId===event.characterId&&p.marker===event.marker);
      if(!identity||event.record.participantId!==event.participantId||event.record.seat!==event.seat||event.record.characterId!==event.characterId)return reject('wrong-owner');
      const prior=latest.get(event.participantId), previous=[...events].reverse().find(e=>e.participantId===event.participantId);
      if(prior&&(event.generation<prior.generation||event.tick<(previous?.tick??0)||event.time<(previous?.time??0)))return reject('stale');
      if(!event.id||!Number.isSafeInteger(event.generation)||event.generation<0||event.record.generation!==event.generation||!Number.isSafeInteger(event.tick)||event.tick<0||!Number.isFinite(event.time)||event.time<0||Object.values(event.record).some(value=>typeof value==='number'&&(!Number.isFinite(value)||value<0)))return reject('invalid');
      const copy=frozen(event);events.push(copy);seen.add(event.id);latest.set(event.participantId,copy.record);return Object.freeze({ok:true});
    },
    snapshot(){return Object.freeze({events:Object.freeze([...events]),players:Object.freeze(identities.map(p=>latest.get(p.participantId)).filter((p):p is RaceParticipantRecord=>!!p)),terminal});},
    freeze(){terminal=true;},
  };
}
export type RaceLedger=ReturnType<typeof createRaceLedger>;
export interface RaceResult extends SessionResult {
  readonly mode:'race'; readonly outcome:'finish'|'time'|'eliminated'; readonly reason:string;
  readonly descriptor:RaceDescriptor; readonly course:Readonly<{level:string;mode:string}>;
  readonly tick:number; readonly elapsed:number; readonly leaderFrontier:number; readonly fogBoundary:number;
  readonly winners:readonly SeatId[]; readonly players:readonly RaceParticipantResult[]; readonly events:readonly RaceLedgerEvent[];
}
/** Competition positions count occupied places, never device/roster/character order. */
export function rankRaceParticipants(records:readonly RaceParticipantRecord[],timeout:boolean):readonly RaceParticipantResult[] {
  const eligible=(p:RaceParticipantRecord)=>p.finishTick!==null||timeout&&['active','disconnected-grace'].includes(p.status);
  const better=(a:RaceParticipantRecord,b:RaceParticipantRecord)=>a.finishTick!==null ? b.finishTick===null||a.finishTick<b.finishTick : b.finishTick===null&&a.distance>b.distance;
  return frozen(records.map(p=>{
    const rank=eligible(p)?1+records.filter(other=>eligible(other)&&better(other,p)).length:null;
    const ties=rank!==null&&records.filter(other=>eligible(other)&&!better(other,p)&&!better(p,other)).length>1;
    return {...p,rank,rankLabel:rank===null?'DNF':`${ties?'=':''}${rank}`,dnf:rank!==null?null:p.status==='forfeited'?'Forfeited':p.status==='departed'?'Left':'Down'};
  }));
}
const finalized=new WeakMap<RaceLedger,RaceResult>();
export function freezeRaceResult(ledger:RaceLedger,common:Omit<RaceResult,'players'|'events'|'winners'>):RaceResult {
  const existing=finalized.get(ledger);if(existing)return existing;
  const snapshot=ledger.snapshot(),players=rankRaceParticipants(snapshot.players,common.outcome==='time');
  const result=frozen({...common,players,events:snapshot.events,winners:players.filter(p=>p.rank===1).map(p=>p.seat)});
  ledger.freeze();finalized.set(ledger,result);return result;
}
