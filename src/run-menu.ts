import './run-menu.css';
import type { Direction } from './game.js';
import { runHandControls } from './run-hand.js';

export interface RunMenuSnapshot {
  state: 'ready' | 'dead'; distance: number; earnedCoins: number; activeSeconds: number;
  best: number; mode: string; world: string; chapter: number; traveler: string;
}
type Topic = 'home' | 'stats' | 'seed' | 'help' | 'power' | 'options';

/** Presentation only: game state and actions remain owned by main. */
export function createRunMenuUI() {
  const el = (id: string) => document.getElementById(id)!;
  const app = el('app'), panel = el('run-panel'), reader = el('run-menu-reader');
  const heading = el('run-menu-heading'), copy = el('run-menu-copy'), stats = el('run-menu-stat-page');
  const play = el('play') as HTMLButtonElement, back = el('run-menu-back') as HTMLButtonElement;
  const previous = el('run-menu-prev') as HTMLButtonElement, next = el('run-menu-next') as HTMLButtonElement;
  const homes = [...panel.querySelectorAll<HTMLElement>('[data-run-home]')];
  const measure = document.createElement('canvas').getContext('2d')!;
  let active = false, disposed = false, topic: Topic = 'home', page = 0, pages: string[] = [];
  let snapshot: RunMenuSnapshot | null = null, lastKey = '', source = '';
  let statPages: [string, string][] = [];
  const focus = (node: HTMLElement) => node.focus({ preventScroll: true });
  const controls = () => [...panel.querySelectorAll<HTMLElement>('button,textarea')].filter(node => !(node as HTMLButtonElement).disabled && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden' && !node.closest('[hidden]')).concat(runHandControls());
  const clock = (seconds: number) => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.floor(Math.max(0, seconds)) % 60).padStart(2, '0')}`;
  const set = (id: string, value: string) => { if (el(id).textContent !== value) el(id).textContent = value; };

  function statPairs(): [string, string][] {
    if (!snapshot) return [];
    return [['Distance', `${snapshot.distance} hops`], ['Coins found', `${snapshot.earnedCoins} ◆`], ['Active time', clock(snapshot.activeSeconds)], [`${snapshot.mode} best`, `${snapshot.best} hops`], ['World', snapshot.world], ['Chapter', String(snapshot.chapter)], ['Traveler', snapshot.traveler], ['Run ended', el('reason').textContent ?? ''], ['This run', el('run-reward').textContent ?? 'Run wallet and items lost.']];
  }
  function paint() {
    if (topic === 'stats') {
      const pairs = statPages.length ? statPages : statPairs(); page = Math.min(page, pairs.length - 1);
      const item = document.createElement('div'), label = document.createElement('dt'), value = document.createElement('dd');
      label.textContent = pairs[page][0]; value.textContent = pairs[page][1]; item.append(label, value); stats.replaceChildren(item);
    } else copy.textContent = pages[page] ?? '';
    const total = topic === 'stats' ? statPages.length : pages.length;
    el('run-menu-page-count').textContent = `${page + 1} / ${Math.max(1, total)}`;
    previous.disabled = page === 0; next.disabled = page >= total - 1;
    if (document.activeElement instanceof HTMLButtonElement && document.activeElement.disabled) focus(back);
  }
  function paginateStats() {
    if (!active || topic !== 'stats') return;
    if (!stats.querySelector('dd')) paint();
    const valueStyle = getComputedStyle(stats.querySelector('dd')!), labelStyle = getComputedStyle(stats.querySelector('dt')!);
    measure.font = `${valueStyle.fontWeight} ${valueStyle.fontSize} ${valueStyle.fontFamily}`;
    const maxLines = Math.max(1, Math.floor((stats.clientHeight - parseFloat(labelStyle.lineHeight) - 6) / parseFloat(valueStyle.lineHeight)));
    statPages = [];
    for (const [label, value] of statPairs()) {
      const lines: string[] = []; let line = '';
      for (const word of value.split(/\s+/).filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && measure.measureText(candidate).width > stats.clientWidth - 4) { lines.push(line); line = word; } else line = candidate;
      }
      if (line) lines.push(line);
      for (let index = 0; index < Math.max(1, lines.length); index += maxLines) statPages.push([label, lines.slice(index, index + maxLines).join(' ')]);
    }
    paint();
  }
  function paginate() {
    if (!active || !['help', 'power', 'options'].includes(topic)) return;
    const style = getComputedStyle(copy);
    measure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const maxLines = Math.max(1, Math.floor(copy.clientHeight / parseFloat(style.lineHeight))), width = copy.clientWidth;
    const lines: string[] = []; let line = '';
    for (const word of source.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && measure.measureText(candidate).width > width - 4) { lines.push(line); line = word; } else line = candidate;
    }
    if (line) lines.push(line);
    pages = [];
    for (let index = 0; index < lines.length; index += maxLines) pages.push(lines.slice(index, index + maxLines).join(' '));
    if (!pages.length) pages = ['Ready to hop.'];
    page = Math.min(page, pages.length - 1); paint();
  }
  function show(value: Topic, takeFocus = true) {
    topic = value; page = 0; app.dataset.runMenuPage = topic;
    homes.forEach(home => { home.hidden = topic !== 'home'; });
    reader.hidden = topic === 'home';
    // The seed stays in its result section; CSS places its heading and field in
    // the same board flow as the reader, with the replay action always reachable.
    copy.hidden = !['help', 'power', 'options'].includes(topic);
    stats.hidden = topic !== 'stats'; el('run-menu-pages').hidden = !['help', 'power', 'stats'].includes(topic);
    heading.textContent = ({home:'', stats:'Your run', seed:'Run seed', help:'How to play', power:'Your power', options:'Your next hop'} as const)[topic];
    panel.setAttribute('aria-labelledby', topic === 'home' ? snapshot?.state === 'ready' ? 'traveler-name' : 'result-heading' : 'run-menu-heading');
    if (topic === 'help') source = [el('ready-instructions').innerHTML.replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]*>/g, ''), el('gamepad-help').hidden ? '' : el('gamepad-help').innerHTML.replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]*>/g, ''), el('goal').textContent].join(' ');
    if (topic === 'power') source = [...el('ready-power').children].map(node => node.textContent).join('. ');
    if (topic === 'options') source = snapshot?.state === 'dead' ? el('run-reward').textContent ?? '' : el('goal').textContent ?? '';
    if (topic === 'stats') paginateStats(); else paginate();
    if (takeFocus) focus(topic === 'home' ? play : back);
  }
  const click = (event: Event) => {
    if (!active) return;
    const target = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!target) return;
    if (target.dataset.runTopic) show(target.dataset.runTopic as Topic);
    else if (target === back) show('home');
    else if (target === previous && page > 0) { page--; paint(); }
    else if (target === next && !next.disabled) { page++; paint(); }
  };
  const tab = (event: KeyboardEvent) => {
    if (!active || event.key !== 'Tab') return;
    const items = controls(); if (!items.length) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    event.preventDefault(); focus(items[(index + (event.shiftKey ? -1 : 1) + items.length) % items.length]);
  };
  const resize = new ResizeObserver(() => { if (active) { paginate(); paginateStats(); } }); resize.observe(app);
  panel.addEventListener('click', click); document.addEventListener('keydown', tab, true);
  document.fonts.addEventListener('loadingdone', paginate);
  document.fonts.ready.then(() => { if (!disposed) paginate(); });
  return {
    update(value: RunMenuSnapshot, visible: boolean, reducedMotion = false) {
      if (disposed) return;
      const key = JSON.stringify(value), stateChanged = snapshot?.state !== value.state;
      snapshot = value;
      if (key !== lastKey) {
        lastKey = key;
        set('result-coins', String(value.earnedCoins)); set('result-time', clock(value.activeSeconds)); set('result-best', String(value.best));
        set('result-best-label', `${value.mode} best`); set('result-chapter', String(value.chapter)); set('result-route', `${value.world} · ${value.traveler}`);
        if (active && topic === 'stats') paginateStats();
      }
      app.classList.toggle('run-menu-less-motion', reducedMotion);
      if (visible === active && !stateChanged) return;
      active = visible; app.dataset.runMenuOpen = String(visible);
      if (visible) { panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); show('home'); }
      else {
        homes.forEach(home => { home.hidden = false; }); reader.hidden = true;
        delete app.dataset.runMenuPage;
        // Pause may have already claimed the same panel during this update.
        if (app.dataset.pauseOpen !== 'true') { panel.removeAttribute('role'); panel.removeAttribute('aria-modal'); panel.removeAttribute('aria-labelledby'); }
      }
    },
    navigate(direction: Direction) {
      if (!active) return;
      const items = controls(); if (!items.length) return;
      const index = items.indexOf(document.activeElement as HTMLElement), step = direction === 'back' || direction === 'right' ? 1 : -1;
      focus(items[(index + step + items.length) % items.length]);
    },
    confirm() {
      if (!active) return;
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && controls().includes(focused)) focused.click(); else play.click();
    },
    back(): boolean { if (!active || topic === 'home') return false; show('home'); return true; },
    dispose() { disposed = true; resize.disconnect(); panel.removeEventListener('click', click); document.removeEventListener('keydown', tab, true); document.fonts.removeEventListener('loadingdone', paginate); },
  };
}
