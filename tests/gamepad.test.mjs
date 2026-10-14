import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/gamepad.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { parseGamepadState, GamepadInput, createGamepadControls } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const pad = (pressed = [], axes = [0, 0], index = 0, mapping = 'standard') => ({ index, id: `Controller ${index}`, mapping, connected: true, timestamp: 1, axes, buttons: Array.from({ length: 17 }, (_, i) => ({ value: pressed.includes(i) ? 1 : 0, pressed: pressed.includes(i), touched: pressed.includes(i) })) });
const state = (pads = [pad()], focused = true, available = true) => ({ available, focused, pads });
function actions() {
  const calls = [], values = { context: 'playing', enabled: true };
  const api = { context: () => values.context, enabled: () => values.enabled, direction: direction => calls.push(direction), onConnection: connected => calls.push(`connected:${connected}`) };
  for (const action of ['confirm', 'pause', 'call', 'back', 'menu', 'market']) api[action] = () => calls.push(action);
  return { api, calls, values };
}
function setup() { const result = actions(); return { ...result, input: new GamepadInput(result.api) }; }
function emitter(extra = {}) {
  const listeners = new Map();
  return { ...extra, listeners, addEventListener: (name, callback) => { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(callback); }, removeEventListener: (name, callback) => listeners.get(name)?.delete(callback), emit: (name, data) => { for (const callback of [...listeners.get(name) ?? []]) callback(data); } };
}
function environment(domain) {
  const sent = [], parent = { postMessage: (message, target) => sent.push({ message, target }) };
  const host = emitter({ parent, napplet: domain === undefined ? {} : { gamepad: domain } });
  const page = emitter({ hidden: false });
  const send = data => host.emit('message', { source: parent, data: { type: 'gamepad.state', ...data } });
  return { sent, parent, host, page, send };
}

test('validates complete bounded snapshots, preserves slot indices, and copies mutable data', () => {
  const raw = state([null, pad([0], [-.25, .6], 7)]), parsed = parseGamepadState(raw);
  assert.equal(parsed.pads[1].index, 7, 'route by index, not array position');
  raw.pads[1].axes[0] = 1; raw.pads[1].buttons[0].pressed = false;
  assert.equal(parsed.pads[1].axes[0], -.25); assert.equal(parsed.pads[1].buttons[0].pressed, true);
  assert.equal(parseGamepadState(state([pad(), pad()])), null, 'duplicate indices rejected');
  for (const invalid of [null, [], {}, { ...state(), available: 1 }, state([pad([], [NaN, 0])]), state([pad([], [2, 0])]), state(Array(17).fill(null)), { ...state(), reason: 'other' }, state([{ ...pad(), connected: false }])]) assert.equal(parseGamepadState(invalid), null);
  assert.equal(parseGamepadState({ ...state([], true, false), reason: 'blocked' }).focused, false);
});

test('held controls on initial focus do nothing until released and pressed again', () => {
  const { input, calls } = setup();
  input.receive(state([pad([0, 2, 9, 12])]), 0); input.update(10000);
  assert.deepEqual(calls, ['connected:true']);
  input.receive(state(), 10001); input.receive(state([pad([0, 2, 12])]), 10002);
  assert.deepEqual(calls, ['connected:true', 'confirm', 'call', 'forward']);
  input.receive(state([pad([0, 2, 12])]), 10003);
  assert.equal(calls.length, 4, 'unchanged snapshot does not invent edges');
});

test('D-pad repeats use game pacing, release stops, long frames never produce bursts', () => {
  const { input, calls } = setup(); input.receive(state(), 0);
  input.receive(state([pad([15])]), 10); input.update(289);
  assert.deepEqual(calls, ['connected:true', 'right']);
  input.update(290); input.update(449); input.update(450);
  assert.deepEqual(calls.slice(1), ['right', 'right', 'right']);
  input.update(10000); assert.equal(calls.length, 5);
  input.receive(state(), 10001); input.update(11000); assert.equal(calls.length, 5);
});

test('left stick has deadzone, release hysteresis, one-axis movement, and D-pad priority', () => {
  const { input, calls } = setup(); input.receive(state(), 0);
  input.receive(state([pad([], [.49, -.49])]), 1); assert.equal(calls.length, 1);
  input.receive(state([pad([], [.8, -.8])]), 2); assert.equal(calls.at(-1), 'forward');
  input.receive(state([pad([], [0, -.4])]), 3); input.update(282); assert.equal(calls.at(-1), 'forward');
  input.receive(state([pad([], [0, -.29])]), 283); const count = calls.length; input.update(1000); assert.equal(calls.length, count);
  input.receive(state([pad([14], [1, 0])]), 1001); assert.equal(calls.at(-1), 'left');
  input.receive(state([pad([12, 13])]), 1002); input.update(1500); assert.equal(calls.length, count + 1);
});

test('buttons are edge-triggered and use standard physical locations', () => {
  const { input, calls } = setup(); input.receive(state(), 0);
  for (const [button, name] of [[0, 'confirm'], [1, 'back'], [2, 'call'], [3, 'menu'], [4, 'market'], [9, 'pause']]) {
    input.receive(state([pad([button])]), 1); assert.equal(calls.at(-1), name);
    const count = calls.length; input.update(10000); assert.equal(calls.length, count);
    input.receive(state(), 10001);
  }
});

test('focus loss, disconnection, unavailability and disabled game clear held repeat', () => {
  const { input, calls, values } = setup(); input.receive(state(), 0); input.receive(state([pad([12])]), 1);
  input.receive(state([pad()], false), 2); input.update(10000); assert.equal(calls.filter(x => x === 'forward').length, 1);
  input.receive(state([pad([12])]), 10001); input.update(11000); assert.equal(calls.filter(x => x === 'forward').length, 1);
  input.receive(state(), 11001); input.receive(state([pad([12])]), 11002); assert.equal(calls.filter(x => x === 'forward').length, 2);
  values.enabled = false; input.update(20000); values.enabled = true; input.receive(state([pad([12])]), 20001); input.update(21000); assert.equal(calls.filter(x => x === 'forward').length, 2);
  input.receive(state([], false, false), 21001); assert.equal(calls.at(-1), 'connected:false');
  input.receive(state([pad([12])]), 22000); input.update(23000); assert.equal(calls.at(-1), 'connected:true');
  input.receive(state([]), 23001); assert.equal(calls.at(-1), 'connected:false');
});

test('context changes suppress held controls across death, retry and menus', () => {
  const { input, calls, values } = setup(); input.receive(state(), 0); input.receive(state([pad([12])]), 1);
  values.context = 'dead'; input.update(500); input.update(1000); assert.equal(calls.filter(x => x === 'forward').length, 1);
  input.receive(state(), 1001);
  input.receive(state([pad([0])]), 1002); assert.equal(calls.at(-1), 'confirm');
  values.context = 'playing'; input.update(1003); input.receive(state([pad([0])]), 1004); assert.equal(calls.filter(x => x === 'confirm').length, 1);
});

test('Start takes precedence over simultaneous action and movement when pausing changes context', () => {
  const result = actions(); result.api.pause = () => { result.calls.push('pause'); result.values.context = 'paused'; };
  const input = new GamepadInput(result.api); input.receive(state(), 0); input.receive(state([pad([0, 9, 12])]), 1); input.update(1000);
  assert.deepEqual(result.calls, ['connected:true', 'pause']);
});

test('LB opens the market before simultaneous confirm or movement and requires release across modal contexts', () => {
  const result = actions();
  result.api.market = () => { result.calls.push('market'); result.values.context = result.values.context === 'market' ? 'playing' : 'market'; };
  const input = new GamepadInput(result.api);
  input.receive(state([pad([4])]), 0); input.update(1000);
  assert.deepEqual(result.calls, ['connected:true'], 'bumper held on initial focus cannot open a store');
  input.receive(state(), 1001); input.receive(state([pad([0, 4, 12])]), 1002); input.update(2000);
  assert.deepEqual(result.calls, ['connected:true', 'market'], 'LB+A+up opens without buying or hopping');
  input.receive(state([pad([0, 4, 12])]), 2001); input.update(3000);
  assert.deepEqual(result.calls, ['connected:true', 'market'], 'held actions cannot cross the modal boundary');
  input.receive(state(), 3001); input.receive(state([pad([4])]), 3002);
  assert.deepEqual(result.calls, ['connected:true', 'market', 'market'], 'fresh LB closes the market');
  input.receive(state([pad([4])], false), 3003); input.receive(state([pad([4])]), 3004); input.update(5000);
  assert.equal(result.calls.filter(call => call === 'market').length, 2, 'held LB on focus return is suppressed');
});

test('market support is optional and leaves existing controller actions intact', () => {
  const result = actions(); delete result.api.market;
  const input = new GamepadInput(result.api); input.receive(state(), 0);
  assert.doesNotThrow(() => input.receive(state([pad([4])]), 1));
  input.receive(state(), 2); input.receive(state([pad([0])]), 3);
  assert.deepEqual(result.calls, ['connected:true', 'confirm']);
});

test('selects by stable index, keeps one player, ignores nonstandard mappings, and clears on close', () => {
  const { input, calls } = setup(); input.receive(state([pad([], [], 9, ''), null, pad([], [], 4), pad([], [], 2)]), 0);
  input.receive(state([pad([12], [], 4), pad([15], [], 2)]), 1); assert.equal(calls.at(-1), 'right');
  input.receive(state([pad([12], [], 4)]), 2); input.update(1000); assert.equal(calls.at(-1), 'right', 'new selected controller needs neutral first');
  input.receive(state([pad([], [], 4)]), 1001); input.receive(state([pad([12], [], 4)]), 1002); assert.equal(calls.at(-1), 'forward');
  input.close(); input.close(); input.receive(state([pad([0])]), 1003); input.update(2000); assert.equal(calls.at(-1), 'connected:false');
  assert.equal(calls.filter(x => x === 'connected:false').length, 1);
});

test('absent optional domain sends no wire messages, installs no global, and leaves other controls alone', () => {
  const env = environment(), { api, calls } = actions();
  const controls = createGamepadControls(api, env.host, env.page, () => 0);
  assert.equal(controls.supported, false); assert.deepEqual(env.sent, []); assert.equal(env.host.listeners.size, 0);
  env.send(state([pad([0])])); controls.update(100); controls.close(); assert.deepEqual(calls, []); assert.deepEqual(env.host.napplet, {});
});

test('wire bridge uses only canonical fire-and-forget messages and authentic parent snapshots', () => {
  const env = environment({}), { api, calls } = actions(); let clock = 0;
  const controls = createGamepadControls(api, env.host, env.page, () => clock);
  assert.deepEqual(env.sent, [{ message: { type: 'gamepad.subscribe' }, target: '*' }]);
  env.send(state()); clock++;
  env.host.emit('message', { source: {}, data: { type: 'gamepad.state', ...state([pad([0])]) } });
  env.host.emit('message', { source: env.parent, data: { type: 'other.state', ...state([pad([0])]) } });
  env.send({ ...state([pad([0])]), id: 'not-a-request' }); assert.deepEqual(calls, ['connected:true']);
  env.send(state([pad([0, 12])])); assert.deepEqual(calls, ['connected:true', 'confirm', 'forward']);
  clock = 500; controls.update(clock); assert.equal(calls.at(-1), 'forward');
  env.send({ available: true, focused: true, pads: [{ ...pad(), axes: [Infinity] }] });
  const count = calls.length; controls.update(1000); assert.equal(calls.length, count, 'invalid snapshot cancels stale hold');
  controls.close(); controls.close();
  assert.deepEqual(env.sent.at(-1), { message: { type: 'gamepad.unsubscribe' }, target: '*' }); assert.equal(env.sent.length, 2);
  assert.ok([...env.host.listeners.values(), ...env.page.listeners.values()].every(set => set.size === 0));
});

test('complete injected binding wins over wire fallback and closes its subscription', () => {
  const { api, calls } = actions(); let handler, closed = 0;
  const domain = { available: true, focused: true, getGamepads: () => [pad()], onChange: callback => { handler = callback; return { close: () => closed++ }; } };
  const env = environment(domain), controls = createGamepadControls(api, env.host, env.page, () => 0);
  assert.equal(controls.supported, true); assert.deepEqual(env.sent, []);
  handler(state([pad([2])])); assert.equal(calls.at(-1), 'call');
  controls.close(); controls.close(); handler(state([pad([0])])); assert.equal(closed, 1); assert.equal(calls.at(-1), 'connected:false');
});

test('blur and hidden documents cancel repeat and require fresh releases after returning', () => {
  const env = environment({}), { api, calls } = actions();
  const controls = createGamepadControls(api, env.host, env.page, () => 0);
  env.send(state()); env.send(state([pad([12])])); env.host.emit('blur'); controls.update(1000);
  env.send(state([pad([12, 0])])); env.host.emit('focus'); controls.update(2000); assert.deepEqual(calls, ['connected:true', 'forward']);
  env.send(state()); env.send(state([pad([12])]));
  env.page.hidden = true; env.page.emit('visibilitychange'); controls.update(3000);
  env.page.hidden = false; env.page.emit('visibilitychange'); controls.update(4000);
  assert.equal(calls.filter(x => x === 'forward').length, 2);
  env.host.emit('pagehide'); assert.equal(env.sent.at(-1).message.type, 'gamepad.unsubscribe');
});

test('failed optional binding closes cleanly without falling through to wire or crashing', () => {
  let closed = 0;
  const env = environment({ onChange: () => ({ close: () => closed++ }), getGamepads: () => { throw new Error('unsupported'); } });
  const { api, calls } = actions(); const controls = createGamepadControls(api, env.host, env.page);
  controls.update(0); controls.close(); assert.equal(closed, 1); assert.deepEqual(env.sent, []); assert.deepEqual(calls, []);
});

test('focus loss reports one pause transition without pretending the controller disconnected', () => {
  const result = actions(); result.api.onFocusLost = () => result.calls.push('focus-lost');
  const input = new GamepadInput(result.api); input.receive(state([], false), 0);
  assert.deepEqual(result.calls, []);
  input.receive(state(), 1); input.receive(state([pad()], false), 2); input.receive(state([pad()], false), 3); input.update(1000);
  assert.deepEqual(result.calls, ['connected:true', 'focus-lost']);
  input.receive(state(), 1001); input.suspend(); input.suspend();
  assert.deepEqual(result.calls, ['connected:true', 'focus-lost', 'focus-lost']);
});
