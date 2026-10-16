// Real built Local Play visual evidence. The only fixture surfaces are the
// injected runtime storage/theme and the authorized shell gamepad snapshots.
import assert from 'node:assert/strict';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { after, test } from 'node:test';
import { chromium } from 'playwright';
import { artifactDirectoryForCoverage, artifactForCoverage, registerRealm, collectRealm } from '../tools/release-coverage/browser.mjs';

const root = new URL('../', import.meta.url);
const output = artifactDirectoryForCoverage(new URL('../artifacts/', import.meta.url),'local-session-layout');
const artifactPath=artifactForCoverage(new URL('../dist/index.html', import.meta.url));
const built = await readFile(artifactPath, 'utf8');
assert.ok(built.includes('local-session-start') && built.includes('local-session-setup'), 'Build the Local Play production artifact before running this layout evidence.');
const artifact = await stat(artifactPath);
const currentSources = await Promise.all([
  'src/main.ts', 'src/session-input.ts', 'src/session-ui.ts', 'src/session-ui.css', 'src/styles.css',
].map(async file => ({ file, modified: (await stat(new URL(`../${file}`, import.meta.url))).mtimeMs })));
assert.deepEqual(currentSources.filter(source => source.modified > artifact.mtimeMs), [], 'dist/index.html is stale for Local Play source/CSS; rebuild before running layout evidence.');

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
  let page,frame;
  const identity={suite:process.argv[1],scenario:'local-layout-matrix',frame:'opaque-app',generation:0,scope:'current'};
  try {
    page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    registerRealm(page,identity);
    page.setDefaultTimeout(8_000);
    page.on('pageerror', error => evidence.errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'domcontentloaded' });
    const iframe = page.locator('#napplet');
    frame = await (await iframe.elementHandle()).contentFrame();
    const settle = async () => { await frame.evaluate(() => Promise.resolve()); await page.waitForTimeout(50); };
    const send = async (pads, focused = true) => { await page.evaluate(([next, focus]) => window.snapshot(next, focus), [pads, focused]); await settle(); };
    const resize = async (width, height) => {
      await page.setViewportSize({ width: Math.max(1200, width), height: Math.max(900, height) });
      await iframe.evaluate((node, size) => { node.style.width = `${size.width}px`; node.style.height = `${size.height}px`; }, { width, height });
      await settle();
    };
    const setTheme = async (name) => { await page.evaluate(value => window.setLayoutTheme(value), themes[name]); await settle(); };
    const closeEditor = async () => {
      for (let index = 0; index < 7; index++) {
        const pager = frame.locator('.session-controls-pages button').last();
        const label = await pager.innerText();
        await pager.click();
        if (label === 'Finish') {
          await frame.waitForFunction(() => !document.querySelector('#session-board')?.hasAttribute('hidden'));
          return;
        }
      }
      assert.fail('keyboard editor did not expose its Finish action');
    };
    const showBindingPage = async () => {
      for (let index = 0; index < 7; index++) {
        if (await frame.locator('.session-binding').count()) return;
        const back = frame.locator('.session-controls-pages button').first();
        if (await back.isDisabled()) break;
        await back.click();
      }
      assert.fail('keyboard editor did not restore a real binding page');
    };
    const fail = (message, metrics) => { evidence.deficiencies.push({ message, metrics }); };
    const metrics = async (state, width, height) => frame.evaluate(({ state, width, height }) => {
      const contrast = (foreground, background) => {
        const rgb = value => (value.match(/\d+(?:\.\d+)?/g) ?? []).slice(0, 3).map(Number);
        const luminance = color => color.map(channel => {
          const value = channel / 255;
          return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
        }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
        const [a, b] = [luminance(rgb(foreground)), luminance(rgb(background))].sort((left, right) => right - left);
        return (a + .05) / (b + .05);
      };
      const paintedBackground = node => {
        for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
          const color = getComputedStyle(ancestor).backgroundColor;
          const channels = color.match(/\d+(?:\.\d+)?/g) ?? [];
          if (channels.length < 4 || Number(channels[3]) > 0) return color;
        }
        return getComputedStyle(document.documentElement).backgroundColor;
      };
      const intersects = (inner, outer) => inner.left >= outer.left - .5 && inner.top >= outer.top - .5 && inner.right <= outer.right + .5 && inner.bottom <= outer.bottom + .5;
      const rendered = (node, fully = false) => {
        const style = getComputedStyle(node), rect = node.getBoundingClientRect();
        if (node.closest('[hidden], [inert]') || style.visibility === 'hidden' || style.display === 'none' || rect.width <= 0 || rect.height <= 0) return false;
        const viewport = { left: 0, top: 0, right: width, bottom: height };
        if (fully ? !intersects(rect, viewport) : rect.right <= 0 || rect.bottom <= 0 || rect.left >= width || rect.top >= height) return false;
        for (let parent = node.parentElement; parent; parent = parent.parentElement) {
          const overflow = getComputedStyle(parent);
          if (!/(hidden|clip|scroll|auto)/.test(`${overflow.overflow} ${overflow.overflowX} ${overflow.overflowY}`)) continue;
          const clip = parent.getBoundingClientRect();
          if (fully ? !intersects(rect, clip) : rect.right <= clip.left || rect.bottom <= clip.top || rect.left >= clip.right || rect.top >= clip.bottom) return false;
        }
        return true;
      };
      const visible = node => rendered(node);
      const bound = node => {
        const rect = node.getBoundingClientRect();
        const x = Math.min(width - 1, Math.max(0, rect.left + Math.min(rect.width / 2, 22)));
        const y = Math.min(height - 1, Math.max(0, rect.top + Math.min(rect.height / 2, 22)));
        const hit = document.elementFromPoint(x, y);
        return { text: node.textContent?.trim(), id: node.id, width: rect.width, height: rect.height,
          fits: rect.left >= -.5 && rect.top >= -.5 && rect.right <= width + .5 && rect.bottom <= height + .5,
          hit: hit === node || hit?.closest('button, [role="button"], input, select') === node };
      };
      const readable = node => {
        const range = document.createRange(); range.selectNodeContents(node);
        return [...range.getClientRects()].every(rect => [rect.left + 2, rect.left + rect.width / 2, rect.right - 2]
          .every(x => node.contains(document.elementFromPoint(x, rect.top + rect.height / 2))));
      };
      const controls = [...document.querySelectorAll('button, [role="button"], input, select')].filter(visible).map(bound);
      const identity = [...document.querySelectorAll('#session-seats [data-seat]')].filter(visible).map(node => {
        const style = getComputedStyle(node);
        return {
          seat: node.dataset.seat,
          text: node.textContent?.replace(/\s+/g, ' ').trim(),
          label: node.getAttribute('aria-label'),
          detailVisible: Boolean(node.querySelector('.session-hud-details') && rendered(node.querySelector('.session-hud-details'))),
          contrast: contrast(style.color, paintedBackground(node)),
        };
      });
      const selectedFields = [...document.querySelectorAll('#session-seats .session-hud-selected [data-session-hud]')].map(node => ({
        field: node.getAttribute('data-session-hud'), text: node.textContent?.trim(), fullyVisible: rendered(node, true),
        readable: readable(node), contrast: contrast(getComputedStyle(node).color, paintedBackground(node)),
      }));
      const slots = [...document.querySelectorAll('#session-seats [data-seat] *')].filter(node => /^(Revive|Item)\b/.test(node.textContent?.trim() ?? '')).map(node => ({
        text: node.textContent?.trim(), interactive: Boolean(node.closest('button, [role="button"], input, select, a[href]')),
      }));
      const text = ['.session-subtitle', '#session-status', '#session-seat-detail', '#session-seats [data-seat]']
        .flatMap(selector => [...document.querySelectorAll(selector)]).filter(visible).map(node => ({
          selector: node.matches?.('#session-status') ? '#session-status' : node.className || node.id || node.tagName,
          value: node.textContent?.replace(/\s+/g, ' ').trim(), font: Number.parseFloat(getComputedStyle(node).fontSize),
        }));
      const app = document.querySelector('#app'), board = document.querySelector('#session-board'), scene = document.querySelector('#scene');
      const sceneUsable = (() => {
        if (!(scene instanceof HTMLElement) || !visible(scene)) return false;
        const rect = scene.getBoundingClientRect();
        for (let y = rect.top + 22; y <= Math.min(rect.bottom, height) - 22; y += 22) for (let x = rect.left + 22; x <= Math.min(rect.right, width) - 22; x += 22) {
          const samples = [[x - 22, y - 22], [x + 22, y - 22], [x - 22, y + 22], [x + 22, y + 22]];
          if (samples.every(([pointX, pointY]) => document.elementFromPoint(pointX, pointY) === scene)) return true;
        }
        return false;
      })();
      return {
        state, document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
        app: app ? getComputedStyle(app).backgroundColor : '', boardVisible: !!board && visible(board), sceneVisible: !!scene && visible(scene), sceneUsable,
        controls, identity, selectedFields, slots, text,
      };
    }, { state, width, height });
    const assertFrame = async (state, width, height, theme) => {
      const value = await metrics(state, width, height);
      // Save every exact state before inspecting it so a failing assertion has
      // a visual artifact rather than only a stack trace.
      await iframe.screenshot({ path: new URL(`local-session-layout-${state}-${width}x${height}-${theme}.png`, output).pathname });
      evidence.frames.push({ state, width, height, theme, ...value });
      if (width === 200) {
        if (!await frame.locator('.too-small').isVisible()) fail(`${state}/${theme}/${width}×${height} must show the exact below-minimum notice`, value);
        if (value.controls.length) fail(`${state}/${theme}/${width}×${height} must expose no controls below the minimum`, value.controls);
      } else {
        if (await frame.locator('.too-small').isVisible()) fail(`${state}/${theme}/${width}×${height} must restore the working surface`, value);
        if (value.document.width > width || value.document.height > height) fail(`${state}/${theme}/${width}×${height} must not scroll`, value.document);
        for (const text of value.text.filter(text => text.value)) {
          if (text.font < 16) fail(`${state}/${theme}/${width}×${height} visible session text must be at least 16px`, text);
        }
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
        if (!value.sceneUsable) fail(`${state}/${theme}/${width}×${height} must leave a usable 44px scene area beside the session shelf`, value);
        if (value.identity.length !== 4 || value.identity.some(seat => !/P[1-4].*[▲●◆■]/.test(`${seat.text} ${seat.label}`))) fail(`${state}/${theme}/${width}×${height} HUD identity is incomplete`, value.identity);
        const detailed = value.identity.filter(seat => seat.detailVisible);
        const wideHud = width >= 1600 && height >= 900;
        if (detailed.length !== (wideHud ? 4 : 0)) fail(`${state}/${theme}/${width}×${height} must show wide details or bounded shared summaries`, value.identity);
        const requiredFields = ['identity', 'device', 'health', 'power', 'wallet', 'revive', 'item', 'lifecycle'];
        const summaries=await frame.locator('.session-hud-summary').evaluateAll(nodes=>nodes.filter(n=>n.checkVisibility()).map(n=>n.textContent));
        if(!summaries.length||summaries.some(text=>!/feathers/.test(text)))fail('live summaries retain real health and lifecycle',summaries);
        const selected=frame.locator('#session-seats .session-hud-selected .session-hud-identity');
        await selected.click();
        const visibleFields=[];
        for(let detailPage=0;detailPage<4;detailPage++){
          const detail=await metrics('hud-inspect',width,height);
          visibleFields.push(...detail.selectedFields.filter(field=>field.fullyVisible&&field.readable&&field.text));
          await frame.getByRole('button',{name:'Next details',exact:true}).click();
        }
        if(requiredFields.some(field=>!visibleFields.some(value=>value.field===field)))fail('actual detail pages expose every complete personal field',visibleFields);
        await frame.getByRole('button',{name:'Close details',exact:true}).click();
        if (value.identity.some(seat => seat.contrast < 4.5)) fail(`${state}/${theme}/${width}×${height} HUD paper/ink contrast is below 4.5:1`, value.identity);
        if (visibleFields.some(field => field.contrast < 4.5)) fail(`${state}/${theme}/${width}×${height} selected HUD field contrast is below 4.5:1`, visibleFields);
        if (value.slots.some(slot => slot.interactive)) fail(`${state}/${theme}/${width}×${height} reserved fields must remain noninteractive`, value.slots);
      }
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

    for (const [width, height] of [[240, 240], [320, 560]]) {
      await resize(width, height);
      await frame.locator('.session-seat-chip[data-seat="p3"]').click();
      for (const [name, visible, hidden] of [
        ['Roster', '#session-roster', '#session-seat-detail'],
        ['Traveler', '#session-seat-detail', '#session-roster'],
        ['Controls', '#local-session-controls', '#session-roster'],
      ]) {
        await frame.getByRole('button', { name, exact: true }).click();
        assert.equal(await frame.locator('#session-board').getAttribute('data-page'), name.toLowerCase() === 'traveler' ? 'character' : name.toLowerCase(), `${name} selects its compact page at ${width}×${height}`);
        assert.equal(await frame.locator(visible).isVisible(), true, `${name} exposes its real compact content at ${width}×${height}`);
        assert.equal(await frame.locator(hidden).isVisible(), false, `${name} does not leave another compact page exposed at ${width}×${height}`);
        const pageMetrics = await metrics('setup', width, height);
        if (pageMetrics.document.width > width || pageMetrics.document.height > height) fail(`${name} page must not scroll at ${width}×${height}`, pageMetrics.document);
        for (const control of pageMetrics.controls) if (!control.fits || !control.hit) fail(`${name} page has an unreachable control at ${width}×${height}`, control);
        await iframe.screenshot({ path: new URL(`local-session-layout-setup-${width}x${height}-page-${name.toLowerCase()}-dark.png`, output).pathname });
      }
    }

    // This is deliberately one live board, not a reload per frame. The
    // selected seat, keyboard-editor page, and focus are state that must live
    // through the compact breakpoint and return unchanged.
    // Every compact setup tab must be a real reachable page. In particular,
    // Controls cannot merely hide roster/detail without exposing the editor.
    await resize(320, 560);
    await frame.locator('.session-seat-chip[data-seat="p3"]').click();
    await frame.getByRole('button', { name: 'Controls', exact: true }).click();
    assert.equal(await frame.locator('#session-board').getAttribute('data-page'), 'controls', 'Controls tab selects its compact page');
    assert.equal(await frame.locator('#local-session-controls').isVisible(), true, 'Controls page keeps a real editor action reachable');
    await resize(900, 600);
    assert.equal(await frame.locator('#session-board').getAttribute('data-page'), 'controls', 'Controls page survives compact to regular resize');
    await resize(320, 560);
    assert.equal(await frame.locator('#session-board').getAttribute('data-page'), 'controls', 'Controls page survives regular to compact resize');
    assert.equal(await frame.locator('#local-session-controls').isVisible(), true, 'Controls action stays reachable after live resize');
    await frame.locator('#local-session-controls').click();
    assert.match(await frame.locator('#session-controls-heading').innerText(), /P3 controls/, 'Controls page preserves the selected seat in the editor');
    await closeEditor();

    await resize(900, 600);
    await frame.locator('.session-seat-chip[data-seat="p3"]').click();
    assert.equal(await frame.locator('.session-seat-chip[data-seat="p3"]').getAttribute('aria-pressed'), 'true');
    await frame.locator('#local-session-controls').click();
    await showBindingPage();
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
    await closeEditor();
    assert.equal(await frame.locator('.session-seat-chip[data-seat="p3"]').getAttribute('aria-pressed'), 'true', 'closing editor returns to the selected P3 setup seat');

    for (const theme of Object.keys(themes)) {
      await setTheme(theme);
      for (const [width, height] of frames) { await resize(width, height); await assertFrame('setup', width, height, theme); }
    }

    await resize(900, 600);
    await frame.locator('#local-session-start').click();
    await frame.waitForFunction(() => document.querySelectorAll('#session-seats [data-seat]').length === 4);
    const selectedHud = frame.locator('#session-seats [data-seat="p2"] .session-hud-identity');
    await selectedHud.focus();
    await frame.evaluate(async () => {
      for (let frame = 0; frame < 5; frame++) await new Promise(resolve => requestAnimationFrame(resolve));
    });
    assert.equal(await frame.evaluate(() => document.activeElement?.closest('[data-seat]')?.getAttribute('data-seat')), 'p2', 'HUD update must preserve focus on the selected player identity control');
    for (const theme of Object.keys(themes)) {
      await setTheme(theme);
      for (const [width, height] of frames) {
        await resize(width, height);
        if (width === 240 && height === 240) {
          assert.equal(await frame.locator('#app').getAttribute('data-run-state'), 'paused', 'restoring from the below-minimum notice deliberately holds the local session paused');
          assert.equal(await frame.locator('#session-seats [data-seat]').count(), 4, 'safety pause retains all four session owners');
          // Shared Local Play keeps its owner HUD visible and hides the solo
          // run panel, so its toolbar Pause control is the real resume action.
          await frame.locator('#session-controls-open').click();
          await frame.getByRole('button',{name:'Next controls',exact:true}).click();
          const resume = frame.getByRole('button', { name: 'Resume game', exact: true });
          assert.equal(await resume.isVisible(), true, 'restored working frame exposes the real shared resume control');
          await resume.click();
          await frame.waitForFunction(() => document.querySelector('#app')?.dataset.runState === 'playing' && !document.querySelector('#session-seats')?.hasAttribute('hidden'));
        }
        await assertFrame('hud', width, height, theme);
        if (width === 240 && height === 240 && theme === 'dark') {
          const identity = frame.locator('#session-seats .session-hud-selected .session-hud-identity');
          const p3Distance = async () => {
            const text = await frame.locator('#session-seats [data-seat="p3"] [data-session-hud="health"]').textContent();
            return Number(text.match(/·\s*(\d+)\s*tiles/)?.[1]);
          };
          const p3BeforeInspect = await p3Distance();
          await identity.focus();
          await identity.click();
          await frame.waitForFunction(() => document.querySelector('#session-seats')?.dataset.sessionHudInspect === 'true');
          assert.equal(await frame.locator('#app').getAttribute('data-run-state'), 'paused', 'opening short details pauses an active local session');
          assert.equal(await frame.locator('.bottom-bar').isVisible(), false, 'short details hide pointer controls while inspecting');
          const detailPages = [
            ['identity', 'device', 'health'],
            ['identity', 'power', 'wallet'],
            ['identity', 'revive', 'lifecycle'],
            ['identity', 'item'],
          ];
          for (let page = 0; page < detailPages.length; page++) {
            const inspected = await metrics('hud-inspect', width, height);
            if (detailPages[page].some(field => !inspected.selectedFields.some(value => value.field === field && value.fullyVisible && value.readable && value.text))) {
              fail(`short details page ${page + 1} must expose its real selected fields without an overlapping control`, inspected.selectedFields);
            }
            await iframe.screenshot({ path: new URL(`local-session-layout-hud-240x240-inspect-page-${page + 1}-dark.png`, output).pathname });
            if (page < detailPages.length - 1) await frame.locator('#session-seats .session-hud-selected .session-hud-pager button').last().click();
          }
          await iframe.screenshot({ path: new URL('local-session-layout-hud-240x240-inspect-dark.png', output).pathname });
          await page.keyboard.down('w');
          const closeDetails = frame.locator('#session-seats .session-hud-selected button[data-session-hud-close="true"]');
          assert.equal(await closeDetails.isVisible(), true, 'short details expose a real Close action');
          await closeDetails.click();
          await frame.waitForFunction(() => document.querySelector('#session-seats')?.dataset.sessionHudInspect !== 'true' && document.querySelector('#app')?.dataset.runState === 'playing');
          await page.waitForTimeout(80);
          assert.equal(await p3Distance(), p3BeforeInspect, 'held P3 native movement cannot leak through detail close before a neutral edge');
          await page.keyboard.up('w');
          assert.equal(await frame.evaluate(() => document.activeElement?.closest('[data-seat]')?.dataset.seat), 'p1', 'closing details restores focus to the inspected identity');
          await frame.locator('#scene').focus();
          await frame.locator('#scene').press('w');
          await frame.waitForFunction(previous => {
            const text = document.querySelector('#session-seats [data-seat="p3"] [data-session-hud="health"]')?.textContent ?? '';
            return Number(text.match(/·\s*(\d+)\s*tiles/)?.[1]) > previous;
          }, p3BeforeInspect);

          await identity.click();
          await frame.waitForFunction(() => document.querySelector('#session-seats')?.dataset.sessionHudInspect === 'true');
          await resize(320, 560);
          assert.equal(await frame.locator('#session-seats').getAttribute('data-session-hud-inspect'),'true','resize preserves deliberate inspection');
          assert.equal(await frame.locator('#app').getAttribute('data-run-state'), 'paused', 'short to tall resize retains inspection pause');
          assert.equal(await frame.locator('.session-hud-selected').getAttribute('data-seat'),'p1');
          await frame.getByRole('button',{name:'Close details',exact:true}).click();
          assert.equal(await frame.locator('#app').getAttribute('data-run-state'),'playing','explicit close restores prior play');
          await resize(width, height);
          await identity.click();
          await frame.waitForFunction(() => document.querySelector('#session-seats')?.dataset.sessionHudInspect === 'true');
          await resize(200, 160);
          await frame.waitForFunction(() => document.querySelector('.too-small')?.checkVisibility());
          await resize(width, height);
          assert.equal(await frame.locator('#app').getAttribute('data-run-state'), 'paused', 'safety suspension while inspecting never auto-resumes the session');
          assert.equal(await frame.locator('#session-seats [data-seat]').count(), 4, 'safety suspension preserves the four session owners');
          const closeInspection = frame.getByRole('button', { name: 'Close details', exact: true });
          assert.equal(await closeInspection.isVisible(), true, 'restored inspection exposes its accessible shared-session exit');
          await closeInspection.click();
          await frame.waitForFunction(() => document.querySelector('#app')?.dataset.runState === 'playing' && !document.querySelector('#session-seats')?.hasAttribute('hidden'));
        }
      }
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
    assert.equal(evidence.deficiencies.length, 0, `layout matrix deficiencies: ${JSON.stringify(evidence.deficiencies)}`);
  } catch (error) {
    evidence.failure = String(error);
    if (page) await page.locator('#napplet').screenshot({ path: new URL('local-session-layout-failure.png', output).pathname }).catch(() => {});
    await writeFile(new URL('local-session-layout.json', output), JSON.stringify(evidence, null, 2));
    throw error;
  } finally {
    try{await collectRealm(frame,identity);}finally{await browser.close();}
  }
});
