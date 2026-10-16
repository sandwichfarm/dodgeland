import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { loadSources } from './source-loader.mjs';
const sources = await loadSources(['game', 'relay']);
after(() => sources.dispose());
const { Game, generateLane } = await sources.import('game');
const { createRelaySession } = await sources.import('relay');
function setup(length = 2, count = 2) {
  const game = new Game(121, 'pond', 'stroll', false, [], 'butter');
  const relay = createRelaySession(game, { seats: ['butter','pip','sunny','petal'].slice(0,count).map((characterId,i)=>({seat:`p${i+1}`,characterId,device:`gamepad-${i}`})), tilesPerLeg: length });
  for (const [row,lane] of game.rows) game.rows.set(row, { ...lane, kind: 'meadow', blocked: [], decorations: [], actors: undefined, coin: null });
  return { game, relay, session: relay.session };
}
function hop(run) {
  const p = run.session.players.find(p => p.seat === run.relay.activeSeat);
  run.game.rows.set(p.y + 1, { ...generateLane(run.game.seed,p.y+1,run.game.home), kind:'meadow', blocked:[], decorations:[], coin:null });
  assert.equal(run.session.dispatch({ seat:p.seat, direction:'forward' }),true);
  for(let i=0;i<120 && p.hop>0;i++) run.session.update(1/120);
}
test('production handoff closes an immutable leg with authoritative distance and active time', () => {
  const run=setup(); hop(run); hop(run);
  assert.equal(run.relay.confirm(run.relay.confirmation()),true);
  const leg=run.relay.history.legs[0];
  assert.equal(leg.distance,2); assert.equal(leg.outcome,'complete'); assert.ok(leg.duration>0); assert.equal(leg.seat,'p1'); assert.ok(Object.isFrozen(leg));
});
test('actual fatal transaction appends before inventory clear, then recovery continues the same credited leg', () => {
  const run=setup(50); hop(run); run.game.awardCoins(3.5);
  const wallet=run.game.run.wallet;
  const originalClear=run.game.run.clear.bind(run.game.run); let observed;
  run.game.run.clear=()=>{ observed=run.relay.history?.events.find(event=>event.death); originalClear(); };
  run.game.end('Fixture fatal train','train');
  assert.ok(observed,'the immutable death credit must exist before RunInventory.clear');
  assert.equal(observed.death.cause,'train'); assert.equal(observed.death.wallet,wallet); assert.ok(Object.isFrozen(observed));
  run.session.update(1/120); assert.equal(run.session.recover({kind:'personal',ownerSeat:'p1'}),true);
  run.session.depart('p1'); run.session.depart('p2');
  assert.equal(run.relay.result.contributions[0].selfRevives,1); assert.equal(run.relay.result.contributions[0].deaths,1);
  assert.equal(run.relay.result.legs.length,1); assert.equal(run.relay.result.legs[0].coins,run.game.coins); assert.equal(run.relay.result.legs[0].distance,1);
});

for(const [distances,ranks] of [[[20,20,10],['=1','=1','3']],[[30,20,20,5],['1','=2','=2','4']],[[7,7,7],['=1','=1','=1']]]) test(`production earned distances ${distances} retain competition ties`,()=>{
  const run=setup(999,distances.length);
  for(let i=0;i<distances.length;i++) {
    for(let n=0;n<distances[i];n++) hop(run);
    run.session.depart(`p${i+1}`);
    if(i<distances.length-1) { assert.equal(run.relay.history.current,undefined); assert.equal(run.relay.confirm(run.relay.confirmation()),true); }
  }
  const result=run.relay.result;
  assert.deepEqual(result.contributions.map(p=>p.distance),distances); assert.deepEqual(result.contributions.map(p=>p.rankLabel),ranks);
  assert.equal(result.distance,distances.reduce((a,b)=>a+b,0)); assert.equal(result.legs.length,distances.length);
  assert.ok(result.contributions.every(p=>p.lifecycle==='departed')); assert.ok(Object.isFrozen(result.podium[0].participants));
});

test('resolved dropout selects but cannot start the next leg without its fresh identity ticket',()=>{
  const run=setup(); hop(run); const stale=run.relay.confirmation(); run.session.depart('p1');
  const time=run.game.time; assert.equal(run.relay.activeSeat,'p2'); assert.equal(run.relay.snapshot().phase,'handoff'); assert.equal(run.relay.history.legs.length,1); assert.equal(run.relay.history.current,undefined);
  for(let i=0;i<1000;i++) run.session.update(1/120);
  assert.equal(run.game.time,time); assert.equal(run.relay.confirm(stale),false);
  const ticket=run.relay.confirmation(); assert.equal(run.relay.confirm(ticket),true); assert.equal(run.relay.confirm(ticket),false);
  assert.equal(run.relay.history.current.seat,'p2'); assert.equal(run.relay.history.current.startTime,time);
});

test('real pickup and death credit survive clear, offer time is excluded and decline closes Dead once',()=>{
  const run=setup(50); hop(run); const player=run.session.players[0], lane=run.game.rows.get(player.y);
  lane.coin=0; run.session.world.claimPickup(player,lane,run.game.time,0,5); run.session.world.resolvePickups();
  const coins=player.coins; run.game.end('Fixture fatal train','train'); run.session.update(1/120);
  const before=JSON.stringify(run.relay.history.events); const death=run.relay.history.events.find(event=>event.death);
  for(let i=0;i<100;i++) run.session.update(1/120);
  assert.equal(JSON.stringify(run.relay.history.events),before); assert.equal(run.session.declineRecovery('p1'),true);
  const leg=run.relay.history.legs[0]; assert.equal(leg.coins,coins); assert.equal(leg.pickups,1); assert.equal(leg.deaths,1); assert.equal(leg.outcome,'dead'); assert.ok(leg.duration < leg.endTime-leg.startTime);
  assert.equal(run.session.declineRecovery('p1'),false); assert.equal(run.relay.history.legs.length,1); assert.strictEqual(run.relay.history.events.find(event=>event.death),death);
});

test('final result retains disconnected identity and is unchanged by late writes or mutable owners',()=>{
  const run=setup(); hop(run); run.session.deviceLost('p2'); const result=run.relay.finish(); const json=JSON.stringify(result);
  assert.equal(result.contributions[1].connected,false); assert.equal(result.contributions[1].lifecycle,'device-lost'); assert.equal(result.legs[0].outcome,'ended');
  run.session.players[0].statistics.coins=999; run.session.players[0].run.clear(); run.relay.disconnect('p1');
  assert.strictEqual(run.relay.finish(),result); assert.equal(JSON.stringify(result),json);
  assert.throws(()=>result.legs[0].startPosition.x=99,TypeError);
});

test('ledger rejects duplicate stale wrong-owner invalid and post-terminal writes atomically', async()=>{
  const {createRelayLedger,finalizeRelayResult}=await sources.import('relay-results');
  const roster=[{seat:'p1',participantId:'one',characterId:'butter'}], ledger=createRelayLedger(roster);
  const opened={id:'open',seat:'p1',participantId:'one',leg:1,generation:1,frontier:0,time:0,position:{x:0,y:0}};
  assert.equal(ledger.open(opened).ok,true); const token=ledger.token(), delta={distance:2,coins:3,pickups:1,selfRevives:0,deaths:0};
  assert.equal(ledger.credit({...token,id:'credit',delta}).ok,true);
  for(const [input,reason] of [[{...token,id:'credit',delta},'duplicate'],[{...token,id:'bad-seat',seat:'p2',delta},'wrong-owner'],[{...token,id:'old',generation:0,delta},'stale'],[{...token,id:'bad-value',delta:{...delta,coins:NaN}},'invalid']]) {
    const before=JSON.stringify(ledger.snapshot()); assert.equal(ledger.credit(input).reason,reason); assert.equal(JSON.stringify(ledger.snapshot()),before);
  }
  ledger.lifecycle({...roster[0],id:'lost',generation:2,lifecycle:'device-lost',connected:false});
  assert.equal(ledger.credit({...token,id:'late',delta}).reason,'stale');
  assert.equal(ledger.close({...ledger.token(),id:'close',frontier:2,time:1,duration:1,position:{x:0,y:2},outcome:'skipped'}).ok,true);
  assert.equal(ledger.open({...opened,id:'reopen'}).reason,'stale');
  const result=finalizeRelayResult(ledger,{mode:'relay',outcome:'complete',distance:2,elapsedSeconds:1,seedCode:null});
  assert.equal(ledger.credit({...token,id:'after',delta}).reason,'terminal'); assert.strictEqual(finalizeRelayResult(ledger,{mode:'relay',outcome:'other',distance:99,elapsedSeconds:99,seedCode:null}),result);
});

test('generic pre-death observer is immutable, reentrant death is inert, and cleanup survives observer failure', async()=>{
  const {LocalSession}=await sources.import('session');
  const game=new Game(121,'pond','stroll',false,[],'butter'); let calls=0, ends=0; game.onEnd=()=>ends++;
  const session=LocalSession.stage(game,{mode:{definition:game.definition,handlers:{beforeDeath(observation){calls++;assert.ok(Object.isFrozen(observation)); assert.ok(Object.isFrozen(observation.position)); game.end('reentrant','train');throw new Error('observer fixture');}}}}).commit();
  game.run.creditCoins(9); assert.throws(()=>game.end('fatal','train'),/observer fixture/);
  assert.equal(calls,1);assert.equal(ends,1);assert.equal(game.state,'dead');assert.equal(game.run.wallet,0);session.stop();
});

test('built frozen results expose podium, participant and leg pages across frames and new-run navigation', {timeout:90000}, async()=>{
  const {createMarketGameFixture,sessionHudAction}=await import('./market-game-fixture.mjs'); const evidence={errors:[],external:[]}; const app=await createMarketGameFixture(evidence);
  try {
    await app.frame.locator('#local-play').click(); await app.frame.locator('#relay-play').click(); await app.frame.locator('#relay-tiles').fill('1'); await app.frame.locator('#local-session-start').click();
    await app.onSession(function(){ for(const lane of this.world.rows.values()) Object.assign(lane,{kind:'meadow',blocked:[],decorations:[],actors:undefined,coin:null}); });
    await app.frame.locator('#scene').focus(); await app.page.keyboard.press('w'); await app.advance(400);
    await app.frame.getByRole('button',{name:"Start P2's leg",exact:true}).click();
    await sessionHudAction(app, 'p2', 'item'); await app.frame.locator('#relay-handoff').getByRole('button',{name:'Leave Relay',exact:true}).click();
    await app.frame.getByRole('button',{name:"Start P1's leg",exact:true}).click();
    await sessionHudAction(app, 'p1', 'item'); await app.frame.locator('#relay-handoff').getByRole('button',{name:'Leave Relay',exact:true}).click(); await app.advance(80);
    assert.equal(await app.frame.getByRole('heading',{name:'Relay results',exact:true}).isVisible(),true);
    const frozen=await app.onSession(function(){return JSON.stringify(this.result);}); const result=JSON.parse(frozen);
    assert.equal(result.distance,1); assert.equal(result.legs.length,3); assert.equal(result.legs[0].outcome,'complete'); assert.equal(result.legs[1].outcome,'left'); assert.deepEqual(result.contributions.map(p=>p.rankLabel),['1','2']);
    const scene=await app.onGame(function(){return {time:this.time,seed:this.seed,rows:[...this.rows.keys()]};});
    for(const light of [false,true]) for(const [width,height] of [[200,160],[240,240],[320,560],[900,600],[1000,280],[2400,1200]]) {
      await app.resize(width,height); await app.frame.evaluate(light=>window.marketGameFixture.setTheme({colors:light?{background:'#f6f1e5',text:'#24362d',primary:'#4b7b61'}:{background:'#242b32',text:'#f0eee5',primary:'#9fc28a'}}),light);
      if(width===200) { assert.equal(await app.frame.locator('#relay-handoff').isVisible(),false); await app.iframe.screenshot({path:`/tmp/relay-results-tiny-${light?'light':'dark'}.png`}); continue; }
      for(const view of ['podium','players','legs']) {
        while(await app.frame.locator('#relay-handoff').getAttribute('data-result-view')!==view) await app.frame.locator('.relay-results-nav button').nth(1).click();
        const problems=await app.frame.evaluate(()=>[...document.querySelector('#relay-handoff').querySelectorAll('button,h2,h3,dt,dd')].filter(n=>n.getClientRects().length).flatMap(n=>{const r=n.getBoundingClientRect();return r.left<0||r.top<0||r.right>innerWidth+1||r.bottom>innerHeight+1||n.scrollWidth>n.clientWidth+1||(n.tagName==='BUTTON'&&(r.width<44||r.height<44||!n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))))?[n.textContent]:[];}));
        assert.deepEqual(problems,[],`${view} ${width}x${height}`);
        await assertBoardContrast(app.frame);
        await app.iframe.screenshot({path:`/tmp/relay-results-${view}-${width}x${height}-${light?'light':'dark'}.png`});
      }
      assert.equal(await app.onSession(function(){return JSON.stringify(this.result);}),frozen);
    }
    await app.resize(900,600);
    while(await app.frame.locator('#relay-handoff').getAttribute('data-result-view')!=='players') await app.frame.locator('.relay-results-nav button').nth(1).click();
    assert.match(await app.frame.locator('.relay-results-body').innerText(),/Self revives/); assert.match(await app.frame.locator('.relay-results-body').innerText(),/Left/);
    await app.frame.getByRole('button',{name:'Next result page',exact:true}).click(); assert.match(await app.frame.locator('.relay-results-body h3').innerText(),/P2/);
    await app.frame.locator('.relay-results-nav button').nth(1).click(); assert.match(await app.frame.locator('.relay-results-body').innerText(),/Handed off/);
    await app.frame.getByRole('button',{name:'Next result page',exact:true}).click(); assert.match(await app.frame.locator('.relay-results-body').innerText(),/Left/);
    await app.advance(1000); assert.deepEqual(await app.onGame(function(){return {time:this.time,seed:this.seed,rows:[...this.rows.keys()]};}),scene);
    assert.equal(await app.onSession(function(){return JSON.stringify(this.result);}),frozen);
    await app.frame.getByRole('button',{name:'Hop again',exact:true}).focus(); await app.page.keyboard.press('Enter'); await app.advance(80);
    assert.equal(await app.frame.locator('#relay-handoff').count(),0); assert.equal(await app.frame.locator('#play').isVisible(),true); assert.equal(await app.onSession(function(){return JSON.stringify(this.result);}),frozen);
    assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.external,[]);
  } finally {await app.close();}
});

test('production skip/reclaim and expired offer preserve partial credits and exclude inactive time',()=>{
  const run=setup(50); hop(run); run.game.awardCoins(6); run.session.update(1/120);
  const elapsed=run.game.time; run.session.deviceLost('p1'); for(let i=0;i<1000;i++) run.session.update(1/120);
  assert.equal(run.game.time,elapsed); assert.equal(run.session.reclaim('p1','gamepad-0'),true); assert.equal(run.relay.history.events.filter(e=>e.kind==='open').length,1);
  run.session.deviceLost('p1'); assert.equal(run.relay.command({...run.relay.actionToken('p2'),kind:'skip'}),true); assert.equal(run.relay.command({...run.relay.actionToken('p2'),kind:'confirm'}),true);
  const skipped=run.relay.history.legs[0]; assert.equal(skipped.outcome,'skipped'); assert.equal(skipped.distance,1); assert.equal(skipped.coins,run.game.coins); assert.ok(skipped.duration<=elapsed);
  assert.equal(run.relay.confirm(run.relay.confirmation()),true);
  run.game.inPlayerOperation(run.session.players[1], context=>context.end('Actual train contact','train')); run.session.update(1/120);
  const pending=run.relay.history.current; assert.equal(pending.seat,'p2');
  run.game.pause(); const time=run.game.time; for(let i=0;i<2000;i++) run.session.update(1/120); assert.equal(run.game.time,time); run.game.resume();
  for(let i=0;i<1100;i++) run.session.update(1/120);
  const dead=run.relay.history.legs[1]; assert.equal(dead.outcome,'dead'); assert.equal(dead.deaths,1); assert.ok(dead.duration<.1); assert.ok(dead.endTime-dead.startTime>=8*run.session.world.rules.simulation.worldTimeScale);
  assert.equal(run.relay.snapshot().phase,'waiting-for-reclaim');
  assert.equal(run.session.reclaim('p1','gamepad-0'),true); assert.equal(run.relay.history.current,undefined); assert.equal(run.relay.confirm(run.relay.confirmation()),true);
  run.session.depart('p1'); const result=run.relay.result; assert.equal(result.contributions[0].skips,1); assert.equal(result.contributions[1].lifecycle,'dead'); assert.equal(result.legs.length,3);
});

for(const distances of [[0,0,0,0],[3,2,1,0]]) test(`built ${distances} tiers and fresh original controller input navigate results only`, {timeout:45000}, async()=>{
  const {createMarketGameFixture,sessionHudAction}=await import('./market-game-fixture.mjs'); const evidence={errors:[],external:[]}; const app=await createMarketGameFixture(evidence,{gamepads:true});
  const pad=(index,pressed=[])=>({index,id:`result-pad-${index}`,mapping:'standard',connected:true,timestamp:1,axes:[0,0],buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i),value:pressed.includes(i)?1:0,touched:false}))});
  try {
    await app.frame.locator('#local-play').click(); await app.sendPads([pad(0),pad(1)]); await app.sendPads([pad(0,[0]),pad(1)]); await app.sendPads([pad(0),pad(1)]); await app.sendPads([pad(0),pad(1,[0])]); await app.sendPads([pad(0),pad(1)]);
    await app.frame.locator('#relay-play').click(); await app.frame.locator('#local-session-start').click(); await app.advance(80);
    assert.equal(await app.onSession(function(){return this.players.length;}),4);
    for(const seat of ['p1','p2','p3','p4']) {
      await app.onSession(function(seat,count){ for(const lane of this.world.rows.values()) Object.assign(lane,{kind:'meadow',blocked:[],decorations:[],actors:undefined,coin:null}); const player=this.players.find(p=>p.seat===seat); for(let n=0;n<count;n++){ if(!this.dispatch({seat,direction:'forward'})) throw new Error('Production hop rejected'); for(let t=0;t<120&&player.hop>0;t++) this.update(1/120); } },seat,distances[Number(seat.slice(1))-1]);
      await sessionHudAction(app, seat, 'item'); await app.frame.locator('#relay-handoff').getByRole('button',{name:'Leave Relay',exact:true}).click(); if(seat!=='p4') await app.frame.getByRole('button',{name:`Start P${Number(seat.slice(1))+1}'s leg`,exact:true}).click(); }
    await app.advance(80); const frozen=await app.onSession(function(){return JSON.stringify(this.result);}); assert.deepEqual(JSON.parse(frozen).contributions.map(p=>p.rankLabel),distances[0]===0?['=1','=1','=1','=1']:['1','2','3','4']);
    await app.frame.locator('.relay-results-nav button').nth(1).focus();
    await app.sendPads([pad(0,[0]),pad(1)]); assert.equal(await app.frame.locator('#relay-handoff').getAttribute('data-result-view'),'players');
    await app.sendPads([pad(0,[0]),pad(1)]); assert.equal(await app.frame.locator('#relay-handoff').getAttribute('data-result-view'),'players');
    await app.sendPads([pad(0),pad(1)]); await app.sendPads([pad(0,[0]),pad(1)]); assert.equal(await app.frame.locator('#relay-handoff').getAttribute('data-result-view'),'legs');
    await app.resize(900,600); assert.equal(await app.frame.locator('.relay-podium-tier').count(),distances[0]===0?1:4); assert.equal(await app.frame.locator('.relay-podium-tier p').count(),4); if(distances[0]===0) assert.equal(await app.frame.locator('.relay-podium-tier strong').innerText(),'=1');
    assert.deepEqual(await app.frame.locator('.relay-results-podium *').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.top<0||r.bottom>document.querySelector('.relay-results-nav').getBoundingClientRect().top;}).map(n=>n.textContent)),[]);
    await app.iframe.screenshot({path:`/tmp/relay-results-${distances[0]===0?'four-way-tier':'four-ranks'}.png`}); assert.equal(await app.onSession(function(){return JSON.stringify(this.result);}),frozen); assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.external,[]);
  } finally {await app.close();}
});

async function assertBoardContrast(frame) {
  const failures = await frame.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1; const context = canvas.getContext('2d');
    const luminance = color => {
      context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1);
      const values = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
      return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
    };
    const board = document.querySelector('#survive-lifecycle-board') ?? document.querySelector('#relay-handoff');
    return [...board.querySelectorAll('button,h2,h3,p,dt,dd,strong')].filter(node => node.getClientRects().length).flatMap(node => {
      let background = node, color = getComputedStyle(background).backgroundColor;
      while ((color === 'transparent' || color === 'rgba(0, 0, 0, 0)') && background.parentElement) { background = background.parentElement; color = getComputedStyle(background).backgroundColor; }
      const a = luminance(getComputedStyle(node).color), b = luminance(color), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      return ratio < 4.5 ? [{ text: node.textContent, ratio }] : [];
    });
  });
  assert.deepEqual(failures, []);
}


test('skipping selected but unconfirmed runner records the participant event without an unopened leg',()=>{
  const run=setup(50,3); hop(run); run.session.depart('p1'); assert.equal(run.relay.activeSeat,'p2');
  run.session.deviceLost('p2'); assert.equal(run.relay.command({...run.relay.actionToken('p3'),kind:'skip'}),true); assert.equal(run.relay.command({...run.relay.actionToken('p3'),kind:'confirm'}),true);
  assert.equal(run.relay.activeSeat,'p3'); assert.equal(run.relay.history.current,undefined); assert.equal(run.relay.history.legs.length,1);
  const result=run.relay.finish(); assert.equal(result.contributions[1].legs,0); assert.equal(result.contributions[1].skips,1); assert.equal(result.contributions[1].connected,false);
  assert.equal(result.events.filter(e=>e.kind==='skip'&&e.seat==='p2').length,1); assert.equal(result.legs.some(leg=>leg.seat==='p2'),false);
});
