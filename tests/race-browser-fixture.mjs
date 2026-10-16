import assert from 'node:assert/strict';
const intent={sender:'race-runtime',archetype:'game',action:'open',convention:'napplet:game/open',payload:{seed:'ph3-00000071-pond-s-n'}};
async function start(app,finish='500'){const f=app.frame;await f.locator('#local-play').click();await f.locator('#race-play').click();await f.locator('#race-finish').fill(finish);await f.locator('#local-session-start').click();await app.advance(32);return f;}


async function earnTogether(app,goal){
 const {loadSources}=await import('./source-loader.mjs'),source=await loadSources(['game']);const {platformSupports,laneActors}=await source.import('game');
 try{for(let tries=0;tries<1500;tries++){
   const s=await app.onSession(function(){return {time:this.world.time,scale:this.world.rules.simulation.worldTimeScale,rows:[...this.world.rows],players:this.players.map(p=>({x:p.x,y:p.y,ground:p.groundY,earned:p.earnedDistance,cause:p.deathCause,state:p.state,health:p.health,hop:p.hop})),safeSides:[-1,0,1].map(dx=>!this.world.host.mobHazard(this.players[0].x,this.players[0].y,this.players[0].x+dx,this.players[0].y,this.world.time,this.world.time+.2*this.world.rules.simulation.worldTimeScale,.4)),safeForward:this.players.map(p=>!this.world.host.mobHazard(p.x,p.y,p.x,p.y+1,this.world.time,this.world.time+.2*this.world.rules.simulation.worldTimeScale,.4))};});
   if(s.players[0].earned>=goal)return s;
   assert.equal(s.players[0].state,'playing',JSON.stringify(s.players));
   const rows=new Map(s.rows),p=s.players[0],next=rows.get(p.y+1),now=s.time,arrival=now+.15*s.scale;
   const safe=(lane,x)=>Math.abs(x)<=5&&lane&&!lane.blocked.includes(Math.round(x))&&(lane.kind!=='river'||[.10,.14,.17,.22].every(t=>platformSupports(lane,x,now+t*s.scale)))&&(!['road','rail'].includes(lane.kind)||[now,now+.05*s.scale,now+.10*s.scale,arrival,arrival+.15*s.scale].every(t=>laneActors(lane,t).every(a=>Math.abs(a.x-x)>a.length/2+.5)));
   let key;
   const current=rows.get(p.y);
   if(current?.kind==='meadow'&&current.coin!==null&&Math.abs(current.coin-p.x)>.4&&safe(current,p.x+Math.sign(current.coin-p.x))&&s.safeSides[Math.sign(current.coin-p.x)+1])key=current.coin<p.x?['a','ArrowLeft']:['d','ArrowRight'];
   else if(safe(next,p.x)&&s.safeForward[0])key=['w','ArrowUp'];
   else if(next?.blocked.includes(Math.round(p.x))||!safe(rows.get(p.y),p.x)){const targets=Array.from({length:11},(_,i)=>i-5).filter(x=>safe(next,x)).sort((a,b)=>Math.abs(a-p.x)-Math.abs(b-p.x));if(targets.length){const dx=Math.sign(targets[0]-p.x);const choices=[dx,-dx].filter(d=>d&&safe(rows.get(p.y),p.x+d)&&s.safeSides[d+1]);if(choices.length)key=choices[0]<0?['a','ArrowLeft']:['d','ArrowRight'];}}
   if(key){await app.frame.locator('#scene').focus();await app.page.keyboard.press(key[0]);await app.advance(170);}else await app.advance(25);
 }
 throw new Error('No safe input route reached earned goal');}finally{await source.dispose();}
}

const pad=(index,pressed=[])=>({index,id:`race-pad-${index}`,connected:true,mapping:'standard',timestamp:1,axes:[0,0],buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i),value:pressed.includes(i)?1:0,touched:false}))});
async function mixedSetup(app,{finish='500',seconds='180',index=0}={}){
 const f=app.frame;await f.locator('#local-play').click();await f.locator('#session-roster [data-seat="p2"]').click();await f.getByRole('button',{name:'Leave this seat',exact:true}).click();await app.sendPads([pad(index)]);await app.sendPads([pad(index,[0])]);await app.sendPads([pad(index)]);await f.locator('#race-play').click();assert.equal(await f.locator('#race-finish').inputValue(),'500');assert.equal(await f.locator('#race-time').inputValue(),'180');await f.locator('#race-finish').fill(finish);await f.locator('#race-time').fill(seconds);await f.locator('#local-session-start').click();await app.advance(32);await f.locator('#scene').focus();
}
async function freshReclaim(app,index){await app.sendPads([pad(index)]);await app.sendPads([pad(index,[0])]);await app.sendPads([pad(index)]);await app.sendPads([pad(index,[0])]);await app.sendPads([pad(index)]);}


export {intent,start,earnTogether,pad,mixedSetup,freshReclaim};
