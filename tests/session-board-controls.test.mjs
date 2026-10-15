// Component behavior of the production setup UI. This does not replace the
// built-main transport/adoption tests or the full frame/theme layout matrix.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright';
import { compileSources } from './source-loader.mjs';

const modules = await compileSources('session-ui');
const css = await readFile(new URL('../src/session-ui.css', import.meta.url), 'utf8');
let server, browser, origin;

before(async () => {
  server = createServer((request, response) => {
    const body = modules.get(request.url);
    response.writeHead(body ? 200 : 404, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin': '*' });
    response.end(body ?? 'Missing test module');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ args: ['--mute-audio'] });
});
after(async () => {
  await browser?.close();
  if (server?.listening) await new Promise(resolve => server.close(resolve));
});

async function setup(t, { width = 900, height = 600 } = {}) {
  const page = await browser.newPage({ viewport: { width, height } });
  t.after(() => page.close());
  page.setDefaultTimeout(3000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const html = `<!doctype html><meta charset="utf-8"><style>${css}
    [hidden] { display:none !important } body { margin:0 } button { cursor:pointer }
    </style><div id="app"><div id="local-session-setup" class="local-session-setup"></div></div>
    <script type="module">
    import {createLocalSessionBoard, createSessionKeyboardEditor} from '${origin}/session-ui.js';
    import {DEFAULT_KEYBOARD_BINDINGS, validateKeyboardBindings} from '${origin}/keyboard-input.js';
    import {CHARACTERS} from '${origin}/content.js';
    const root = document.querySelector('#local-session-setup');
    let seats = [
      {seat:'p1', device:'gamepad-0', deviceLabel:'Controller 1', characterId:CHARACTERS[0].id},
      {seat:'p2', device:'gamepad-1', deviceLabel:'Controller 2', characterId:CHARACTERS[1].id},
    ];
    let bindings = structuredClone(DEFAULT_KEYBOARD_BINDINGS);
    const board = createLocalSessionBoard({root, capacity:4, seats:()=>seats, controllerAvailable:()=>true,
      onAddKeyboard() {
        const device = ['keyboard-a','keyboard-b'].find(value=>!seats.some(seat=>seat.device===value));
        const seat = ['p1','p2','p3','p4'].find(value=>!seats.some(seat=>seat.seat===value));
        const character = CHARACTERS.find(value=>!seats.some(seat=>seat.characterId===value.id));
        if (!device || !seat || !character) return;
        seats.push({seat,device,deviceLabel:device==='keyboard-a'?'Keyboard A':'Keyboard B',characterId:character.id});
        board.render();
      },
      onLeave(id) {seats=seats.filter(seat=>seat.seat!==id);board.render();},
      onCharacter(id,characterId) {seats=seats.map(seat=>seat.seat===id?{...seat,characterId}:seat);board.render();},
      onStart() {}, onBack() {},
    });
    createSessionKeyboardEditor({root, bindings:()=>bindings,
      async commit(next) {bindings=next;return validateKeyboardBindings(next);}, capture() {},
      seatForProfile:profile=>seats.find(seat=>seat.device===profile)?.seat,
    });
    board.render();
    window.componentReady = true;
    </script>`;
  await page.setContent('<iframe sandbox="allow-scripts" style="width:100vw;height:100vh;border:0"></iframe><style>body{margin:0}</style>');
  await page.locator('iframe').evaluate((element, source) => { element.srcdoc = source; }, html);
  const frame = await (await page.locator('iframe').elementHandle()).contentFrame();
  try { await frame.waitForFunction(() => window.componentReady, undefined, { timeout: 5000 }); }
  catch (error) { assert.fail(`Production setup component did not load: ${error.message}; ${errors.join('; ')}`); }
  assert.equal(await frame.evaluate(() => location.origin), 'null');
  t.after(() => assert.deepEqual(errors, [], 'component has no uncaught browser errors'));
  return { page, frame };
}

test('seat-chip selection and traveler changes retain usable focus after rebuilding the board', async t => {
  const { frame } = await setup(t);
  await frame.locator('.session-seat-chip').nth(1).click();
  assert.equal(await frame.locator('.session-seat-chip').nth(1).evaluate(button => document.activeElement === button), true,
    'selecting P2 must keep focus on its replacement chip');
  await frame.getByRole('button', { name: 'Next available traveler' }).click();
  assert.equal(await frame.getByRole('button', { name: 'Next available traveler' }).evaluate(button => document.activeElement === button), true);
  await frame.locator('.session-character-choice').click();
  assert.equal(await frame.locator('.session-character-choice').evaluate(button => document.activeElement === button), true,
    'choosing the traveler must retain focus after its preview is rebuilt');
});

test('leaving a selected seat moves focus to a remaining visible enabled setup control', async t => {
  const { frame } = await setup(t);
  await frame.locator('.session-seat-card[data-seat="p2"]').click();
  await frame.getByRole('button', { name: 'Leave this seat' }).click();
  assert.equal(await frame.locator('.session-seat-card[data-seat="p2"]').innerText().then(text => text.includes('Open seat')), true);
  assert.equal(await frame.evaluate(() => {
    const active = document.activeElement;
    return active instanceof HTMLButtonElement && !active.disabled && active.getClientRects().length > 0
      && !!active.closest('#local-session-setup');
  }), true, 'leaving cannot strand keyboard/controller focus on body or a disabled control');
});

test('both keyboard profiles can be offered and the editor identifies their actual mixed-session seats', async t => {
  const { frame } = await setup(t);
  await frame.getByRole('button', { name: 'Add Keyboard A', exact: true }).click();
  await frame.getByRole('button', { name: 'Add Keyboard B', exact: true }).click();
  assert.equal(await frame.locator('#session-add-keyboard').isVisible(), false);
  await frame.getByRole('button', { name: 'Edit controls', exact: true }).click();
  assert.match(await frame.locator('#session-controls-heading').innerText(), /P3 controls.*Keyboard A/);
  await frame.getByRole('tab', { name: 'P4 · Keyboard B', exact: true }).click();
  assert.match(await frame.locator('#session-controls-heading').innerText(), /P4 controls.*Keyboard B/);
});

test('compact roster lets a player inspect an open seat without jumping back to P1', async t => {
  const { frame } = await setup(t, { width: 320, height: 560 });
  await frame.locator('.session-seat-chip').nth(2).click();
  assert.equal(await frame.locator('.session-seat-chip').nth(2).getAttribute('aria-pressed'), 'true');
  assert.match(await frame.locator('#session-seat-detail').innerText(), /P3 is open/);
});
