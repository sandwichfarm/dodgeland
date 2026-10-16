import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'race', 'session', 'market/catalog']);
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
  session.declineRecovery('p1');session.depart('p2','confirmed-leave');race.tick(session);
  assert.equal(race.result.players[0].marketPurchases,1);assert.equal(race.result.players[0].coinsSpent,30);
  assert.deepEqual(race.result.players[0].interactions,history);
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
  const run=arena();kill(run,'p2');assert.equal(run.session.recover({kind:'personal',ownerSeat:'p2'}),true);
  for(let i=0;i<14;i++)hop(run,['p1']);step(run,180);
  endByLeave(run);const record=run.race.result.players[1];assert.equal(record.selfRevives,1);assert.equal(record.deaths,1);
  assert.ok(record.fogAttempted>=1);assert.ok(record.fogLanded>=1);assert.equal(record.distance,0);
  assert.ok(run.race.result.events.some(e=>e.kind==='death'&&e.seat==='p2'));
});

test('item statistics preserve each world collection use target generation and death clear', async()=>{
  const {sampleItemDrop}=await sources.import('consumable-drops');const {RACE_DROP_SCHEMA}=await sources.import('race-items');
  for(const item of ['mud-splash','fog-lantern']){
    let seed=0;while(sampleItemDrop(RACE_DROP_SCHEMA,{courseSeed:seed,row:1,slot:0}).itemId!==item)seed++;
    const game=new Game(seed,'pond','arcade',false,[],'butter');
    const race=createRaceSession(game,{seats:[{seat:'p1',characterId:'butter',device:'keyboard-a'},{seat:'p2',characterId:'pip',device:'keyboard-b'}]});
    const run={game,race,session:race.session},p=run.session.players[0];
    for(const row of game.rows.values())Object.assign(row,{kind:'meadow',blocked:[],coin:null});
    const pickup=run.session.consumableSnapshot().pickups.find(p=>p.itemId===item&&p.row===1);assert.ok(pickup);
    p.x=p.fromX=pickup.x;p.y=p.fromY=pickup.y;p.hop=0;step(run);
    const plan=race.items.plan('p1',item,'p2');assert.equal(plan.ok,true);assert.equal(race.items.commit(plan),true);assert.equal(race.items.commit(plan),false);
    const old=p.interactions.find(e=>e.kind==='item-use');assert.equal(old.targets[0].participantId,run.session.players[item==='mud-splash'?1:0].participantId);
    kill(run,'p1');run.session.declineRecovery('p1');run.session.depart('p2','confirmed-leave');race.tick(run.session);
    const own=race.result.players[0],other=race.result.players[1];assert.equal(own[item==='mud-splash'?'mudCollected':'lanternCollected'],1);assert.equal(own[item==='mud-splash'?'mudUsed':'lanternUsed'],1);
    assert.equal(other.mudReceived,item==='mud-splash'?1:0);assert.ok(Object.isFrozen(own.interactions));
    assert.deepEqual(own.interactions.find(e=>e.kind==='item-use'),old);
  }
});

test('ledger rejects duplicate wrong-owner stale generation invalid and postterminal events atomically',async()=>{
  const {createRaceLedger,freezeRaceResult}=await sources.import('race-results');
  const run=arena();step(run);const source=run.race.history.events[0],ledger=createRaceLedger(run.session.players.map(p=>({seat:p.seat,participantId:p.participantId,characterId:p.characterId,marker:p.marker})));
  assert.equal(ledger.append(source).ok,true);
  for(const [event,reason]of [[source,'duplicate'],[{...source,id:'wrong',participantId:'wrong'},'wrong-owner'],[{...source,id:'bad',time:NaN},'invalid']]){const before=JSON.stringify(ledger.snapshot());assert.deepEqual(ledger.append(event),{ok:false,reason});assert.equal(JSON.stringify(ledger.snapshot()),before);}
  const next={...source,id:'next',generation:1,record:{...source.record,generation:1}};assert.equal(ledger.append(next).ok,true);assert.equal(ledger.append({...source,id:'stale'}).reason,'stale');
  const finished=endByLeave(run),common={...finished};delete common.players;delete common.events;delete common.winners;
  const result=freezeRaceResult(ledger,common),json=JSON.stringify(result);assert.equal(ledger.append({...next,id:'late'}).reason,'terminal');assert.strictEqual(freezeRaceResult(ledger,{...common,elapsed:999}),result);
  source.record.interactions.length&&assert.ok(Object.isFrozen(source.record.interactions[0]));
  assert.throws(()=>result.descriptor.settings.finishTiles=1,TypeError);assert.equal(JSON.stringify(result),json);
});

test('pure ranks ignore all participant ordering and presentation identities',async()=>{
  const {rankRaceParticipants}=await sources.import('race-results');const run=arena(4,2);hop(run,['p1','p2','p3']);hop(run,['p1']);step(run,3700);
  const records=run.race.result.players,expected=new Map(records.map(p=>[p.participantId,p.rankLabel]));
  function permutations(xs){return xs.length?xs.flatMap((x,i)=>permutations(xs.filter((_,j)=>i!==j)).map(rest=>[x,...rest])):[[]];}
  for(const order of permutations(records)){
    const projection=rankRaceParticipants(order.map((p,i)=>({...p,characterId:`visual-${i}`,marker:`marker-${3-i}`})),true);
    for(const p of projection)assert.equal(p.rankLabel,expected.get(p.participantId));
  }
  const before=JSON.stringify(run.race.result);run.session.players[0].statistics.coins=999;run.session.players[0].run.clear();
  const retry=arena();hop(retry,['p1']);assert.equal(JSON.stringify(run.race.result),before);
});

test('built frozen Race results expose podium and complete paged participants through actual inputs', {timeout:90000}, async()=>{
  const {createMarketGameFixture,sessionHudAction}=await import('./market-game-fixture.mjs');
  const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true,initialIntent:{sender:'race-results',archetype:'game',action:'open',convention:'napplet:game/open',payload:{seed:'ph3-00000071-pond-s-n'}}});
  try{
    const f=app.frame;await f.locator('#local-play').click();await f.locator('#race-play').click();await f.locator('#race-finish').fill('1');await f.locator('#local-session-start').click();
    await f.locator('#scene').focus();await app.page.keyboard.press('w');await app.advance(300);await app.page.keyboard.press('ArrowUp');await app.advance(300);
    await f.getByRole('heading',{name:'Race results',exact:true}).waitFor();
    const frozen=await app.onSession(function(){return JSON.stringify(this.result);});
    assert.deepEqual(JSON.parse(frozen).players.map(p=>p.rankLabel),['1','2']);
    for(const light of [false,true])for(const [w,h]of [[200,160],[240,240],[320,560],[900,600],[1000,280],[2400,1200]]){
      await app.resize(w,h);await f.evaluate(light=>window.marketGameFixture.setTheme({colors:light?{background:'#f6f1e5',text:'#24362d',primary:'#4b7b61'}:{background:'#242b32',text:'#f0eee5',primary:'#9fc28a'}}),light);
      if(w===200){assert.equal(await f.locator('.survive-results-tiny').isVisible(),true);await app.iframe.screenshot({path:`/tmp/race-05-05-tiny-${light?'light':'dark'}.png`});continue;}
      const root=f.locator('#survive-results-root');
      // Return to the first page through production controls, not model/UI injection.
      while(await root.getByRole('button',{name:'Previous results',exact:true}).isEnabled())await root.getByRole('button',{name:'Previous results',exact:true}).click();
      let pages=0;const text=[];
      while(true){
        text.push(await root.innerText());await assertResultContrast(f);
        const problems=await root.evaluate(root=>[...root.querySelectorAll('button,h2,h3,dt,dd')].filter(n=>n.getClientRects().length).flatMap(n=>{const r=n.getBoundingClientRect();return r.left<0||r.top<0||r.right>innerWidth+1||r.bottom>innerHeight+1||n.scrollWidth>n.clientWidth+1||(n.tagName==='BUTTON'&&(r.width<44||r.height<44))?[n.textContent]:[];}));assert.deepEqual(problems,[],`${w}x${h} page ${pages}`);
        const overflow=await root.locator('.race-results-body').evaluate(n=>({bad:n.scrollHeight>n.clientHeight+1||n.scrollWidth>n.clientWidth+1,h:n.clientHeight,sh:n.scrollHeight,children:[...n.querySelectorAll('h3,p')].map(c=>[c.textContent,c.clientHeight,getComputedStyle(c).fontSize])}));assert.equal(overflow.bad,false,JSON.stringify(overflow)+`bounded results body ${w}x${h} page ${pages}`);
        if(pages<2||!(await root.getByRole('button',{name:'Next results',exact:true}).isEnabled()))await app.iframe.screenshot({path:`/tmp/race-05-05-results-${w}x${h}-${light?'light':'dark'}-${pages}.png`});
        pages++;assert.ok(pages<50);
        if(!(await root.getByRole('button',{name:'Next results',exact:true}).isEnabled()))break;
        await root.getByRole('button',{name:'Next results',exact:true}).focus();await app.page.keyboard.press(pages%2?'Enter':'Space');
      }
      for(const label of ['P1','P2','Innate powers','Fog attempted','Mud received','Lantern collected','Market interactions','Coins spent'])assert.ok(text.join('\n').includes(label),`${label} remains reachable`);
      assert.equal(await app.onSession(function(){return JSON.stringify(this.result);}),frozen);
      const again=root.getByRole('button',{name:'Race again',exact:true});await again.focus();await app.page.keyboard.press('Tab');assert.equal(await root.evaluate(n=>n.contains(document.activeElement)),true);
    }
    await app.resize(240,240);
    const navigation=f.locator('#survive-results-root');
    while(await navigation.getByRole('button',{name:'Previous results',exact:true}).isEnabled())await navigation.getByRole('button',{name:'Previous results',exact:true}).click();
    for(let i=0;i<8;i++)await navigation.getByRole('button',{name:'Next results',exact:true}).click();
    const selected=await navigation.locator('[data-participant]').getAttribute('data-participant');
    await app.resize(900,600);assert.equal(await navigation.locator('[data-participant]').getAttribute('data-participant'),selected,'resize preserves inspected participant');
    await f.getByRole('button',{name:'Race again',exact:true}).click();assert.equal(await f.locator('#survive-results-root').isVisible(),false);
    await f.locator('#local-play').click();await f.locator('#race-play').click();await f.locator('#local-session-start').click();assert.equal(await f.locator('#race-results-heading').count(),0);
    assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);assert.deepEqual(await f.evaluate(()=>window.marketGameFixture.forbidden),[]);
  }finally{await app.close();}
});

for(const outcome of ['time','left'])test(`built ${outcome} results retain explicit status and frozen history`,{timeout:30000},async()=>{
  const {createMarketGameFixture,sessionHudAction}=await import('./market-game-fixture.mjs');const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true});
  try{
    const f=app.frame;await f.locator('#local-play').click();await f.locator('#race-play').click();await f.locator('#race-time').fill('30');await f.locator('#local-session-start').click();
    if(outcome==='time')await app.advance(31000);
    else for(const seat of ['p1','p2']){await sessionHudAction(app, seat, 'item');await f.locator('#survive-lifecycle-board').getByRole('button',{name:'Leave Race',exact:true}).click();await app.advance(30);}
    await f.getByRole('heading',{name:'Race results',exact:true}).waitFor();
    const frozen=await app.onSession(function(){return JSON.stringify(this.result);}),result=JSON.parse(frozen);
    assert.deepEqual(result.players.map(p=>p.rankLabel),outcome==='time'?['=1','=1']:['DNF','DNF']);
    for(const [w,h]of [[240,240],[900,600]]){
      await app.resize(w,h);const root=f.locator('#survive-results-root');
      if(outcome==='left')assert.match(await root.textContent(),/DNF · Left/);
      const body=await root.locator('.race-results-body').evaluate(n=>({h:n.clientHeight,sh:n.scrollHeight,w:n.clientWidth,sw:n.scrollWidth}));assert.ok(body.sh<=body.h+1&&body.sw<=body.w+1,JSON.stringify(body));
      await app.iframe.screenshot({path:`/tmp/race-05-05-${outcome}-${w}.png`});
      assert.equal(await app.onSession(function(){return JSON.stringify(this.result);}),frozen);
    }
    assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);
  }finally{await app.close();}
});

async function assertResultContrast(frame) {
  const failures = await frame.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1; const context = canvas.getContext('2d');
    const luminance = color => {
      context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1);
      const values = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
      return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
    };
    const board = document.querySelector('#survive-results-root');
    return [...board.querySelectorAll('button,h2,h3,p,dt,dd,strong')].filter(node => node.getClientRects().length).flatMap(node => {
      let background = node, color = getComputedStyle(background).backgroundColor;
      while ((color === 'transparent' || color === 'rgba(0, 0, 0, 0)') && background.parentElement) { background = background.parentElement; color = getComputedStyle(background).backgroundColor; }
      const a = luminance(getComputedStyle(node).color), b = luminance(color), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      return ratio < 4.5 ? [{ text: node.textContent, ratio }] : [];
    });
  });
  assert.deepEqual(failures, []);
}




test('statistics authoritative market metadata ignores forged extra item IDs for buy sale equip and packs',async()=>{
  const {LocalSession}=await sources.import('session'),{ITEM_CATALOG}=await sources.import('market/catalog');
  const game=new Game(113,'pond','arcade',false,ITEM_CATALOG,'butter'),session=LocalSession.stage(game).commit();session.installCoOpMarket();
  const owner=session.players[0],run=owner.run;run.advanceScore(100);run.creditCoins(10000);let sequence=0;
  function act(kind,patch={}){const c=session.openCoOpMarket(owner);assert.ok(c);const request={actionId:`metadata-${++sequence}`,kind,seat:owner.seat,device:owner.device,participantId:owner.participantId,expectedOwnerGeneration:c.ownerGeneration,expectedInventoryGeneration:c.inventoryGeneration,expectedRunRevision:c.runRevision,expectedContextGeneration:c.contextGeneration,...patch};const result=session.actCoOpMarket(request);assert.equal(result.ok,true,result.message);assert.equal(session.actCoOpMarket(request).ok,false);return owner.interactions.at(-1);}
  function buy(id){const item=run.catalog.get(id);const offer={id:`real-offer-${sequence}`,itemId:id,price:item.price,sold:false};run.market.offers.push(offer);return act('buy',{offerId:offer.id,itemId:'forged-unrelated'});}
  const opened=act('open',{itemId:'forged-unrelated'});
  const cosmetic=ITEM_CATALOG.find(i=>i.kind==='cosmetic');assert.equal(buy(cosmetic.id).itemId,cosmetic.id);assert.deepEqual(opened.items,[]);
  assert.deepEqual(act('equip',{itemId:cosmetic.id}).items,[{id:cosmetic.id,kind:'cosmetic'}]);
  buy('coin-multiplier');const card=run.cards[0],sale=act('sell',{cardId:card.id,itemId:'forged-unrelated'});assert.deepEqual(sale.items,[{id:'coin-multiplier',kind:'card'}]);assert.equal(sale.walletDelta,card.saleValue);
  buy('pack-satchel');const draft=run.pendingPack,ids=draft.choices.slice(0,draft.picks).map(c=>c.id),expected=[{id:draft.packId,kind:'pack'},...draft.choices.slice(0,draft.picks).flatMap(c=>c.components.map(c=>({id:c.itemId,kind:'card'})))];
  assert.deepEqual(act('claim-pack',{ids,itemId:'forged-unrelated'}).items,expected);
  buy('pack-satchel');assert.deepEqual(act('skip-pack',{itemId:'forged-unrelated'}).items,[{id:'pack-satchel',kind:'pack'}]);
  assert.deepEqual(act('close',{itemId:'forged-unrelated'}).items,[]);
  assert.ok(owner.interactions.every(e=>Object.isFrozen(e)&&Object.isFrozen(e.items)&&e.items.every(Object.isFrozen)));
});

for(const [count,tied] of [[3,true],[4,true],[4,false]])test(`built podium tiers ${count} racers ${tied?'tied':'distinct'} stay bounded`,{timeout:60000},async()=>{
  const {createMarketGameFixture,sessionHudAction}=await import('./market-game-fixture.mjs');
  const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true,gamepads:true,initialIntent:{sender:'race-results',archetype:'game',action:'open',convention:'napplet:game/open',payload:{seed:'ph3-00000071-pond-s-n'}}});
  const pad=(index,pressed=[])=>({index,id:`pad-${index}`,connected:true,mapping:'standard',timestamp:1,axes:[0,0,0,0],buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i),touched:pressed.includes(i),value:pressed.includes(i)?1:0}))});
  try{
    const f=app.frame;await f.locator('#local-play').click();
    for(let i=0;i<count-2;i++){await app.sendPads(Array.from({length:i+1},(_,j)=>pad(j)));await app.sendPads(Array.from({length:i+1},(_,j)=>pad(j,j===i?[0]:[])));await app.sendPads(Array.from({length:i+1},(_,j)=>pad(j)));}
    await f.locator('#race-play').click();await f.locator('#race-finish').fill('1');await f.locator('#local-session-start').click();await f.locator('#scene').focus();
    if(tied){await app.page.evaluate(pads=>window.marketPads(pads,true),Array.from({length:count-2},(_,j)=>pad(j,[12])));await app.page.keyboard.press('w');await app.page.keyboard.press('ArrowUp');await app.advance(300);}
    else{await app.page.keyboard.press('w');await app.advance(300);await app.page.keyboard.press('ArrowUp');await app.advance(300);for(let i=0;i<count-2;i++){await app.sendPads(Array.from({length:count-2},(_,j)=>pad(j,j===i?[12]:[])));await app.advance(300);}}
    await f.getByRole('heading',{name:'Race results',exact:true}).waitFor();const frozen=await app.onSession(function(){return JSON.stringify(this.result);});
    assert.deepEqual(JSON.parse(frozen).players.map(p=>p.rankLabel),tied?Array(count).fill('=1'):['1','2','3','4']);
    for(const light of [false,true])for(const [w,h]of [[240,240],[320,560],[900,600],[1000,280],[2400,1200]]){
      await app.resize(w,h);await f.evaluate(light=>window.marketGameFixture.setTheme({colors:light?{background:'#f6f1e5',text:'#24362d',primary:'#4b7b61'}:{background:'#242b32',text:'#f0eee5',primary:'#9fc28a'}}),light);
      const root=f.locator('#survive-results-root');while(await root.getByRole('button',{name:'Previous results',exact:true}).isEnabled())await root.getByRole('button',{name:'Previous results',exact:true}).click();
      const pages=h<420&&!tied?count:1;
      for(let page=0;page<pages;page++){
        assert.equal(await root.locator('[data-race-tier]').count(),tied||h<420?1:count);
        assert.equal(await root.locator('[data-race-member]').count(),tied?count:h<420?1:count);
        await assertResultContrast(f);
        assert.deepEqual(await root.evaluate(n=>[...n.querySelectorAll('button,[data-race-tier],[data-race-member]')].filter(e=>e.getClientRects().length).flatMap(e=>{const r=e.getBoundingClientRect();return r.left<0||r.top<0||r.right>innerWidth+1||r.bottom>innerHeight+1||e.scrollWidth>e.clientWidth+1||(e.tagName==='BUTTON'&&(r.width<44||r.height<44||!e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))))?[e.textContent]:[];})),[]);
        const geometry=await root.locator('.race-results-body').evaluate(n=>({h:n.clientHeight,sh:n.scrollHeight,w:n.clientWidth,sw:n.scrollWidth,children:[...n.querySelectorAll('*')].map(e=>[e.className,e.textContent,e.clientHeight,e.scrollHeight,getComputedStyle(e).fontSize])}));assert.ok(geometry.sh<=geometry.h+1&&geometry.sw<=geometry.w+1,JSON.stringify(geometry));
        await app.iframe.screenshot({path:`/tmp/race-05-05-tiers-${count}-${tied?'tie':'distinct'}-${w}x${h}-${light?'light':'dark'}-${page}.png`});
        if(page+1<pages)await root.getByRole('button',{name:'Next results',exact:true}).click();
      }
      assert.equal(await app.onSession(function(){return JSON.stringify(this.result);}),frozen);
    }
    assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);
  }finally{await app.close();}
});
