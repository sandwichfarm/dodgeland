import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'race', 'session']);
after(sources.dispose);
const { Game } = await sources.import('game');
const { createRaceSession } = await sources.import('race');

test('statistics dependency: successful market interaction survives death clear exactly once', () => {
  const game = new Game(113, 'pond', 'arcade', false, [], 'butter');
  const race = createRaceSession(game, { seats: [
    { seat: 'p1', device: 'keyboard-a', characterId: 'butter' },
    { seat: 'p2', device: 'keyboard-b', characterId: 'pip' },
  ] });
  const session = race.session, owner = session.players[0];
  // Arrange a real market window and funds, then exercise its authoritative
  // owner/context transaction. No result or statistic is fabricated.
  owner.run.advanceScore(100); owner.run.creditCoins(30);
  function request(kind, itemId) {
    const context = session.openCoOpMarket(owner);
    assert.ok(context);
    return { actionId: `result-${kind}`, kind, itemId, seat: owner.seat,
      device: owner.device, participantId: owner.participantId,
      expectedOwnerGeneration: context.ownerGeneration,
      expectedInventoryGeneration: context.inventoryGeneration,
      expectedRunRevision: context.runRevision,
      expectedContextGeneration: context.contextGeneration };
  }
  assert.equal(session.actCoOpMarket(request('open')).ok, true);
  const purchase = request('buy-consumable', 'mud-splash');
  assert.equal(session.actCoOpMarket(purchase).ok, true);
  assert.equal(session.actCoOpMarket(purchase).ok, false);
  assert.equal(owner.run.wallet, 0);
  assert.equal(session.consumableSnapshot().charges.find(p => p.seat === owner.seat)['mud-splash'], 1);
  owner.powerReadyAt = 999;
  session.damage(owner.seat, { cause: 'fog', amount: 99, reason: 'result history reproduction' });
  assert.equal(owner.state, 'dead');
  assert.equal(owner.run.market, null);
  assert.equal(session.consumableSnapshot().charges.find(p => p.seat === owner.seat)['mud-splash'], 0);
  // Proposed shared contribution field: the authoritative successful purchase
  // must remain observable after clear, independently of Race's result view.
  assert.equal(owner.statistics.marketPurchases, 1,
    'common participant statistics must retain the accepted purchase, excluding its rejected replay');
  assert.equal(owner.statistics.marketInteractions, 2);
  assert.equal(owner.statistics.coinsSpent, 30);
  assert.equal(owner.statistics.itemsFound, 0, 'purchase is not world collection');
  const history = owner.interactions;
  assert.equal(history.length, 2);
  assert.deepEqual(history.map(e => [e.kind, e.action, e.walletDelta]), [['market', 'open', 0], ['market', 'buy-consumable', -30]]);
  assert.equal(history[1].participantId, owner.participantId);
  assert.equal(history[1].itemId, 'mud-splash');
  assert.equal(history[1].itemKind, 'consumable');
  assert.equal(history[1].ownerGeneration, purchase.expectedOwnerGeneration);
  assert.ok(Object.isFrozen(history) && Object.isFrozen(history[1]));
  assert.equal(session.players[1].interactions.length, 0);
});

test('statistics innate commit belongs to stable receiver before presentation callback and survives death', () => {
  const game = new Game(113, 'pond', 'arcade', false, [], 'butter');
  const race = createRaceSession(game, { seats: [
    { seat:'p1',device:'keyboard-a',characterId:'butter' },
    { seat:'p2',device:'keyboard-b',characterId:'pip' },
  ] });
  const [primary, secondary] = race.session.players;
  let calls = 0;
  secondary.onPower = () => { calls++; assert.equal(secondary.statistics.innateUses, 1); assert.equal(primary.statistics.innateUses, 0); };
  race.session.damage('p2', {cause:'mob',amount:99,reason:'innate success'});
  assert.equal(calls, 1);
  assert.equal(secondary.interactions.filter(e=>e.kind==='innate').length, 1);
  race.session.damage('p2', {cause:'mob',amount:99,reason:'protected replay'});
  assert.equal(calls, 1);
  assert.equal(primary.interactions.length, 0);
});

function arena(count=2, finishTiles=500) {
  const game=new Game(113,'pond','arcade',false,[],'butter');
  const seats=[['p1','butter','keyboard-a'],['p2','pip','keyboard-b'],['p3','sunny','gamepad-0'],['p4','petal','gamepad-1']].slice(0,count).map(([seat,characterId,device])=>({seat,characterId,device}));
  const race=createRaceSession(game,{seats,finishTiles,activeSeconds:30});
  for(let row=-8;row<100;row++)game.rows.set(row,{...game.rows.get(0),index:row,kind:'meadow',blocked:[],decorations:[],coin:null});
  return {game,race,session:race.session};
}
function step(run,n=1){for(let i=0;i<n;i++)run.session.update(1/120);}
function hop(run,seats){for(const seat of seats)assert.equal(run.session.dispatch({seat,direction:'forward'}),true);for(let i=0;i<120&&run.session.players.some(p=>p.hop>0);i++)step(run);}
function kill(run,seat){run.session.players.find(p=>p.seat===seat).powerReadyAt=999;run.session.damage(seat,{cause:'fog',amount:99,reason:'result fatal'});}
function endByLeave(run){for(const p of run.session.players)run.session.depart(p.seat,'confirmed-leave');run.race.tick(run.session);return run.race.result;}

test('captured settings ledger and true same-tick finish ranks retain complete stable participants',()=>{
  const run=arena(3,1);hop(run,['p1','p2']);hop(run,['p3']);
  const result=run.race.result;assert.deepEqual(result.players.map(p=>p.rankLabel),['=1','=1','3']);
  assert.equal(result.reason,'finish');assert.equal(result.tick,run.game.world.simulationTick);
  assert.equal(result.descriptor.itemVersion,'race-item-schema-1');assert.equal(result.course.level,'pond');
  assert.equal(result.leaderFrontier,1);assert.equal(result.fogBoundary,-11);
  for(const p of result.players){assert.ok(p.participantId);assert.equal(p.marker,p.seat.toUpperCase());assert.equal(p.status,'finished');assert.ok(p.finishTick>0);assert.ok(p.finishTime>0);assert.equal(p.innateUses,0);assert.ok(Object.isFrozen(p));}
  assert.ok(result.events.length>0);
});

test('timeout ranking mixed finishers and distances uses competition positions without DNF bias',()=>{
  const run=arena(4,3);hop(run,['p1','p2','p3']);hop(run,['p1','p2','p3']);hop(run,['p1']);hop(run,['p4']);step(run,3700);
  assert.equal(run.race.result.outcome,'time');assert.deepEqual(run.race.result.players.map(p=>p.rankLabel),['1','=2','=2','4']);
  const equal=arena(4);step(equal,3700);assert.deepEqual(equal.race.result.players.map(p=>p.rankLabel),['=1','=1','=1','=1']);
});

for(const reason of ['leave','forfeit','decline','expiry'])test(`ledger ${reason} preserves death clear and explicit unranked DNF`,()=>{
  const run=arena();hop(run,['p1']);const p=run.session.players[0];
  const lane=run.game.rows.get(Math.round(p.y));lane.coin=0;run.session.world.claimPickup(p,lane,run.game.time,0,5);run.session.world.resolvePickups();
  const coins=p.coins;
  if(reason==='leave')run.session.depart('p1','confirmed-leave');
  else if(reason==='forfeit'){run.session.deviceLost('p1');step(run,1441);}
  else {kill(run,'p1');if(reason==='decline')run.session.declineRecovery('p1');else step(run,970);}
  run.session.depart('p2','confirmed-leave');run.race.tick(run.session);
  const result=run.race.result,record=result.players.find(p=>p.seat==='p1');
  assert.equal(record.rank,null);assert.equal(record.rankLabel,'DNF');assert.equal(record.coins,coins);assert.equal(record.pickups,1);
  assert.equal(record.dnf,reason==='leave'?'Left':reason==='forfeit'?'Forfeited':'Down');
  assert.equal(record.deaths,['decline','expiry'].includes(reason)?1:0);assert.equal(result.winners.length,0);
  if(record.deaths)assert.equal(result.events.filter(e=>e.kind==='death'&&e.seat==='p1').length,1);
  const json=JSON.stringify(result);run.race.tick(run.session);run.session.declineRecovery('p1');run.session.dispatch({seat:'p1',direction:'forward'});assert.equal(JSON.stringify(result),json);
});

test('ledger personal recovery and fog attempted versus landed retain pre-clear contribution',()=>{
  const run=arena();for(let i=0;i<14;i++)hop(run,['p1']);step(run,121);
  const p=run.session.players[1];kill(run,'p2');assert.equal(run.session.recover({kind:'personal',ownerSeat:'p2'}),true);
  endByLeave(run);const record=run.race.result.players[1];assert.equal(record.selfRevives,1);assert.equal(record.deaths,1);
  assert.ok(record.fogAttempted>=1);assert.ok(record.fogLanded>=1);assert.equal(record.distance,0);
  assert.ok(run.race.result.events.some(e=>e.kind==='death'&&e.seat==='p2'));
});
