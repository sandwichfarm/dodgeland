import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'race', 'session', 'mode-rules', 'survive-together', 'consumables', 'consumable-drops']);
after(sources.dispose);
const { Game } = await sources.import('game');
const { createRaceSession } = await sources.import('race');

test('common world dependency: installed capability must not grant legacy Revival capacity', async () => {
  const game = new Game(3338952125, 'pond', 'arcade', false, [], 'butter');
  const race = createRaceSession(game, { seats: [
    { seat: 'p1', device: 'keyboard-a', characterId: 'butter' },
    { seat: 'p2', device: 'keyboard-b', characterId: 'pip' },
  ] });
  // Exercise the delivered common opt-in, not a replacement pickup implementation.
  const { CONSUMABLES } = await sources.import('consumables');
  const { DEFAULT_ITEM_SCHEMA } = await sources.import('consumable-drops');
  race.session.installConsumableWorld({catalogue: CONSUMABLES, schema: DEFAULT_ITEM_SCHEMA, capabilities: [], eligible: () => true, activate: () => false});
  const pickup = race.session.consumableSnapshot().pickups.find(p => p.itemId === 'revival');
  assert.ok(pickup, 'released seed provides a known legacy pickup for this dependency reproduction');
  const owner = race.session.players[0];
  owner.x = owner.fromX = pickup.x;
  owner.y = owner.fromY = pickup.y;
  owner.hop = 0;
  race.session.update(1 / 120);
  const state = race.session.consumableSnapshot();
  assert.equal(state.charges.find(p => p.seat === 'p1').revival, 0,
    'the common world must apply its installed mode capability rather than hardcoded Survive eligibility');
  assert.equal(state.claims.length, 0, 'a denied legacy claim must leave pickup and owner statistics unchanged');
  assert.equal(owner.statistics.itemsFound, 0);
});

test('common world dependency control: released Survive pickup still grants its owner once', async () => {
  const { LocalSession } = await sources.import('session');
  const { SOLO_ARCADE_MODE } = await sources.import('mode-rules');
  const { createSurviveTogetherDefinition } = await sources.import('survive-together');
  const game = new Game(3338952125, 'pond', 'arcade', false, [], 'butter');
  const session = LocalSession.stage(game, { roster: [{ seat: 'p2', device: 'keyboard-b', characterId: 'pip' }], mode: createSurviveTogetherDefinition(SOLO_ARCADE_MODE) }).commit();
  const pickup = session.consumableSnapshot().pickups.find(p => p.itemId === 'revival');
  const owner = session.players[0];
  owner.x = owner.fromX = pickup.x;
  owner.y = owner.fromY = pickup.y;
  owner.hop = 0;
  session.update(1 / 120);
  assert.equal(session.consumableSnapshot().charges.find(p => p.seat === 'p1').revival, 1);
  assert.equal(session.consumableSnapshot().claims.length, 1);
  assert.equal(owner.statistics.itemsFound, 1);
});

test('generic cooldown preserves real primary and secondary interpolation and freezes with active clock', () => {
  for (const seat of ['p1','p2']) {
    const game = new Game(113,'pond','arcade',false,[],'butter');
    const race = createRaceSession(game,{seats:[{seat:'p1',device:'keyboard-a',characterId:'butter'},{seat:'p2',device:'keyboard-b',characterId:'pip'}]});
    for(const row of game.rows.values()) Object.assign(row,{kind:'meadow',blocked:[],coin:null});
    const p=race.session.players.find(p=>p.seat===seat),other=race.session.players.find(p=>p!==race.session.players.find(q=>q.seat===seat));
    assert.equal(p.setHopCooldown(NaN,2),false);
    assert.equal(p.setHopCooldown(1.35,2),true);
    assert.equal(race.session.dispatch({seat,direction:'forward'}),true);
    assert.equal(p.hop,game.rules.movement.hopDuration);
    assert.equal(p.groundY,0);
    for(let i=0;i<100&&p.hop>0;i++)race.session.update(1/120);
    assert.equal(p.groundY,1,'normal-duration hop lands at unchanged position');
    assert.equal(race.session.dispatch({seat,direction:'forward'}),false,'only next hop is delayed');
    assert.equal(other.hopCooldown.multiplier,1);
    game.pause();const until=p.hopCooldown;race.session.update(1);assert.deepEqual(p.hopCooldown,until);game.resume();
    for(let i=0;i<20;i++)race.session.update(1/120);
    assert.equal(race.session.dispatch({seat,direction:'forward'}),true);
    for(let i=0;i<260;i++)race.session.update(1/120);
    assert.equal(p.hopCooldown.multiplier,1);
  }
});
