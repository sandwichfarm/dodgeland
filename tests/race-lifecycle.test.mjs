import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'race', 'session-input']);
after(sources.dispose);
const { Game } = await sources.import('game');
const { createRaceSession } = await sources.import('race');
const { GamepadRouter } = await sources.import('session-input');
function ticks(session,n) { for(let i=0;i<n;i++) session.update(1/120); }
function start() {
  const game = new Game(113, 'pond', 'arcade', false, [], 'butter');
  const race = createRaceSession(game, { seats: [
    { seat: 'p1', characterId: 'butter', device: 'gamepad-0' },
    { seat: 'p2', characterId: 'pip', device: 'gamepad-1' },
  ] });
  return { game, race, session: race.session };
}

test('disconnect dependency control: living ghost preserves its economy and another racer advances the clock', () => {
  const { race, session } = start();
  const owner = session.players[0]; owner.run.creditCoins(17);
  const before = { wallet: owner.run.wallet, health: owner.health, deaths: owner.statistics.deaths, recovery: owner.recovery };
  assert.equal(session.deviceLost('p1'), true);
  session.update(1 / 120);
  assert.equal(owner.participation, 'device-lost'); assert.ok(race.elapsed > 0);
  assert.deepEqual({ wallet: owner.run.wallet, health: owner.health, deaths: owner.statistics.deaths, recovery: owner.recovery }, before);
});

const pad=(index,pressed=[],id=`pad-${index}`)=>({index,id,mapping:'standard',connected:true,timestamp:1,axes:[0,0],buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i),value:pressed.includes(i)?1:0,touched:pressed.includes(i)}))});
test('replacement router requires fresh neutral and stable lease/context; held input never hops',()=>{
  const {race,session}=start(),devices=new Map();let count=0;
  const router=new GamepadRouter({context:()=>race.generation,dispatch:a=>session.dispatch(a),acceptsDevice:()=>false,
    replacementSeat:()=>race.status('p1')==='disconnected-grace'?'p1':undefined,
    lifecycle:e=>{if(e.type==='seen')devices.set(e.device.index,e.device);if(e.type==='disconnected'&&e.seat)session.deviceLost(e.seat);},
    requestReclaim:(d,seat,input)=>{if(input.actions.includes('confirm')&&router.canReclaim(d,seat)&&race.reclaim(race.reclaimToken(seat),d.deviceId)){assert.equal(router.reclaim(d),true);count++;}},
  });
  const send=pads=>router.receive({available:true,focused:true,pads},0);
  send([pad(0),pad(1)]);router.assign(devices.get(0),'p1');router.assign(devices.get(1),'p2');
  const stale=devices.get(0);send([pad(1)]);send([pad(9,[12]),pad(1)]);send([pad(9,[12,0]),pad(1)]);assert.equal(count,0);
  send([pad(9),pad(1)]);send([pad(9,[0]),pad(1)]);assert.equal(count,1);assert.equal(router.canReclaim(stale,'p1'),false);
  send([pad(9,[0]),pad(1)]);router.update(10000);assert.equal(session.players[0].earnedDistance,0);
  send([pad(0),pad(9,[0]),pad(1)]);send([pad(0,[0]),pad(9,[0]),pad(1)]);assert.equal(count,1,'old hardware cannot steal its replaced seat');
  router.close();
});

test('grace deadline expires at twelve active seconds and preserves ghost assets',()=>{
  const {race,session}=start(),p=session.players[1];p.run.creditCoins(23);
  session.deviceLost('p2');ticks(session,1439);assert.equal(race.status('p2'),'disconnected-grace');
  ticks(session,1);assert.equal(race.status('p2'),'forfeited');assert.equal(p.run.wallet,23);assert.equal(p.statistics.deaths,0);
  assert.equal(session.reclaim('p2','gamepad-1'),false);assert.equal(race.events.at(-1).reason,'grace-expired');
});
test('all-controller waiting freezes deadlines and original replacement reclaim grants no protection or credit',()=>{
  const {race,session}=start();session.deviceLost('p1');session.deviceLost('p2');
  const time=session.world.time;assert.equal(race.waiting,true);ticks(session,2000);assert.equal(session.world.time,time);
  const token=race.reclaimToken('p1'),p=session.players[0],before=[p.health,p.personalScore,p.completedForwardTiles,p.powerRemaining,p.recovery.protectionUntil];
  assert.equal(race.reclaim(token,'gamepad-9'),true);assert.equal(race.waiting,false);
  assert.deepEqual([p.health,p.personalScore,p.completedForwardTiles,p.powerRemaining,p.recovery.protectionUntil],before);
  assert.equal(p.device,'gamepad-9');assert.equal(race.reclaim(token,'gamepad-8'),false);
});
test('leave requires fresh confirmation, cancel is inert, terminal ignores late events',()=>{
  const {race,session}=start();session.players[0].run.creditCoins(11);
  const old=race.actionToken('p1');assert.equal(race.command(old,'leave'),true);assert.equal(race.command(old,'confirm'),false);
  assert.equal(race.command(race.actionToken('p1'),'cancel'),true);assert.equal(session.players[0].run.wallet,11);
  for(const seat of ['p1','p2']){assert.equal(race.command(race.actionToken(seat),'leave'),true);assert.equal(race.command(race.actionToken(seat),'confirm'),true);}
  assert.ok(race.result);const before=JSON.stringify({events:race.events,result:race.result});
  assert.equal(session.deviceLost('p1'),false);assert.equal(session.depart('p1'),false);ticks(session,100);
  assert.equal(JSON.stringify({events:race.events,result:race.result}),before);assert.equal(session.players[0].run.wallet,11);
});

test('disconnect dependency: dead original seat reserves replacement authority without reviving or clearing its offer', () => {
  const { game, session } = start();
  const owner = session.players[0]; owner.run.creditCoins(17);
  // Actual delivered death transaction on the generated course. No health,
  // participation, recovery, position, terrain or clock injection.
  game.end('Lifecycle dependency reproduction', 'train'); session.update(1 / 120);
  assert.equal(owner.participation, 'dead'); assert.equal(owner.statistics.deaths, 1);
  assert.equal(owner.run.wallet, 0); assert.ok(owner.recovery.offer);
  const before = { health: owner.health, wallet: owner.run.wallet, deaths: owner.statistics.deaths,
    offer: owner.recovery.offer, charge: owner.recovery.charge, protection: owner.recovery.protectionUntil };
  const accepted = session.deviceLost('p1');
  console.log('dead-seat device-loss observation', JSON.stringify({ accepted, participation: owner.participation,
    device: owner.device, offer: owner.recovery.offer, lifecycle: session.lifecycle.map(e => e.type) }));
  assert.equal(accepted, true, 'shared device lifecycle must retain a disconnected dead seat without changing its death/recovery state');
  assert.equal(owner.participation, 'dead');
  assert.deepEqual({ health: owner.health, wallet: owner.run.wallet, deaths: owner.statistics.deaths,
    offer: owner.recovery.offer, charge: owner.recovery.charge, protection: owner.recovery.protectionUntil }, before);
});
