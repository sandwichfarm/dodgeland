import './pause.css';
import type { Direction } from './game.js';
import { runHandControls } from './run-hand.js';
import fontLicense from './fonts/LilitaOne-LICENSE.txt?raw';

/** A pause board with readable information pages at small frame sizes. */
export function createPauseUI() {
  // Keep the font's full redistribution notice inside the single-file artifact.
  document.head.append(document.createComment(`Lilita One font license\n${fontLicense}`));
  const app = document.getElementById('app')!;
  const panel = document.getElementById('run-panel')!;
  const home = document.getElementById('pause-home')!;
  const reader = document.getElementById('pause-reader')!;
  const heading = document.getElementById('pause-reader-heading')!;
  const copy = document.getElementById('pause-reader-copy')!;
  const power = document.getElementById('pause-power')!;
  const backButton = document.getElementById('pause-back') as HTMLButtonElement;
  const previous = document.getElementById('pause-prev') as HTMLButtonElement;
  const next = document.getElementById('pause-next') as HTMLButtonElement;
  const count = document.getElementById('pause-page-count')!;
  const play = document.getElementById('play') as HTMLButtonElement;
  let active = false, disposed = false, topic: 'home' | 'rules' | 'power' = 'home', page = 0;
  let pages: string[] = [], source = '', lastSize = '';
  const textMeasure = document.createElement('canvas').getContext('2d')!;
  const focus = (node: HTMLElement) => node.focus({ preventScroll: true });
  const controls = () => [...panel.querySelectorAll<HTMLButtonElement>('button')].filter(node => !node.disabled && node.getClientRects().length > 0 && !node.closest('[hidden]')).concat(runHandControls() as HTMLButtonElement[]);

  function paginate() {
    if (!active || topic === 'home') return;
    const css = getComputedStyle(copy);
    textMeasure.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
    const width = copy.clientWidth, maxLines = Math.max(1, Math.floor(copy.clientHeight / parseFloat(css.lineHeight)));
    const words = source.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const proposed = line ? `${line} ${word}` : word;
      if (line && textMeasure.measureText(proposed).width > width - 2) { lines.push(line); line = word; }
      else line = proposed;
    }
    if (line) lines.push(line);
    pages = [];
    for (let index = 0; index < lines.length; index += maxLines) pages.push(lines.slice(index, index + maxLines).join(' '));
    if (!pages.length) pages = ['Your power is automatic.'];
    page = Math.min(page, pages.length - 1);
    paintPage();
  }

  function paintPage() {
    copy.textContent = pages[page];
    count.textContent = `${page + 1} / ${pages.length}`;
    previous.disabled = page === 0; next.disabled = page >= pages.length - 1;
    if (document.activeElement instanceof HTMLButtonElement && document.activeElement.disabled) focus(backButton);
  }

  function show(nextTopic: typeof topic) {
    topic = nextTopic; page = 0;
    app.dataset.pausePage = topic;
    home.hidden = topic !== 'home'; reader.hidden = topic === 'home';
    panel.setAttribute('aria-labelledby', topic === 'home' ? 'pause-heading' : 'pause-reader-heading');
    if (topic === 'home') { focus(play); return; }
    heading.textContent = topic === 'rules' ? 'Road rules' : 'Your power';
    source = topic === 'rules'
      ? 'Rear bumps cost 1 feather. Side hits cost 2 feathers. Recover half a feather every 100 hops. Fatal hazards end the run unless your character power saves you.'
      : [power.querySelector('strong')?.textContent, power.querySelector('span')?.textContent].filter(Boolean).join('. ');
    paginate(); focus(backButton);
  }

  const onClick = (event: Event) => {
    const target = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!active || !target) return;
    if (target.dataset.pauseTopic === 'rules' || target.dataset.pauseTopic === 'power') show(target.dataset.pauseTopic);
    else if (target === backButton) show('home');
    else if (target === previous && page > 0) { page--; paintPage(); }
    else if (target === next && page < pages.length - 1) { page++; paintPage(); }
  };
  const onKey = (event: KeyboardEvent) => {
    if (!active || event.key !== 'Tab') return;
    const buttons = controls(), index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (!buttons.length) return;
    event.preventDefault(); focus(buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]);
  };
  const observer = new ResizeObserver(() => {
    const size = `${panel.clientWidth}:${panel.clientHeight}`;
    if (size !== lastSize) { lastSize = size; paginate(); }
  });
  const powerObserver = new MutationObserver(() => {
    if (!active || topic !== 'power') return;
    source = [power.querySelector('strong')?.textContent, power.querySelector('span')?.textContent].filter(Boolean).join('. ');
    paginate();
  });
  observer.observe(panel); powerObserver.observe(power, { childList: true, subtree: true, characterData: true });
  panel.addEventListener('click', onClick); document.addEventListener('keydown', onKey, true);
  document.fonts.addEventListener('loadingdone', paginate);
  document.fonts.ready.then(() => { if (!disposed) paginate(); });

  return {
    update(visible: boolean, reducedMotion = false) {
      app.classList.toggle('pause-less-motion', reducedMotion);
      if (visible === active || disposed) return;
      active = visible;
      app.dataset.pauseOpen = String(visible);
      if (visible) {
        panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-owns', 'run-inventory');
        show('home');
      } else {
        panel.removeAttribute('role'); panel.removeAttribute('aria-modal'); panel.removeAttribute('aria-labelledby');
        panel.removeAttribute('aria-owns');
        delete app.dataset.pausePage;
      }
    },
    navigate(direction: Direction) {
      if (!active) return;
      const buttons = controls(); if (!buttons.length) return;
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const step = direction === 'back' || direction === 'right' ? 1 : -1;
      focus(buttons[(index + step + buttons.length) % buttons.length]);
    },
    confirm() {
      if (!active) return;
      const focused = document.activeElement;
      if (focused instanceof HTMLButtonElement && controls().includes(focused)) focused.click();
      else play.click();
    },
    back(): boolean { if (!active || topic === 'home') return false; show('home'); return true; },
    dispose() {
      disposed = true; observer.disconnect(); powerObserver.disconnect();
      panel.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey, true);
      document.fonts.removeEventListener('loadingdone', paginate);
    },
  };
}
