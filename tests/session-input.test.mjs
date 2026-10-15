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

function trackedRouter(options) {
  const events = [], lifecycle = options.lifecycle;
  const router = new GamepadRouter({ ...options, lifecycle: event => { events.push(event); lifecycle?.(event); } });
  return { router, events };
}

function issued(events, index) {
  const event = events.find(candidate => candidate.type === 'seen' && candidate.device.index === index);
  assert.ok(event, `expected an issued lease at index ${index}`);
  return event.device;
}

test('two pads move two session players through the production transport and independent router state', () => {
  const { session, p1, p2 } = startSession();
  const { router, events } = trackedRouter({ context: () => 'play', dispatch: action => session.dispatch(action) });
  const wire = transport((state, now) => router.receive(state, now));
  wire.send(snapshot([pad(0), pad(1)]));
  router.assign(issued(events, 0), 'p1');
  router.assign(issued(events, 1), 'p2');
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

test('the first fresh controller claims solo P1 while its edge still dispatches, then another pad requests Local Play', () => {
  const actions = [], joins = [];
  let router;
  router = new GamepadRouter({
    context: () => 'solo',
    dispatch: action => { actions.push(action); return true; },
    requestFirstPlayer: device => router.assign(device, 'p1', true),
    requestLocalPlay: device => joins.push(device),
  });
  router.receive(snapshot([pad(0, { id: 'Idle A' }), pad(1, { id: 'First B' })]), 0);
  router.receive(snapshot([pad(0, { id: 'Idle A' }), pad(1, { id: 'First B', pressed: [12] })]), 1);
  assert.deepEqual(actions, [{ seat: 'p1', direction: 'forward' }], 'B owns P1 and its original forward edge remains live');
  assert.deepEqual(joins, []);
  router.receive(snapshot([pad(0, { id: 'Idle A' }), pad(1, { id: 'First B' })]), 2);
  router.receive(snapshot([pad(0, { id: 'Idle A', pressed: [0] }), pad(1, { id: 'First B' })]), 3);
  assert.deepEqual(joins.map(device => device.index), [0], 'the later fresh A edge enters Local Play');
});

test('simultaneous first-pad start and second-pad join survive the context change in one shell snapshot', () => {
  const joins = [];
  let context = 'solo:ready';
  let router;
  router = new GamepadRouter({
    context: () => context,
    dispatch: () => true,
    action: (_seat, action) => { if (action === 'confirm') context = 'solo:playing'; },
    requestFirstPlayer: device => router.assign(device, 'p1', true),
    requestLocalPlay: device => joins.push(device),
  });
  router.receive(snapshot([pad(0), pad(1)]), 0);
  router.receive(snapshot([pad(0, { pressed: [0] }), pad(1, { pressed: [0] })]), 1);
  assert.deepEqual(joins.map(device => device.index), [1], 'the later stable-index edge opens setup instead of being seeded away');
});

test('an assigned second seat is seeded when a same-frame pause changes context', () => {
  const actions = [];
  let context = 'session:playing';
  const { router, events } = trackedRouter({
    context: () => context,
    dispatch: () => true,
    action: (seat, action) => { actions.push({ seat, action }); if (action === 'pause') context = 'session:paused'; },
  });
  router.receive(snapshot([pad(0), pad(1)]), 0);
  router.assign(issued(events, 0), 'p1'); router.assign(issued(events, 1), 'p2');
  router.receive(snapshot([pad(0), pad(1)]), 1);
  router.receive(snapshot([pad(0, { pressed: [9] }), pad(1, { pressed: [0] })]), 2);
  assert.deepEqual(actions, [{ seat: 'p1', action: 'pause' }], 'P2 confirm is seeded instead of acting through P1’s newly opened pause context');
});

test('independent repeat schedules and unknown mappings never dispatch across devices', () => {
  const actions = [];
  const { router, events } = trackedRouter({ context: () => 'play', dispatch: action => { actions.push(action); return true; } });
  router.receive(snapshot([pad(0), pad(1)]), 0);
  router.assign(issued(events, 0), 'p1');
  router.assign(issued(events, 1), 'p2');
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
  const { router, events } = trackedRouter({ context: () => 'play', dispatch: action => { actions.push(action); return true; } });
  const wire = transport((state, now) => router.receive(state, now));
  wire.send(snapshot([pad(0)]));
  router.assign(issued(events, 0), 'p1');
  wire.send(snapshot([pad(0)]));
  wire.send(snapshot([pad(0, { pressed: [12] })]));
  wire.send({ available: true, focused: true, pads: [{ ...pad(0), axes: [Infinity] }] });
  router.update(10000);
  assert.equal(actions.length, 1);
  wire.controls.close();
});

test('replacement at one index disconnects the old lease before seeing its new identity', () => {
  const lifecycle = [];
  const { router, events } = trackedRouter({ context: () => 'play', dispatch: () => true, lifecycle: event => lifecycle.push(event) });
  router.receive(snapshot([pad(2, { id: 'Alpha' })]), 0);
  assert.equal(router.assign(issued(events, 2), 'p1'), true);
  router.receive(snapshot([pad(2, { id: 'Beta', pressed: [12] })]), 1);
  assert.deepEqual(lifecycle.map(event => `${event.type}:${event.device.id}`), [
    'seen:Alpha', 'assigned:Alpha', 'disconnected:Alpha', 'seen:Beta',
  ]);
});

test('same-id return offers a seeded explicit reclaim and requires release before actions', () => {
  const actions = [], reclaimRequests = [];
  const { router, events } = trackedRouter({
    context: () => 'play',
    dispatch: action => { actions.push(action); return true; },
    requestReclaim: (device, seat) => reclaimRequests.push({ device, seat }),
  });
  router.receive(snapshot([pad(3, { id: 'Alpha' })]), 0);
  router.assign(issued(events, 3), 'p1');
  router.receive(snapshot([]), 1);
  router.receive(snapshot([pad(3, { id: 'Alpha', pressed: [12] })]), 2);
  assert.deepEqual(reclaimRequests, [], 'a held return never reclaims itself');
  router.receive(snapshot([pad(3, { id: 'Alpha' })]), 3);
  router.receive(snapshot([pad(3, { id: 'Alpha', pressed: [0] })]), 4);
  assert.equal(reclaimRequests.length, 1);
  assert.equal(router.reclaim(reclaimRequests[0].device), true);
  router.receive(snapshot([pad(3, { id: 'Alpha', pressed: [0] })]), 5);
  assert.deepEqual(actions, [], 'assignment seeds the held state');
  router.receive(snapshot([pad(3, { id: 'Alpha' })]), 6);
  router.receive(snapshot([pad(3, { id: 'Alpha', pressed: [12] })]), 7);
  assert.deepEqual(actions.map(action => action.seat), ['p1']);
});

test('device loss is mode-facing while focused frame loss stays globally safe', () => {
  const lifecycle = [], global = [];
  const { router, events } = trackedRouter({
    context: () => 'play', dispatch: () => true,
    lifecycle: event => lifecycle.push(event), onFrameSafetyLost: () => global.push('pause'),
  });
  router.receive(snapshot([pad(0)]), 0);
  router.assign(issued(events, 0), 'p1');
  router.receive(snapshot([]), 1);
  assert.deepEqual(lifecycle.map(event => event.type), ['seen', 'assigned', 'disconnected']);
  assert.deepEqual(global, []);
  router.receive(snapshot([], false), 2);
  router.receive(snapshot([], false), 3);
  assert.deepEqual(global, ['pause']);
});

test('capacity-full device activity is consumed without a new local-play request', () => {
  const requests = [];
  const router = new GamepadRouter({
    context: () => 'setup', dispatch: () => true,
    acceptsDevice: () => false,
    requestLocalPlay: device => requests.push(device),
  });
  router.receive(snapshot([pad(7)]), 0);
  router.receive(snapshot([pad(7, { pressed: [0] })]), 1);
  assert.deepEqual(requests, []);
});

test('stale exact-same-id epochs cannot claim a replacement lease', () => {
  const { router, events } = trackedRouter({ context: () => 'play', dispatch: () => true });
  router.receive(snapshot([pad(0, { id: 'Alpha' })]), 0);
  const first = issued(events, 0);
  router.receive(snapshot([]), 1);
  router.receive(snapshot([pad(0, { id: 'Alpha' })]), 2);
  const second = events.filter(event => event.type === 'seen' && event.device.index === 0).at(-1).device;
  assert.notEqual(first.epoch, second.epoch);
  assert.equal(router.assign(first, 'p1'), false);
  assert.equal(router.assign(second, 'p1'), true);
});

test('held input received while unfocused is seeded before focus returns', () => {
  const actions = [];
  const { router, events } = trackedRouter({ context: () => 'play', dispatch: action => { actions.push(action); return true; } });
  router.receive(snapshot([pad(0)]), 0);
  router.assign(issued(events, 0), 'p1');
  router.receive(snapshot([pad(0, { pressed: [12] })], false), 1);
  router.receive(snapshot([pad(0, { pressed: [12] })]), 2);
  assert.deepEqual(actions, []);
  router.receive(snapshot([pad(0)]), 3);
  router.receive(snapshot([pad(0, { pressed: [12] })]), 4);
  assert.deepEqual(actions.map(action => action.direction), ['forward']);
});

test('release clears a connected seat until a neutral fresh edge requests local play', () => {
  const requests = [];
  const { router, events } = trackedRouter({
    context: () => 'setup', dispatch: () => true, requestLocalPlay: device => requests.push(device),
  });
  router.receive(snapshot([pad(0)]), 0);
  assert.equal(router.assign(issued(events, 0), 'p1'), true);
  router.receive(snapshot([pad(0, { pressed: [12] })]), 1);
  assert.equal(router.release('p1'), true);
  assert.equal(router.release('p1'), false, 'releasing an already-free seat is idempotent');
  router.receive(snapshot([pad(0, { pressed: [12] })]), 2);
  router.update(10000);
  assert.deepEqual(requests, [], 'held input cannot instantly rejoin after release');
  router.receive(snapshot([pad(0)]), 3);
  router.receive(snapshot([pad(0, { pressed: [12] })]), 4);
  assert.equal(requests.length, 1);
});

test('release clears a disconnected remembered lease before the same controller returns', () => {
  const requests = [], reclaimRequests = [];
  const { router, events } = trackedRouter({
    context: () => 'setup', dispatch: () => true,
    requestLocalPlay: device => requests.push(device),
    requestReclaim: (device, seat) => reclaimRequests.push({ device, seat }),
  });
  router.receive(snapshot([pad(1, { id: 'Alpha' })]), 0);
  assert.equal(router.assign(issued(events, 1), 'p1'), true);
  router.receive(snapshot([]), 1);
  assert.equal(router.release('p1'), true);
  router.receive(snapshot([pad(1, { id: 'Alpha', pressed: [0] })]), 2);
  assert.deepEqual(reclaimRequests, []);
  assert.deepEqual(requests, [], 'the return snapshot is seeded after departure');
  router.receive(snapshot([pad(1, { id: 'Alpha' })]), 3);
  router.receive(snapshot([pad(1, { id: 'Alpha', pressed: [0] })]), 4);
  assert.equal(requests.length, 1, 'the departed seat returns only through a fresh join request');
});

test('release leaves another seat movement and repeat schedule independent', () => {
  const actions = [];
  const { router, events } = trackedRouter({ context: () => 'play', dispatch: action => { actions.push(action); return true; } });
  router.receive(snapshot([pad(0), pad(1)]), 0);
  router.assign(issued(events, 0), 'p1');
  router.assign(issued(events, 1), 'p2');
  router.receive(snapshot([pad(0, { pressed: [12] }), pad(1, { pressed: [15] })]), 1);
  assert.equal(router.release('p1'), true);
  router.update(281);
  router.update(441);
  assert.deepEqual(actions.map(action => action.seat), ['p1', 'p2', 'p2', 'p2']);
});
