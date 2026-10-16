import assert from 'node:assert/strict';
import test from 'node:test';
import {createMarketGameFixture} from './market-game-fixture.mjs';

const intent={sender:'race-runtime',archetype:'game',action:'open',convention:'napplet:game/open',payload:{seed:'ph3-00000071-pond-s-n'}};
async function start(app,finish='500'){const f=app.frame;await f.locator('#local-play').click();await f.locator('#race-play').click();await f.locator('#race-finish').fill(finish);await f.locator('#local-session-start').click();await app.advance(32);return f;}

test('camera fog ribbon edge marker HUD and reduced motion retain authoritative observations',{timeout:30000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true,initialIntent:intent});
 try{const f=await start(app);assert.equal(await f.locator('[data-race-fog]').count(),2);assert.match(await f.locator('#session-seats').innerText(),/Power.*100/);assert.match(await f.locator('#session-seats').innerText(),/Personal revive.*250/);assert.equal(await f.locator('[data-race-boundary]').count(),1);await f.locator('#scene').focus();await app.page.keyboard.press('w');await app.advance(300);const state=await app.onSession(function(){return {frontier:this.result?.leaderFrontier,earned:this.players[0].earnedDistance};});assert.equal(state.earned,1);assert.match(await f.locator('[data-race-lead]').innerText(),/Lead 1/);assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);}finally{await app.close();}
});
test('Viewing P owner Race gear Wardrobe no legacy surface',{timeout:30000},async()=>{
 const evidence={errors:[],external:[]},app=await createMarketGameFixture(evidence,{auditBoundary:true,initialIntent:intent});
 try{const f=await start(app);assert.equal(await f.locator('#run-inventory:visible').count(),1);assert.equal(await f.locator('.run-hand-empty').count(),0);await f.getByRole('button',{name:'Race gear',exact:true}).click();assert.match(await f.locator('#market-owner').innerText(),/Viewing P1.*Butter/);assert.equal(await f.locator('#market-heading').innerText(),'Race gear');assert.equal(await f.locator('#market').getByText('Mud Splash',{exact:true}).count(),1);assert.equal(await f.locator('#market').getByText('Fog Lantern',{exact:true}).count(),1);assert.equal(await f.locator('#market').getByRole('button',{name:'Wardrobe',exact:true}).count(),1);assert.equal(await f.locator('.run-hand-empty').count(),0);assert.deepEqual(evidence.errors,[]);}finally{await app.close();}
});
