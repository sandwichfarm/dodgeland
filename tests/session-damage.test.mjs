import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';
const sources = await loadSources(['game','session']); after(sources.dispose);
const { Game } = await sources.import('game');
const { LocalSession, composeSessionModeDefinition } = await sources.import('session');
function fixture(suppressPursuit = true) {
  const game = new Game(113,'pond','arcade',false,[],'butter');
  const session = LocalSession.stage(game, { primaryDevice:'keyboard-a', roster:[{seat:'p2',device:'keyboard-b',characterId:'pip'}], mode:composeSessionModeDefinition(game.definition,{suppressPursuit}) }).commit();
  return {game,session};
}
const hit = {cause:'fog',amount:1,reason:'Fog exposure.'};
test('named damage isolates seats, immunity, protection, inactive and invalid requests', () => {
  const {session} = fixture(); const [p1,p2] = session.players;
  assert.equal(session.damage('p2',hit).landed,1); assert.equal(p2.health,2); assert.equal(p1.health,3);
  assert.equal(session.damage('p2',hit).landed,0);
  assert.equal(session.damage('p4',hit).landed,0);
  for(const amount of [0,-1,NaN,Infinity]) assert.equal(session.damage('p1',{...hit,amount}).landed,0);
  session.updateRecovery(p1,r=>({...r,protectionUntil:5})); assert.equal(session.damage('p1',hit).landed,0);
  session.deviceLost('p2'); assert.equal(session.damage('p2',hit).landed,0);
  assert.equal(p1.health,3); assert.equal(p2.health,2);
});
test('named fatal damage owns exactly one death and remains reentrant seat safe', () => {
  const {game,session} = fixture(); const [p1,p2] = session.players;
  p2.onHurt = () => { session.damage('p1',hit); };
  session.damage('p2',hit); assert.equal(p1.health,2); assert.equal(p2.health,2);
  for(let i=0;i<120;i++) session.update(1/120);
  let deaths=0; p2.onEnd=()=>deaths++;
  assert.equal(session.damage('p2',{...hit,amount:3}).landed,2);
  assert.equal(p2.deathCause,'fog'); assert.equal(p2.state,'dead'); assert.equal(deaths,1);
  session.damage('p2',hit); assert.equal(deaths,1); assert.equal(game.health,p1.health);
});
test('validated pursuit opt-out covers advancement, collision, safety and presentation', () => {
  const {game,session} = fixture(); const wave=game.waveRow;
  for(let i=0;i<1440;i++) session.update(1/120);
  assert.equal(game.waveRow,wave); assert.equal(game.pursuitEnabled,false); assert.equal(game.warning,false);
  assert.ok(session.players.every(p=>p.state==='playing'));
  assert.equal(session.isSafeCell({x:0,y:-4}),true);
  const legacy=fixture(false); for(let i=0;i<1440;i++) legacy.session.update(1/120);
  assert.equal(legacy.game.deathCause,'wave');
  assert.throws(()=>composeSessionModeDefinition(game.definition,{suppressPursuit:1}));
});
