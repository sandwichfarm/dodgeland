import './collection.css';
import { CHARACTERS, WORLDS, box, worldById, characterById } from './content.js';
import { characterPower } from './character-powers.js';
import { modelThumbnail } from './render.js';
import type { Direction, Progress } from './game.js';
import type { Model } from './content.js';
import { runHandControls } from './run-hand.js';

type Tab = 'travelers' | 'worlds' | 'sounds' | 'camp';
interface CollectionOptions { read: () => Progress; selectTraveler: (id: string) => void; selectWorld: (id: string) => void }
const soundPages = ['pack', 'mute', 'music', 'ambience', 'effects', 'preview', 'shared', 'status', 'credits'];
const worldChoices = [{ id: 'home', name: 'Traveler’s home', note: 'Start in your traveler’s own world.' }, { id: 'shuffle', name: 'Somewhere new', note: 'Start in a different world each run.' }, ...WORLDS];

/** Browsable game pieces and a paged camp book: no nested scrolling surfaces. */
export function createCollectionUI(options: CollectionOptions) {
  const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const drawer = el('drawer'), heading = el('collection-heading'), copy = el('collection-reader-copy');
  const info = el<HTMLButtonElement>('collection-info'), previous = el<HTMLButtonElement>('collection-prev'), next = el<HTMLButtonElement>('collection-next');
  const measure = document.createElement('canvas').getContext('2d')!;
  const thumbnails = new Map<string, string>();
  let tab: Tab = 'travelers', item = 0, sound = 0, camp = 0, menu = false, detail = false, page = 0, source = '', pages: string[] = [], disposed = false;
  let lastSize = '';
  const focus = (node: HTMLElement) => node.focus({ preventScroll: true });
  const controls = () => [...drawer.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)')].filter(node => !node.closest('[hidden]') && node.getClientRects().length > 0).concat(runHandControls());
  const unlocked = (character: typeof CHARACTERS[number]) => options.read().coins >= character.coins && options.read().best >= character.distance;
  const readerMode = () => detail || tab === 'sounds' && ['status', 'credits'].includes(soundPages[sound]!) || tab === 'camp' && camp === 1;
  const badge = () => {
    const character = CHARACTERS[item]!, progress = options.read();
    return character.id === progress.selected ? 'Traveling together' : unlocked(character) ? 'Ready to travel' : [character.coins ? `Coins ${Math.min(progress.coins, character.coins)} of ${character.coins}` : '', character.distance ? `Arcade hops ${Math.min(progress.best, character.distance)} of ${character.distance}` : ''].filter(Boolean).join('. ');
  };
  function thumbnail(key: string, model: Model): string {
    if (!thumbnails.has(key)) thumbnails.set(key, modelThumbnail(model));
    return thumbnails.get(key)!;
  }
  function paginate() {
    if (disposed || drawer.hidden || !readerMode() || menu) return;
    const css = getComputedStyle(copy);
    measure.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
    const width = Math.max(1, copy.clientWidth - 3), maxLines = Math.max(1, Math.floor(copy.clientHeight / parseFloat(css.lineHeight)));
    const lines: string[] = []; let line = '';
    for (const original of source.split(/\s+/).filter(Boolean)) {
      let word = original;
      if (measure.measureText(word).width > width) {
        if (line) { lines.push(line); line = ''; }
        while (measure.measureText(word).width > width) {
          let count = 1; while (count < word.length && measure.measureText(word.slice(0, count + 1)).width <= width) count++;
          lines.push(word.slice(0, count)); word = word.slice(count);
        }
      }
      const proposed = line ? `${line} ${word}` : word;
      if (line && measure.measureText(proposed).width > width) { lines.push(line); line = word; } else line = proposed;
    }
    if (line) lines.push(line);
    pages = []; for (let at = 0; at < lines.length; at += maxLines) pages.push(lines.slice(at, at + maxLines).join('\n'));
    if (!pages.length) pages = ['All set.'];
    page = Math.min(page, pages.length - 1); paintReader();
  }
  function paintReader() {
    copy.textContent = pages[page]!;
    info.hidden = false; el('collection-count').hidden = true;
    info.textContent = `Back · ${page + 1}/${pages.length}`;
    previous.disabled = detail && page === 0; next.disabled = detail && page >= pages.length - 1;
    previous.setAttribute('aria-label', 'Previous text page'); next.setAttribute('aria-label', 'Next text page');
  }
  function readerSource() {
    if (detail && tab === 'travelers') {
      const character = CHARACTERS[item]!, power = characterPower(character.id);
      heading.textContent = character.name;
      return `${character.note} ${badge()}. ${power.name}. ${power.description} Automatic. Recharge after ${power.cooldown} new blocks. Call: ${character.callLabel}.`;
    }
    if (detail && tab === 'worlds') { heading.textContent = worldChoices[item]!.name; return `${worldChoices[item]!.note} Your choice sets the beginning of your next run. New places unfold as you hop.`; }
    if (tab === 'camp') { heading.textContent = 'Your progress'; return el('storage-status').textContent ?? ''; }
    if (soundPages[sound] === 'credits') { heading.textContent = 'Audio credits'; return el('sound-credits').textContent ?? ''; }
    heading.textContent = 'Pack status'; return [!el('sound-availability').hidden ? el('sound-availability').textContent : '', el('sound-status').textContent].filter(Boolean).join(' ');
  }
  function update() {
    if (disposed) return;
    drawer.dataset.collectionTab = tab; drawer.dataset.collectionSound = soundPages[sound];
    drawer.dataset.collectionView = menu ? 'menu' : readerMode() ? 'reader' : 'browse';
    heading.textContent = menu ? 'Collection' : ({ travelers: 'Travelers', worlds: 'Worlds', sounds: 'Sounds', camp: 'Camp' })[tab];
    el('collection-menu').hidden = !menu; el('collection-body').hidden = menu; el('collection-footer').hidden = menu;
    el('collection-tabs').hidden = menu;
    for (const name of ['travelers', 'worlds', 'sounds', 'camp'] as const) el(`${name}-tab`).setAttribute('aria-pressed', String(tab === name));
    el('traveler-grid').hidden = tab !== 'travelers' || readerMode(); el('world-grid').hidden = tab !== 'worlds' || readerMode();
    el('sound-panel').hidden = tab !== 'sounds' || readerMode(); el('collection-camp').hidden = tab !== 'camp' || readerMode();
    el('collection-reader').hidden = !readerMode();
    for (const node of drawer.querySelectorAll<HTMLElement>('[data-sound-page]')) node.hidden = node.dataset.soundPage !== soundPages[sound];
    for (const node of drawer.querySelectorAll<HTMLElement>('[data-camp-page]')) node.hidden = node.dataset.campPage !== (camp ? 'storage' : 'motion');
    el<HTMLInputElement>('reduced-motion').checked = options.read().reduced;
    if (readerMode()) { source = readerSource(); paginate(); return; }
    info.hidden = tab === 'sounds' || tab === 'camp'; el('collection-count').hidden = !info.hidden;
    info.textContent = tab === 'travelers' ? 'Meet them' : 'About';
    previous.disabled = next.disabled = false;
    previous.setAttribute('aria-label', 'Previous item'); next.setAttribute('aria-label', 'Next item');
    if (tab === 'travelers') {
      const character = CHARACTERS[item]!, power = characterPower(character.id);
      el<HTMLImageElement>('collection-traveler-image').src = thumbnail(character.id, character.model);
      el('collection-traveler-name').textContent = character.name; el('collection-traveler-note').textContent = character.note;
      el('collection-power-name').textContent = `${power.icon} ${power.name}`;
      el('collection-power-copy').textContent = `${power.description} Automatic · recharge after ${power.cooldown} new blocks.`;
      el('collection-unlock').textContent = badge();
      const select = el<HTMLButtonElement>('collection-traveler-select'); select.disabled = !unlocked(character);
      select.textContent = character.id === options.read().selected ? '✓ Traveling together' : unlocked(character) ? `Choose ${character.name}` : 'Locked · see story';
      select.setAttribute('aria-pressed', String(character.id === options.read().selected));
    } else if (tab === 'worlds') {
      const choice = worldChoices[item]!, world = worldById(choice.id === 'home' ? characterById(options.read().selected).home : choice.id === 'shuffle' ? 'neon' : choice.id);
      const scenery = world.scenery[0]!.map(voxel => ({ ...voxel, x: voxel.x * .5 - .35, y: voxel.y * .5 + .2, z: voxel.z * .5 + .1, w: voxel.w * .5, d: voxel.d * .5, h: voxel.h * .5 }));
      const model = [box(0, 0, 0, 1.35, 1.1, .1, world.colors.ground), box(0, -.25, .105, 1.35, .3, .025, world.colors.water), ...scenery];
      el<HTMLImageElement>('collection-world-image').src = thumbnail(`world:${world.id}`, model);
      el('collection-world-name').textContent = choice.name; el('collection-world-note').textContent = choice.note;
      const select = el<HTMLButtonElement>('collection-world-select'); select.textContent = choice.id === options.read().world ? '✓ Journey starts here' : 'Start here next run'; select.setAttribute('aria-pressed', String(choice.id === options.read().world));
    } else el('collection-count').textContent = `${(tab === 'sounds' ? sound : camp) + 1} / ${tab === 'sounds' ? soundPages.length : 2}`;
  }
  function setTab(value: Tab) {
    tab = value; menu = detail = false; page = 0; sound = 0; camp = 0;
    item = value === 'travelers' ? Math.max(0, CHARACTERS.findIndex(character => character.id === options.read().selected)) : value === 'worlds' ? Math.max(0, worldChoices.findIndex(world => world.id === options.read().world)) : 0;
    update(); focus(el('collection-sections'));
  }
  function turn(step: number) {
    if (readerMode()) {
      const target = page + step;
      if (detail || target >= 0 && target < pages.length) { page = Math.max(0, Math.min(pages.length - 1, target)); paintReader(); return; }
    }
    if (tab === 'sounds') sound = (sound + step + soundPages.length) % soundPages.length;
    else if (tab === 'camp') camp = (camp + step + 2) % 2;
    else { const length = tab === 'travelers' ? CHARACTERS.length : worldChoices.length; item = (item + step + length) % length; }
    page = 0; update();
  }
  function back(): boolean {
    if (menu) { menu = false; update(); focus(el('collection-sections')); return true; }
    if (readerMode()) { if (detail) detail = false; else if (tab === 'sounds') sound = soundPages[sound] === 'credits' ? 0 : 6; else camp = 0; page = 0; update(); focus(info.hidden ? el('collection-next') : info); return true; }
    return false;
  }
  const onClick = (event: Event) => {
    const target = (event.target as Element).closest<HTMLButtonElement>('button'); if (!target || target.disabled) return;
    const section = target.dataset.collectionTab;
    if (section) { setTab(section as Tab); return; }
    if (target.id.endsWith('-tab')) { setTab(target.id.replace('-tab', '') as Tab); return; }
    if (target.id === 'collection-sections') { menu = !menu; detail = false; update(); if (menu) focus(el('collection-menu').querySelector('button')!); }
    else if (target === previous) turn(-1);
    else if (target === next) turn(1);
    else if (target === info) { if (readerMode()) back(); else { detail = true; page = 0; update(); focus(info); } }
    else if (target.id === 'collection-traveler-select') { options.selectTraveler(CHARACTERS[item]!.id); update(); }
    else if (target.id === 'collection-world-select') { options.selectWorld(worldChoices[item]!.id); update(); }
    else if (target.id === 'sound-load') { sound = 7; page = 0; update(); focus(info); }
  };
  const onKey = (event: KeyboardEvent) => {
    if (drawer.hidden || event.key !== 'Tab') return;
    const nodes = controls(); if (!nodes.length) return;
    event.preventDefault(); const at = nodes.indexOf(document.activeElement as HTMLElement); focus(nodes[(at + (event.shiftKey ? -1 : 1) + nodes.length) % nodes.length]!);
  };
  const resize = new ResizeObserver(() => { const size = `${drawer.clientWidth}:${drawer.clientHeight}`; if (size !== lastSize) { lastSize = size; paginate(); } });
  const statuses = new MutationObserver(() => { if (!drawer.hidden && readerMode()) { source = readerSource(); paginate(); } });
  resize.observe(drawer); statuses.observe(el('sound-status'), { childList: true, subtree: true, characterData: true }); statuses.observe(el('storage-status'), { childList: true, subtree: true, characterData: true });
  drawer.addEventListener('click', onClick); document.addEventListener('keydown', onKey, true); document.fonts.addEventListener('loadingdone', paginate);
  return {
    open(value: Tab = tab) { drawer.hidden = false; setTab(value); }, update, setTab, back,
    navigate(direction: Direction) {
      if (drawer.hidden) return;
      const nodes = controls(), current = document.activeElement, step = direction === 'back' || direction === 'right' ? 1 : -1;
      if (direction === 'left' || direction === 'right') {
        if (current instanceof HTMLInputElement && current.type === 'range') { if (step > 0) current.stepUp(5); else current.stepDown(5); current.dispatchEvent(new Event('input', { bubbles: true })); current.dispatchEvent(new Event('change', { bubbles: true })); return; }
        if (current instanceof HTMLSelectElement) { current.selectedIndex = Math.max(0, Math.min(current.options.length - 1, current.selectedIndex + step)); current.dispatchEvent(new Event('change', { bubbles: true })); return; }
      }
      const at = nodes.indexOf(current as HTMLElement); if (nodes.length) focus(nodes[(at + step + nodes.length) % nodes.length]!);
    },
    confirm() { const current = document.activeElement; if (!drawer.hidden && current instanceof HTMLElement && controls().includes(current)) current.click(); },
    dispose() { disposed = true; resize.disconnect(); statuses.disconnect(); drawer.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey, true); document.fonts.removeEventListener('loadingdone', paginate); },
  };
}
