import assert from 'node:assert/strict';
import test from 'node:test';
import { createMarketGameFixture, sessionHudAction } from './market-game-fixture.mjs';

const pad = (index, pressed = []) => ({ index, id: `Recovery outcomes ${index}`, mapping: 'standard', connected: true, timestamp: 1,
  axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, button) => ({ value: +pressed.includes(button), pressed: pressed.includes(button), touched: pressed.includes(button) })) });

async function fourPlayers(app) {
  const { frame, sendPads, onGame, advance } = app;
  await sendPads([0, 1, 2, 3].map(index => pad(index)));
  for (let index = 0; index < 4; index++) {
    await sendPads([0, 1, 2, 3].map(seat => pad(seat, seat === index ? [0] : [])));
    await sendPads([0, 1, 2, 3].map(seat => pad(seat)));
  }
  // Arrange a safe course through the existing debugger seam. Recovery and
  // admission authority remain the shipped code, with no added app test API.
  await onGame(function () {
    for (const lane of this.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null, coinActor: undefined, actors: undefined });
  });
  await frame.getByRole('button', { name: /start together/i }).click(); await advance(80);
  assert.deepEqual(await app.onSession(function () { return this.players.map(player => player.seat); }), ['p1', 'p2', 'p3', 'p4']);
}

async function purchase(app, seat, itemId) {
  assert.equal(await app.onSession(function (seat, itemId) {
    const owner = this.players.find(player => player.seat === seat);
    owner.run.advanceScore(100); owner.run.creditCoins(itemId === 'revival' ? 24 : 36); owner.run.open();
    const context = this.openCoOpMarket({ seat, device: owner.device, participantId: owner.participantId });
    const result = this.actCoOpMarket({ actionId: `outcome-buy-${seat}-${itemId}`, seat, device: owner.device, participantId: owner.participantId,
      expectedOwnerGeneration: context.ownerGeneration, expectedInventoryGeneration: context.inventoryGeneration,
      expectedRunRevision: context.runRevision, expectedContextGeneration: context.contextGeneration, kind: 'buy-consumable', itemId });
    owner.run.close(); return result.ok;
  }, seat, itemId), true, 'the real owner transaction purchases the charge');
}

async function die(app, seats) {
  assert.equal(await app.onSession(function (seats) {
    for (const seat of seats) this.world.host.inPlayerOperation(this.players.find(player => player.seat === seat), player => player.end('Recovery outcome train', 'train'));
    this.update(1 / 120);
    return seats.every(seat => this.players.find(player => player.seat === seat).participation === 'dead');
  }, seats), true, 'production terminal events produce authoritative dead targets');
  await app.advance(50);
}

function observe(app) {
  return app.onSession(function () { return { time: this.world.time, charges: this.consumableSnapshot().charges,
    players: this.players.map(player => ({ seat: player.seat, participantId: player.participantId, participation: player.participation,
      x: player.groundX, y: player.groundY, health: player.health, wallet: player.run.wallet,
      cards: player.run.cards, protection: player.recovery.protectionUntil })) }; });
}

async function openItem(app, seat, item) {
  await sessionHudAction(app, seat, 'item');
  await app.frame.getByRole('button', { name: `Use ${item} ×1`, exact: true }).click();
  return app.frame.locator('#survive-recovery-board');
}

for (const [owner, target] of [['p1', 'p3'], ['p2', 'p1']]) test(`${owner}: four-player Revival commits only the selected target and retains the menu pause`, { timeout: 60_000 }, async () => {
  const evidence = { errors: [], external: [] }, app = await createMarketGameFixture(evidence, { gamepads: true });
  try {
    await fourPlayers(app); await purchase(app, owner, 'revival'); await die(app, [target, 'p4']);
    const board = await openItem(app, owner, 'Revival');
    assert.equal(await board.getByRole('heading', { name: 'Choose a teammate', exact: true }).isVisible(), true);
    assert.deepEqual(await board.locator('[data-target]').evaluateAll(nodes => nodes.map(node => node.dataset.target)), [target, 'p4']);
    assert.equal(await app.frame.evaluate(() => document.activeElement?.getAttribute('data-target')), target, 'the first eligible target owns initial focus');
    const before = await observe(app);
    await board.getByRole('button', { name: `Revive ${target.toUpperCase()}`, exact: true }).click();
    await board.getByRole('button', { name: 'Use Revival', exact: true }).click();
    assert.equal(await board.count(), 0);
    const after = await observe(app), returned = after.players.find(player => player.seat === target);
    assert.equal(returned.participation, 'active'); assert.ok(returned.protection > after.time);
    assert.equal(returned.wallet, 0); assert.equal(returned.cards.length, 0);
    assert.equal(after.charges.find(charge => charge.seat === owner).revival, 0);
    assert.deepEqual(after.players.filter(player => player.seat !== target), before.players.filter(player => player.seat !== target), 'teammate positions and economies do not change');
    assert.equal(new Set(after.players.filter(player => player.participation === 'active').map(player => `${player.x}:${player.y}`)).size, 3);
    await app.advance(3000);
    assert.deepEqual(await observe(app), after, 'wall time cannot advance the paused world, offers, or protection');
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  } finally { await app.close(); }
});

test('P2 Flare returns two teammates and regroups paused living P1 without healing or resuming', { timeout: 60_000 }, async () => {
  const evidence = { errors: [], external: [] }, app = await createMarketGameFixture(evidence, { gamepads: true });
  try {
    await fourPlayers(app); await purchase(app, 'p2', 'flare');
    await app.onSession(function () {
      const positions = [[-4, 6], [2, 2], [0, 3], [4, 1]];
      this.players.forEach((player, index) => {
        [player.x, player.y] = positions[index]; player.fromX = player.x; player.fromY = player.y; player.maxY = player.y;
        player.run.creditCoins(index + 7);
      });
    });
    await die(app, ['p3', 'p4']);
    const board = await openItem(app, 'p2', 'Flare');
    assert.equal(await board.getByText('Return P3, P4 and regroup the flock safely.', { exact: true }).isVisible(), true);
    const before = await observe(app), anchor = before.players.find(player => player.seat === 'p2');
    await board.getByRole('button', { name: 'Use Flare', exact: true }).click();
    assert.equal(await board.count(), 0);
    const after = await observe(app);
    assert.equal(after.charges.find(charge => charge.seat === 'p2').flare, 0);
    assert.equal(new Set(after.players.map(player => `${player.x}:${player.y}`)).size, 4, 'all regrouped players occupy distinct cells');
    for (const player of after.players) {
      assert.equal(player.participation, 'active'); assert.ok(player.protection > after.time);
      assert.ok(Math.abs(player.y - anchor.y) <= 2, 'every participant joins the owner’s safe neighborhood');
      const previous = before.players.find(value => value.seat === player.seat);
      assert.equal(player.participantId, previous.participantId);
      assert.equal(player.wallet, previous.wallet); assert.deepEqual(player.cards, previous.cards);
      if (previous.participation === 'active') assert.equal(player.health, previous.health, 'a regroup does not heal a living player');
    }
    const owner = after.players.find(player => player.seat === 'p2');
    assert.deepEqual([owner.x, owner.y], [anchor.x, anchor.y]);
    assert.notDeepEqual([after.players[0].x, after.players[0].y], [before.players[0].x, before.players[0].y], 'paused P1 is included in the regroup');
    await app.advance(3000); assert.deepEqual(await observe(app), after, 'the successful Flare preserves the menu pause');
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  } finally { await app.close(); }
});

test('zero-target, stale-target, and unsafe Flare UI outcomes retain charges and positions', { timeout: 60_000 }, async () => {
  const evidence = { errors: [], external: [] }, app = await createMarketGameFixture(evidence, { gamepads: true });
  try {
    await fourPlayers(app); await purchase(app, 'p1', 'revival'); await purchase(app, 'p1', 'flare');
    for (const item of ['Revival', 'Flare']) {
      const board = await openItem(app, 'p1', item), before = await observe(app);
      assert.equal(await board.getByText(item === 'Revival' ? 'No teammate can be revived right now.' : 'No teammate needs a flare right now.', { exact: true }).isVisible(), true);
      assert.equal(await board.getByRole('button', { name: `Use ${item}`, exact: true }).count(), 0);
      await board.getByRole('button', { name: 'Back to paused run', exact: true }).click();
      assert.deepEqual(await observe(app), before);
    }
    await app.frame.getByRole('button', { name: 'Close details', exact: true }).click();
    await app.frame.getByRole('button', { name: 'Resume game', exact: true }).click();
    await die(app, ['p3']);
    let board = await openItem(app, 'p1', 'Revival');
    assert.equal(await app.onSession(function () { return this.recover({ kind: 'personal', ownerSeat: 'p3' }); }), true);
    const changed = await observe(app);
    await board.getByRole('button', { name: 'Use Revival', exact: true }).click();
    assert.equal(await board.getByText('P3 can’t return safely yet. Revival kept.', { exact: true }).isVisible(), true);
    assert.deepEqual(await observe(app), changed, 'a target recovered elsewhere cannot consume the old selection');
    await board.getByRole('button', { name: 'Back to paused run', exact: true }).click();
    await app.frame.getByRole('button', { name: 'Close details', exact: true }).click();
    await app.frame.getByRole('button', { name: 'Resume game', exact: true }).click();
    await die(app, ['p4']);
    board = await openItem(app, 'p1', 'Flare');
    assert.equal(await app.frame.evaluate(() => document.activeElement?.textContent), 'Back to paused run');
    await app.onSession(function () { for (const lane of this.world.rows.values()) lane.blocked = Array.from({ length: 11 }, (_, index) => index - 5); });
    const unsafe = await observe(app);
    await board.getByRole('button', { name: 'Use Flare', exact: true }).click();
    assert.equal(await board.getByText('The flock can’t regroup safely yet. Flare kept.', { exact: true }).isVisible(), true);
    assert.deepEqual(await observe(app), unsafe, 'failed placement neither spends a charge nor partially relocates the flock');
    assert.deepEqual(evidence.errors, []); assert.deepEqual(evidence.external, []);
  } finally { await app.close(); }
});

test('public Revival selects a safe return beyond occupied river traffic rail and mob cells', { timeout: 60_000 }, async () => {
  // Component-world arrangement only: market eligibility/wallet, initial poses,
  // spent innate cooldown and hazard geometry. Purchase/death/revival use the app.
  const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{gamepads:true});
  try {
    await fourPlayers(app);
    await app.onSession(function(){const owner=this.players[0];owner.run.advanceScore(100);owner.run.creditCoins(24);});
    await app.advance(80);await app.frame.locator('#market-open').click();
    await app.frame.locator('#market-owner-strip [data-id="p1"]').click();
    const offer=app.frame.locator('[data-market-action="inspect"][data-id="consumable:consumable:revival"]');
    for(let page=0;page<10&&!await offer.isVisible();page++){
      assert.equal(await app.frame.locator('#market-next').isEnabled(),true,'Revival remains reachable in the owned market');
      await app.frame.locator('#market-next').click();
    }
    await offer.click();await app.frame.locator('#market-inspect-action').click();
    let state=await observe(app);assert.equal(state.charges.find(c=>c.seat==='p1').revival,1);assert.equal(state.players[0].wallet,0);
    if(await app.frame.locator('#market-inspect').isVisible())await app.frame.locator('#market-inspect-back').click();
    await app.frame.locator('#market-close').click();await app.advance(350);
    const resume=app.frame.getByRole('button',{name:'Resume game',exact:true});if(await resume.isVisible()){await resume.click();await app.advance(80);}
    assert.equal(await app.frame.locator('#market').isVisible(),false);
    assert.equal(await app.frame.locator('#app').getAttribute('data-run-state'),'playing');
    await app.onSession(function(){
      const poses=[[0,5],[4,3],[0,7],[5,3]];
      for(const[p,pose]of this.players.map((p,i)=>[p,poses[i]])){p.x=p.fromX=pose[0];p.y=p.fromY=p.maxY=pose[1];p.hop=0;}
      const target=this.players[2];target.powerReadyAt=10000;target.run.creditCoins(17);
      const lane=this.world.rows.get(8);Object.assign(lane,{kind:'river',blocked:[],decorations:[],coin:null,coinActor:undefined,actors:undefined,phase:10,speed:0,spacing:20,length:1,variant:0});
    });
    await app.sendPads([0,1,2,3].map(i=>pad(i)));
    await app.sendPads([0,1,2,3].map(i=>pad(i,i===2?[12]:[])));
    await app.sendPads([0,1,2,3].map(i=>pad(i)));await app.advance(300);
    const death=await app.onSession(function(){const p=this.players[2];return{state:p.state,cause:p.deathCause,deaths:p.statistics.deaths,wallet:p.run.wallet};});
    assert.deepEqual(death,{state:'dead',cause:'water',deaths:1,wallet:0},'real unsupported forward landing produces one owner death');
    const board=await openItem(app,'p1','Revival');
    assert.equal(await app.onGame(function(){return this.state;}),'paused');
    await app.onSession(function(){
      // Only (2,3) is available: row5 platform belongs to P1; row4 has
      // a car at0 and a resting mob at2; row3 has a full-length train centered -5.5 and P2/P4 at4/5.
      const set=(row,kind,extra)=>Object.assign(this.world.rows.get(row),{kind,coin:null,coinActor:undefined,actors:undefined,decorations:[],blocked:[],phase:0,speed:0,spacing:20,length:1.15,variant:0,...extra});
      set(5,'river',{});
      set(4,'road',{length:2,blocked:[-5,-4,-3,-2,-1,1,3,4,5]});
      set(3,'rail',{direction:1,period:20,warning:2,phase:2+13.5/38*1.75-this.world.time,length:12.6,blocked:[-5,-4,-3,-2,-1,1,3]});
      this.world.mobs.length=0;this.world.mobs.push({id:9001,kind:'slime',x:2,y:4,fromX:2,fromY:4,targetX:2,targetY:4,phase:'rest',phaseLeft:10,phaseDuration:10});
    });
    const before=await observe(app);
    await board.getByRole('button',{name:'Revive P3',exact:true}).click();
    await board.getByRole('button',{name:'Use Revival',exact:true}).click();
    assert.equal(await board.count(),0);
    state=await observe(app);const returned=state.players.find(p=>p.seat==='p3');
    assert.deepEqual([returned.x,returned.y],[2,3],'safe fallback avoids occupied cells, unsupported water, car, train and mob');
    assert.equal(returned.participation,'active');assert.ok(returned.protection>state.time);assert.equal(returned.wallet,0);assert.equal(returned.cards.length,0);
    assert.equal(state.charges.find(c=>c.seat==='p1').revival,0);
    assert.deepEqual(state.players.filter(p=>p.seat!=='p3'),before.players.filter(p=>p.seat!=='p3'));
    assert.equal(new Set(state.players.map(p=>`${p.x}:${p.y}`)).size,4);
    assert.equal(state.time,before.time);assert.equal(await app.onGame(function(){return this.state;}),'paused');
    await app.advance(3000);assert.deepEqual(await observe(app),state,'menu pause freezes the successful return and its protection');
    assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);
  }finally{await app.close();}
});
