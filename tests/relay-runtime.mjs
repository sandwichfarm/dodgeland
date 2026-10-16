import test from 'node:test';
import assert from 'node:assert/strict';
import { createMarketGameFixture } from './market-game-fixture.mjs';

async function start(app, length = 50) {
  await app.frame.locator('#local-play').click();
  await app.frame.locator('#relay-play').click();
  await app.frame.locator('#relay-tiles').fill(String(length));
  await app.frame.locator('#local-session-start').click(); await app.advance(80);
  await app.onSession(function () { for (const lane of this.world.rows.values()) Object.assign(lane, {kind:'meadow',blocked:[],decorations:[],actors:undefined,coin:null}); });
}
async function marketStock(app) {
  await app.onSession(function () {
    for (const player of this.players) {
      const run=player.run; run.advanceScore(100); run.creditCoins(200);
      const item=run.catalog.get('magnet'); run.market.offers=[{id:'active-offer',itemId:item.id,price:item.price,sold:false,section:'cards'}]; run.revision++;
    }
  }); await app.advance(80);
}
const owners = app => app.onSession(function () { return this.players.map(p=>({seat:p.seat,wallet:p.run.wallet,cards:p.run.cards,open:p.run.isOpen,revision:p.run.revision})); });

test('built active Relay market buys through the existing authoritative adapter without installing world consumables', {timeout:30000}, async()=>{
  const evidence={errors:[],external:[]}, app=await createMarketGameFixture(evidence);
  try {
    await start(app); await marketStock(app);
    const before=await owners(app);
    assert.equal(await app.onSession(function(){return this.consumableSnapshot()===undefined;}),true);
    await app.frame.locator('#market-open').click(); await app.advance(100);
    assert.equal((await owners(app))[0].open,true,'valid active runner must open its real inventory');
    await app.frame.locator('[data-market-action="inspect"][data-id="offer:active-offer"]').click();
    await app.frame.locator('#market-inspect-action').click(); await app.advance(100);
    const after=await owners(app); assert.equal(after[0].cards.length,1); assert.ok(after[0].wallet<before[0].wallet); assert.deepEqual(after[1],before[1]);
    assert.equal(await app.onSession(function(){return this.consumableSnapshot()===undefined;}),true);
    assert.equal(await app.frame.locator('[data-market-action="buy-consumable"]').count(),0);
    assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.external,[]);
  } finally {await app.close();}
});

test('built inactive Relay inspection names its owner and exposes the exact read-only reason in the single tree', {timeout:30000}, async()=>{
  const evidence={errors:[],external:[]}, app=await createMarketGameFixture(evidence);
  try {
    await start(app); await marketStock(app);
    await app.frame.locator('#session-seats [data-seat="p2"] .session-hud-identity').click(); await app.advance(80);
    await app.frame.locator('#market-open').click(); await app.advance(100);
    assert.match(await app.frame.locator('#market-owner').innerText(),/^Viewing P2 · /);
    assert.match(await app.frame.locator('#market-window').innerText(),/Only the active runner can use the relay hand\./);
    assert.equal(await app.frame.locator('#market').count(),1); assert.equal(await app.frame.locator('#run-inventory').count(),1);
    assert.equal(await app.frame.locator('#run-hand-items').innerText(),'Items: —');
    const before=await owners(app); await app.advance(1000); assert.deepEqual(await owners(app),before);
    assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.external,[]);
  } finally {await app.close();}
});
