import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';
const sources = await loadSources(['game','session','session-recovery']); after(sources.dispose);
const { Game } = await sources.import('game');
const { LocalSession, composeSessionModeDefinition } = await sources.import('session');
const { SessionRecoveryController } = await sources.import('session-recovery');
function setup(enabled=true) {
  const game=new Game(113,'pond','arcade',false,[],'butter'), recovery=new SessionRecoveryController();
  const session=LocalSession.stage(game,{primaryDevice:'gamepad-0',roster:[{seat:'p2',device:'gamepad-1',characterId:'pip'}],mode:composeSessionModeDefinition(game.definition,{
    suppressPursuit:true,retainDeadDevice:enabled,attach:s=>recovery.attach(s),death:e=>recovery.death(e.seat),tick:s=>recovery.tick(s),pending:s=>recovery.pending(s),
  })}).commit(); return {game,session};
}
function resources(p){return {health:p.health,state:p.state,participation:p.participation,wallet:p.run.wallet,deaths:p.statistics.deaths,
  offer:p.recovery.offer,charge:p.recovery.charge,protection:p.recovery.protectionUntil,score:p.personalScore,completed:p.completedForwardTiles};}
test('opt-in dead device lifecycle rebind preserves recovery and accounts exactly one absence',()=>{
  const {game,session}=setup(); game.run.creditCoins(17); game.end('Actual fatality','train'); session.update(1/120);
  const p=session.players[0],before=resources(p),other=resources(session.players[1]);
  assert.equal(session.deviceLost('p1'),true); const token=session.deviceReclaimToken('p1');
  assert.equal(session.deviceLost('p1'),false); for(let i=0;i<120;i++)session.update(1/120);
  const duration=session.world.time-p.deviceLostAt;
  assert.equal(session.reclaim('p1','gamepad-9',token),true);
  assert.deepEqual(resources(p),before); assert.deepEqual(resources(session.players[1]),other);
  assert.equal(p.device,'gamepad-9');assert.ok(p.recovery.aliases.includes('device:gamepad-9'));
  assert.equal(p.statistics.deviceLostDuration,duration);assert.equal(p.deviceLostAt,null);
  assert.equal(session.reclaim('p1','gamepad-9',token),false);
  assert.deepEqual(session.lifecycle.slice(-2).map(e=>[e.type,e.previous,e.next]),[['device-lost','dead','dead'],['reclaimed','dead','dead']]);
});
test('dead device rebind rejects stale, wrong, occupied and missing tokens atomically',()=>{
  const {game,session}=setup();game.end('Actual fatality','train');session.update(1/120);session.deviceLost('p1');
  const p=session.players[0],token=session.deviceReclaimToken('p1');
  const snapshot=()=>JSON.stringify({resources:resources(p),recovery:p.recovery,device:p.device,stats:p.statistics,events:session.lifecycle});
  for(const [seat,device,ticket] of [['p1','gamepad-9',undefined],['p2','gamepad-9',token],['p1','gamepad-1',token],['p1','bad-device',token],['p1','gamepad-9',{...token,participantId:'wrong'}],['p1','gamepad-9',{...token,generation:token.generation-1}]]){
    const before=snapshot();assert.equal(session.reclaim(seat,device,ticket),false);assert.equal(snapshot(),before);
  }
  session.offerReclaim('p1','gamepad-9');const before=snapshot();assert.equal(session.reclaim('p1','gamepad-9',token),false);assert.equal(snapshot(),before);
  assert.equal(session.reclaim('p1','gamepad-9',session.deviceReclaimToken('p1')),true);
});
test('legacy dead-device defaults and active-device reclaim remain unchanged',()=>{
  const {game,session}=setup(false);game.end('Actual fatality','train');session.update(1/120);
  assert.equal(session.deviceLost('p1'),false);assert.equal(session.reclaim('p1','gamepad-9'),false);
  assert.equal(session.deviceLost('p2'),true);assert.equal(session.reclaim('p2','gamepad-1'),true);assert.equal(session.players[1].participation,'active');
  assert.throws(()=>composeSessionModeDefinition(game.definition,{retainDeadDevice:'yes'}));
});
test('secondary dead-device rebind does not redirect the primary facade',()=>{
  const {game,session}=setup();const primary=session.players[0],secondary=session.players[1];
  session.damage('p2',{cause:'train',amount:3,reason:'Actual secondary fatality'});
  const before=resources(primary),offer=secondary.recovery.offer;
  assert.equal(session.deviceLost('p2'),true);assert.equal(session.reclaim('p2','gamepad-9',session.deviceReclaimToken('p2')),true);
  assert.deepEqual(resources(primary),before);assert.equal(game.health,primary.health);assert.equal(secondary.participation,'dead');assert.deepEqual(secondary.recovery.offer,offer);
});
