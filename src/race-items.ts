import { validateConsumableCatalogue } from './consumables.js';
import type { ConsumableId } from './consumables.js';
import { registerConsumableSchema } from './consumable-drops.js';
import type { ConsumableAction, ConsumableWorldPolicy, SeatId, SessionPlayer } from './session.js';
import type { RaceCoordinator } from './race.js';

export const RACE_ITEM_SCHEMA = 'race-item-schema-1' as const;
export const RACE_ITEMS = validateConsumableCatalogue([
  {id:'mud-splash',kind:'consumable',name:'Mud Splash',appearance:{color:'#a16b46',shape:'low'},cue:'splash',price:30,maxCharges:1,requiredCapability:'race-tactics',targetPolicy:'living-opponent'},
  {id:'fog-lantern',kind:'consumable',name:'Fog Lantern',appearance:{color:'#e8b75b',shape:'lantern'},cue:'coin',price:30,maxCharges:1,requiredCapability:'race-tactics',targetPolicy:'living-self'},
]);
export const MUD_SPLASH = RACE_ITEMS[0]!;
export const FOG_LANTERN = RACE_ITEMS[1]!;
export const RACE_DROP_SCHEMA = registerConsumableSchema({version:RACE_ITEM_SCHEMA,buckets:1250,salt:0x51a7e101,items:{0:'mud-splash',1:'fog-lantern'}});
export type RaceItemPlan = Readonly<{ok:true;action:ConsumableAction}> | Readonly<{ok:false;reason:string}>;

/** Race supplies target/effect policy only. The common world owns every charge and use event. */
export class RaceItems {
  readonly catalogue = RACE_ITEMS;
  constructor(private readonly race: RaceCoordinator) {}
  eligible(player: SessionPlayer): boolean {
    return !this.race.result && this.race.status(player.seat)==='active' && player.participation==='active'
      && (player.state==='playing'||player.state==='paused') && !player.powerRescue && player.run.effects.shield<=0
      && (player.recovery?.protectionUntil??0)<=this.race.session.world.time;
  }
  private valid(action: ConsumableAction): readonly SessionPlayer[] | undefined {
    const session=this.race.session, owner=session.players.find(p=>p.seat===action.ownerSeat), target=session.players.find(p=>p.seat===action.targetSeat);
    if(!owner||!this.eligible(owner)||action.expectedParticipantId!==owner.participantId||action.expectedDevice!==owner.device||action.expectedLifecycleGeneration!==session.lifecycle.length||action.expectedContext!==this.race.generation)return;
    const charge=session.consumableSnapshot()?.charges.find(c=>c.seat===owner.seat);
    if(!charge||charge.ownerGeneration!==action.expectedOwnerGeneration||charge.inventoryGeneration!==action.expectedInventoryGeneration||charge[action.itemId]!==1)return;
    if(action.itemId==='mud-splash'){
      if(!target||target===owner||!this.eligible(target)||action.expectedTargetParticipantId!==target.participantId||action.expectedTargetDeathGeneration!==target.recovery?.deathGeneration||Math.abs(target.groundY-owner.groundY)>16||target.hopCooldown.multiplier>1)return;
      return [target];
    }
    if(action.itemId==='fog-lantern'&&action.targetSeat===owner.seat&&action.expectedTargetParticipantId===owner.participantId&&this.race.fogState(owner.seat).protectionUntil<=this.race.elapsed)return [owner];
  }
  plan(ownerSeat:SeatId,itemId:ConsumableId,targetSeat?:SeatId):RaceItemPlan {
    const session=this.race.session,owner=session.players.find(p=>p.seat===ownerSeat),charge=session.consumableSnapshot()?.charges.find(c=>c.seat===ownerSeat);
    const target=session.players.find(p=>p.seat===(itemId==='fog-lantern'?ownerSeat:targetSeat));
    if(!owner||!charge)return Object.freeze({ok:false,reason:'unavailable-owner'});
    const action:ConsumableAction=Object.freeze({actionId:`item-${ownerSeat}-${charge.inventoryGeneration}-${itemId}`,ownerSeat,itemId,targetSeat:target?.seat,expectedOwnerGeneration:charge.ownerGeneration,expectedInventoryGeneration:charge.inventoryGeneration,expectedParticipantId:owner.participantId,expectedDevice:owner.device,expectedTargetParticipantId:target?.participantId,expectedTargetDeathGeneration:target?.recovery?.deathGeneration,expectedLifecycleGeneration:session.lifecycle.length,expectedContext:this.race.generation});
    return this.valid(action)?Object.freeze({ok:true,action}):Object.freeze({ok:false,reason:'ineligible-item-or-target'});
  }
  commit(plan:RaceItemPlan):boolean { return plan.ok && this.race.session.useConsumable(plan.action); }
  policy():ConsumableWorldPolicy {
    return {catalogue:this.catalogue,schema:RACE_DROP_SCHEMA,capabilities:['race-tactics'],eligible:p=>this.eligible(p),activate:(action,_owner,debit)=>{
      const targets=this.valid(action);if(!targets)return false;
      // No callback, await or observation can intervene between validation,
      // the common debit and these validated non-failing local assignments.
      if(!debit(targets))return false;
      if(action.itemId==='mud-splash')targets[0]!.setHopCooldown(1.35,2);
      else this.race.protectFog(action.ownerSeat,3);
      return true;
    }};
  }
}
