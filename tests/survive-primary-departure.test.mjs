import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';
import { semanticValue } from './solo-parity-snapshot.mjs';

const source = await loadSources(['game', 'session', 'survive-together']);
after(source.dispose);
const { Game } = await source.import('game');
const { LocalSession } = await source.import('session');
const { createSurviveTogetherDefinition } = await source.import('survive-together');

for (const mode of ['arcade', 'stroll']) test(`${mode}: P1 departure releases a reusable seat without replacing the world or granting another personal revive`, () => {
  const game = new Game(113, 'pond', mode, false, [], 'butter');
  for (const lane of game.rows.values()) Object.assign(lane, { kind: 'meadow', blocked: [], decorations: [], coin: null, actors: undefined, coinActor: undefined });
  const session = LocalSession.stage(game, { mode: createSurviveTogetherDefinition(game.definition), roster: [
    { seat: 'p2', device: 'keyboard-b', characterId: 'sunny' },
    { seat: 'p3', device: 'gamepad-2', characterId: 'pip' },
    { seat: 'p4', device: 'gamepad-3', characterId: 'petal' },
  ] }).commit();
  const former = session.players[0], teammates = session.players.slice(1);
  game.inPlayerOperation(former, player => player.end('Primary departure train', 'train')); session.update(1 / 120);
  assert.equal(session.recover({ kind: 'personal', ownerSeat: 'p1' }), true);
  assert.equal(former.recovery.charge, 'spent'); former.run.creditCoins(23);
  const world = session.world, rows = game.rows, time = game.time, rowValues = semanticValue(rows);
  const formerInventory = semanticValue(former.run), teamInventories = teammates.map(player => semanticValue(player.run)), priorSpill = former.deathSpill;
  assert.equal(session.depart('p1'), true);
  assert.strictEqual(former.deathSpill, priorSpill, 'departure itself does not create another spill');
  assert.equal(session.players.length, 3);
  assert.equal(session.admit({ seat: 'p1', device: 'keyboard-a', characterId: 'butter' }), true, 'the vacated first seat is available to a deliberate new join');
  const newcomer = session.players.find(player => player.seat === 'p1');
  assert.notStrictEqual(newcomer, former); assert.notStrictEqual(newcomer.run, former.run);
  assert.notEqual(newcomer.participantId, former.participantId, 'new participation is distinct from the archived player');
  assert.equal(newcomer.recovery.grantId, former.recovery.grantId, 'known returning device/character retains recovery provenance');
  assert.equal(newcomer.recovery.charge, 'spent', 'departure and re-entry cannot farm personal charges');
  assert.equal(newcomer.run.wallet, 0); assert.equal(newcomer.run.cards.length, 0);
  assert.deepEqual(semanticValue(former.run), formerInventory);
  assert.deepEqual(teammates.map(player => semanticValue(player.run)), teamInventories);
  assert.strictEqual(session.world, world); assert.strictEqual(game.rows, rows); assert.equal(game.time, time);
  assert.deepEqual(semanticValue(rows), rowValues, 'admission cannot regenerate or advance the existing course');
  assert.equal(new Set(session.players.map(player => player.characterId)).size, 4);
  assert.equal(new Set(session.players.map(player => `${player.groundX}:${player.groundY}`)).size, 4);
  const archive = session.contributions[0], archivedCopy = semanticValue(archive);
  assert.equal(archive.participantId, former.participantId);
  assert.equal(session.dispatch({ seat: 'p1', direction: 'forward' }), true, 'the new P1 has its own working movement path');
  for (let step = 0; step < 40; step++) session.update(1 / 120);
  assert.ok(newcomer.statistics.distance >= 1);
  assert.ok(game.time > time); assert.deepEqual(semanticValue(archive), archivedCopy, 'new P1 movement cannot change the retired contribution');
  assert.deepEqual(semanticValue(former.run), formerInventory);
});
