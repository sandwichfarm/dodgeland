import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const sources = await loadSources(['game', 'session', 'gamepad', 'session-input']);
after(() => sources.dispose());
const { Game } = await sources.import('game');
const { LocalSession } = await sources.import('session');
const { createGamepadControls } = await sources.import('gamepad');
const { GamepadRouter } = await sources.import('session-input');

const buttons = pressed => Array.from({ length: 17 }, (_, index) => ({
  value: pressed.includes(index) ? 1 : 0,
  pressed: pressed.includes(index),
  touched: pressed.includes(index),
}));
const pad = (index, { id = `Fixture controller ${index}`, pressed = [], axes = [0, 0], mapping = 'standard' } = {}) => ({
  index, id, mapping, connected: true, timestamp: 1, axes, buttons: buttons(pressed),
});
const snapshot = (pads, focused = true) => ({ available: true, focused, pads });

function emitter(extra = {}) {
  const listeners = new Map();
  return {
    ...extra,
    addEventListener(name, callback) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(callback); },
    removeEventListener(name, callback) { listeners.get(name)?.delete(callback); },
    emit(name, event) { for (const callback of listeners.get(name) ?? []) callback(event); },
  };
}

function startSession() {
  const game = new Game(71, 'pond', 'arcade', false, [], 'butter');
  for (const row of game.rows.values()) Object.assign(row, { kind: 'meadow', blocked: [], decorations: [], coin: null, phase: 0, speed: 1, spacing: 20, length: 1.15, variant: 0 });
  const session = LocalSession.stage(game, { secondaryCharacterId: 'pip' }).commit();
  return { game, session, p1: session.players.find(player => player.seat === 'p1'), p2: session.players.find(player => player.seat === 'p2') };
}

function transport(onSnapshot) {
  let handler;
  const domain = {
    available: true,
    focused: true,
    getGamepads: () => [],
    onChange(callback) { handler = callback; return { close() {} }; },
  };
  const host = emitter({ parent: {}, napplet: { gamepad: domain } });
  const page = emitter({ hidden: false });
  const controls = createGamepadControls({ context: () => 'legacy', direction() {}, confirm() {}, pause() {}, call() {}, back() {}, menu() {} }, host, page, () => 0, onSnapshot);
  return { controls, send: state => handler(state) };
}

test('two pads move two session players through the production transport and independent router state', () => {
  const { session, p1, p2 } = startSession();
  const router = new GamepadRouter({ context: () => 'play', dispatch: action => session.dispatch(action) });
  const wire = transport((state, now) => router.receive(state, now));
  wire.send(snapshot([pad(0), pad(1)]));
  router.assign({ index: 0, id: 'Fixture controller 0' }, 'p1');
  router.assign({ index: 1, id: 'Fixture controller 1' }, 'p2');
  wire.send(snapshot([pad(0), pad(1)]));
  wire.send(snapshot([pad(0, { pressed: [12] }), pad(1, { pressed: [15] })]));
  assert.equal(p1.y, 1);
  assert.equal(p2.x, p2.fromX + 1);
  wire.controls.close();
});

test('join consumed ignores idle pads and consumes second-controller activity before actions', () => {
  const requests = [], actions = [];
  const router = new GamepadRouter({
    context: () => 'setup',
    dispatch: action => { actions.push(action); return true; },
    requestLocalPlay: device => requests.push(device),
  });
  router.receive(snapshot([pad(0), pad(1)]), 0);
  assert.deepEqual(requests, []);
  router.receive(snapshot([pad(0), pad(1, { pressed: [0, 12] })]), 1);
  assert.deepEqual(requests.map(request => request.index), [1]);
  assert.deepEqual(actions, []);
  router.receive(snapshot([pad(0), pad(1, { pressed: [0, 12] })]), 2);
  assert.equal(requests.length, 1, 'a held join edge stays consumed');
});

test('independent repeat schedules and unknown mappings never dispatch across devices', () => {
  const actions = [];
  const router = new GamepadRouter({ context: () => 'play', dispatch: action => { actions.push(action); return true; } });
  router.receive(snapshot([pad(0), pad(1)]), 0);
  router.assign({ index: 0, id: 'Fixture controller 0' }, 'p1');
  router.assign({ index: 1, id: 'Fixture controller 1' }, 'p2');
  router.receive(snapshot([pad(0), pad(1)]), 1);
  router.receive(snapshot([pad(0, { pressed: [12] }), pad(1, { pressed: [15] })]), 2);
  router.update(282);
  router.update(442);
  assert.deepEqual(actions.map(action => action.seat), ['p1', 'p2', 'p1', 'p2', 'p1', 'p2']);
  router.receive(snapshot([pad(0, { mapping: 'xinput', pressed: [12] })]), 443);
  router.update(10000);
  assert.equal(actions.length, 6);
});

test('malformed transport states clear held repeat instead of retaining a stuck action', () => {
  const actions = [];
  const router = new GamepadRouter({ context: () => 'play', dispatch: action => { actions.push(action); return true; } });
  const wire = transport((state, now) => router.receive(state, now));
  wire.send(snapshot([pad(0)]));
  router.assign({ index: 0, id: 'Fixture controller 0' }, 'p1');
  wire.send(snapshot([pad(0)]));
  wire.send(snapshot([pad(0, { pressed: [12] })]));
  wire.send({ available: true, focused: true, pads: [{ ...pad(0), axes: [Infinity] }] });
  router.update(10000);
  assert.equal(actions.length, 1);
  wire.controls.close();
});
