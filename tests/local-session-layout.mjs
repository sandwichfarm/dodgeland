// Real built Local Play visual evidence. The only fixture surfaces are the
// injected runtime storage/theme and the authorized shell gamepad snapshots.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { after, test } from 'node:test';
import { chromium } from 'playwright';

const root = new URL('../', import.meta.url);
const output = new URL('../artifacts/', import.meta.url);
const built = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
assert.ok(built.includes('local-session-start') && built.includes('local-session-setup'), 'Build the Local Play production artifact before running this layout evidence.');

function installRuntime() {
  const listeners = new Set();
  let theme = { colors: { background: '#18232a', text: '#f4f2df', primary: '#a6c97d' } };
  window.localSessionLayout = { hydrated: false };
  addEventListener('message', event => {
    if (event.source !== parent || event.data?.type !== 'layout.theme') return;
    theme = event.data.theme;
    for (const listener of listeners) listener(theme);
  });
  window.napplet = {
    storage: {
      async getItem() {
        window.localSessionLayout.hydrated = true;
        return JSON.stringify({ mode: 'arcade', coins: 1000, runs: 0, muted: true, selected: 'butter', travelerVersion: 2 });
      },
      async setItem() {},
    },
    theme: {
      async get() { return theme; },
      onChanged(listener) { listeners.add(listener); return { close() { listeners.delete(listener); } }; },
    },
    gamepad: {},
  };
}

const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const harness = `<!doctype html><meta charset="utf-8"><body style="margin:0"><iframe id="napplet" sandbox="allow-scripts" style="border:0;width:900px;height:600px"></iframe><script>
const built=${json(built)}, install=${json(installRuntime.toString())}, frame=document.querySelector('#napplet');
window.snapshot=(pads,focused=true)=>frame.contentWindow.postMessage({type:'gamepad.state',available:true,focused,pads},'*');
window.setLayoutTheme=theme=>frame.contentWindow.postMessage({type:'layout.theme',theme},'*');
addEventListener('message',event=>{if(event.source!==frame.contentWindow||!event.data?.type?.startsWith('gamepad.'))return;if(event.data.type==='gamepad.subscribe')snapshot([]);});
frame.srcdoc=built.replace('<head>','<head><script>('+install+')()<'+'/script>');</script>`;
const server = createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(harness);
});
after(() => new Promise(resolve => server.close(resolve)));

const pad = (index, id, pressed = []) => ({
  index, id, mapping: 'standard', connected: true, timestamp: 1, axes: [0, 0, 0, 0],
  buttons: Array.from({ length: 17 }, (_, button) => ({ value: pressed.includes(button) ? 1 : 0, pressed: pressed.includes(button), touched: pressed.includes(button) })),
});
const frames = [[200, 160], [240, 240], [320, 560], [900, 600], [1000, 280], [2400, 1200]];
const themes = {
  dark: { colors: { background: '#18232a', text: '#f4f2df', primary: '#a6c97d' } },
  light: { colors: { background: '#f4f2df', text: '#263c38', primary: '#477953' } },
};

test('Local Play setup and four-seat HUD stay reachable across the required iframe matrix', { timeout: 120_000 }, async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  await mkdir(output, { recursive: true });
  const evidence = { artifact: 'unchanged built module in muted opaque allow-scripts iframe', frames: [], errors: [], deficiencies: [] };
  const browser = await chromium.launch({ args: ['--mute-audio'] });
  let page;
  try {
    page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    page.setDefaultTimeout(8_000);
    page.on('pageerror', error => evidence.errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'domcontentloaded' });
    const iframe = page.locator('#napplet');
    const frame = await (await iframe.elementHandle()).contentFrame();
    const settle = async () => { await frame.evaluate(() => Promise.resolve()); await page.waitForTimeout(50); };
    const send = async (pads, focused = true) => { await page.evaluate(([next, focus]) => window.snapshot(next, focus), [pads, focused]); await settle(); };
    const resize = async (width, height) => {
      await page.setViewportSize({ width: Math.max(1200, width), height: Math.max(900, height) });
      await iframe.evaluate((node, size) => { node.style.width = `${size.width}px`; node.style.height = `${size.height}px`; }, { width, height });
      await settle();
    };
    const setTheme = async (name) => { await page.evaluate(value => window.setLayoutTheme(value), themes[name]); await settle(); };
    const fail = (message, metrics) => { evidence.deficiencies.push({ message, metrics }); assert.fail(`${message}: ${JSON.stringify(metrics)}`); };
    const metrics = async (state, width, height) => frame.evaluate(({ state, width, height }) => {
      const visible = node => {
        const style = getComputedStyle(node), rect = node.getBoundingClientRect();
        return !node.closest('[hidden], [inert]') && style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
      };
      const bound = node => {
        const rect = node.getBoundingClientRect();
        const x = Math.min(width - 1, Math.max(0, rect.left + Math.min(rect.width / 2, 22)));
        const y = Math.min(height - 1, Math.max(0, rect.top + Math.min(rect.height / 2, 22)));
        const hit = document.elementFromPoint(x, y);
        return { text: node.textContent?.trim(), id: node.id, width: rect.width, height: rect.height,
          fits: rect.left >= -.5 && rect.top >= -.5 && rect.right <= width + .5 && rect.bottom <= height + .5,
          hit: hit === node || hit?.closest('button, [role="button"], input, select') === node };
      };
      const controls = [...document.querySelectorAll('button, [role="button"], input, select')].filter(visible).map(bound);
      const identity = [...document.querySelectorAll('#session-seats [data-seat]')].filter(visible).map(node => ({ seat: node.dataset.seat, text: node.textContent?.replace(/\s+/g, ' ').trim(), label: node.getAttribute('aria-label') }));
      const slots = [...document.querySelectorAll('#session-seats [data-seat] *')].filter(node => /^(Revive|Item)\b/.test(node.textContent?.trim() ?? '')).map(node => ({
        text: node.textContent?.trim(), interactive: Boolean(node.closest('button, [role="button"], input, select, a[href]')),
      }));
      const app = document.querySelector('#app'), board = document.querySelector('#session-board'), scene = document.querySelector('#scene');
      return {
        state, document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
        bodyFont: Number.parseFloat(getComputedStyle(document.body).fontSize),
        app: app ? getComputedStyle(app).backgroundColor : '', boardVisible: !!board && visible(board), sceneVisible: !!scene && visible(scene),
        controls, identity, slots,
      };
    }, { state, width, height });
    const assertFrame = async (state, width, height, theme) => {
      const value = await metrics(state, width, height);
      if (width === 200) {
        if (!await frame.locator('.too-small').isVisible()) fail(`${state}/${theme}/${width}×${height} must show the exact below-minimum notice`, value);
        if (value.controls.length) fail(`${state}/${theme}/${width}×${height} must expose no controls below the minimum`, value.controls);
      } else {
        if (await frame.locator('.too-small').isVisible()) fail(`${state}/${theme}/${width}×${height} must restore the working surface`, value);
        if (value.document.width > width || value.document.height > height) fail(`${state}/${theme}/${width}×${height} must not scroll`, value.document);
        if (value.bodyFont < 16) fail(`${state}/${theme}/${width}×${height} body text must be at least 16px`, value.bodyFont);
        for (const control of value.controls) {
          if (!control.fits || !control.hit) fail(`${state}/${theme}/${width}×${height} reachable control escaped or is covered`, control);
        }
        for (const control of value.controls.filter(control => /start|add|back|next|ready|local play/i.test(control.text ?? ''))) {
          if (control.width < 43.5 || control.height < 43.5) fail(`${state}/${theme}/${width}×${height} primary target is under 44px`, control);
        }
      }
      if (state === 'setup' && width >= 240 && !value.boardVisible) fail(`${state}/${theme}/${width}×${height} setup board is not visible`, value);
      if (state === 'hud' && width >= 240) {
        if (!value.sceneVisible) fail(`${state}/${theme}/${width}×${height} shared scene is not visible`, value);
        if (value.identity.length !== 4 || value.identity.some(seat => !/P[1-4].*[▲●◆■]/.test(`${seat.text} ${seat.label}`))) fail(`${state}/${theme}/${width}×${height} HUD identity is incomplete`, value.identity);
        if (!value.identity.every(seat => /Revive\s*—/.test(seat.text ?? '') && /Item\s*—/.test(seat.text ?? ''))) fail(`${state}/${theme}/${width}×${height} HUD omits reserved unavailable fields`, value.identity);
        if (value.slots.some(slot => slot.interactive)) fail(`${state}/${theme}/${width}×${height} reserved fields must remain noninteractive`, value.slots);
      }
      await iframe.screenshot({ path: new URL(`local-session-layout-${state}-${width}x${height}-${theme}.png`, output).pathname });
      evidence.frames.push({ state, width, height, theme, ...value });
    };

    await frame.waitForFunction(() => window.localSessionLayout?.hydrated);
    const alpha = 'Layout Alpha', beta = 'Layout Beta';
    await send([pad(0, alpha), pad(1, beta)]);
    await send([pad(0, alpha), pad(1, beta, [0])]);
    await frame.waitForFunction(() => document.querySelector('#app')?.dataset.runState === 'playing');
    await send([pad(0, alpha), pad(1, beta)]);
    await send([pad(0, alpha, [0]), pad(1, beta)]);
    await frame.waitForFunction(() => !document.querySelector('#local-session-setup')?.hasAttribute('hidden'));
    await frame.locator('#session-add-keyboard').click();
    await frame.locator('#session-add-keyboard').click();
    await frame.waitForFunction(() => document.querySelectorAll('#session-roster [data-seat]').length === 4);
    assert.equal(await frame.locator('#local-session-start').isDisabled(), false, 'four ready seats must expose the real Start action');

    // This is deliberately one live board, not a reload per frame. The
    // selected seat, keyboard-editor page, and focus are state that must live
    // through the compact breakpoint and return unchanged.
    await resize(900, 600);
    await frame.locator('.session-seat-chip[data-seat="p3"]').click();
    assert.equal(await frame.locator('.session-seat-chip[data-seat="p3"]').getAttribute('aria-pressed'), 'true');
    await frame.locator('#local-session-controls').click();
    await frame.locator('.session-controls-pages button', { hasText: 'More' }).click();
    const editorState = await frame.evaluate(() => ({
      heading: document.querySelector('#session-controls-heading')?.textContent,
      binding: document.querySelector('.session-binding')?.getAttribute('aria-label'),
      focus: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent,
    }));
    await resize(320, 560);
    const compactEditor = await frame.evaluate(() => ({
      visible: !document.querySelector('#session-keyboard-editor')?.hasAttribute('hidden'),
      heading: document.querySelector('#session-controls-heading')?.textContent,
      binding: document.querySelector('.session-binding')?.getAttribute('aria-label'),
      focus: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent,
    }));
    assert.deepEqual(compactEditor, { visible: true, ...editorState }, 'regular to compact resize retains selected seat, editor page, and focus');
    await resize(900, 600);
    const regularEditor = await frame.evaluate(() => ({
      visible: !document.querySelector('#session-keyboard-editor')?.hasAttribute('hidden'),
      heading: document.querySelector('#session-controls-heading')?.textContent,
      binding: document.querySelector('.session-binding')?.getAttribute('aria-label'),
      focus: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent,
    }));
    assert.deepEqual(regularEditor, compactEditor, 'compact to regular resize retains selected seat, editor page, and focus');
    for (let index = 0; index < 6; index++) {
      const pager = frame.locator('.session-controls-pages button').last();
      if (await pager.innerText() === 'Finish') { await pager.click(); break; }
      await pager.click();
    }
    await frame.waitForFunction(() => !document.querySelector('#session-board')?.hasAttribute('hidden'));
    assert.equal(await frame.locator('.session-seat-chip[data-seat="p3"]').getAttribute('aria-pressed'), 'true', 'closing editor returns to the selected P3 setup seat');

    for (const theme of Object.keys(themes)) {
      await setTheme(theme);
      for (const [width, height] of frames) { await resize(width, height); await assertFrame('setup', width, height, theme); }
    }

    await resize(900, 600);
    await frame.locator('#local-session-start').click();
    await frame.waitForFunction(() => document.querySelectorAll('#session-seats [data-seat]').length === 4);
    for (const theme of Object.keys(themes)) {
      await setTheme(theme);
      for (const [width, height] of frames) { await resize(width, height); await assertFrame('hud', width, height, theme); }
    }

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await resize(900, 600);
    const animationCount = await frame.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running').length);
    assert.equal(animationCount, 0, `reduced motion must make HUD changes immediate (running animations: ${animationCount})`);
    await iframe.screenshot({ path: new URL('local-session-layout-hud-900x600-dark-reduced.png', output).pathname });
    evidence.reducedMotion = { animationCount, width: 900, height: 600 };
    assert.deepEqual(evidence.errors, []);
    await writeFile(new URL('local-session-layout.json', output), JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify({ frames: evidence.frames.length, deficiencies: evidence.deficiencies, errors: evidence.errors }, null, 2));
  } catch (error) {
    evidence.failure = String(error);
    if (page) await page.locator('#napplet').screenshot({ path: new URL('local-session-layout-failure.png', output).pathname }).catch(() => {});
    await writeFile(new URL('local-session-layout.json', output), JSON.stringify(evidence, null, 2));
    throw error;
  } finally {
    await browser.close();
  }
});
