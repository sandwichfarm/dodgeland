import './run-hand.css';
import type { Direction } from './game.js';
import type { RunInventory } from './market/run.js';
import type { HeldCard, MarketResult } from './market/types.js';

const visible = (node: HTMLElement): boolean => !node.closest('[hidden]') && node.getClientRects().length > 0;
const focus = (node?: HTMLElement | null): void => { if (node && visible(node)) node.focus({ preventScroll: true }); };

/** Shared with the surrounding boards, so the hand is part of their focus order. */
export function runHandControls(): HTMLElement[] {
  const root = document.getElementById('run-inventory');
  if (!root || !visible(root)) return [];
  return [...root.querySelectorAll<HTMLButtonElement>('button')].filter(node => !node.disabled && visible(node));
}

interface RunHandOptions {
  getRun(): RunInventory;
  getOwnerKey?(): string;
  getOwnerLabel?(): string | undefined;
  selectNextOwner?(): void;
  canSell(): boolean;
  unavailableReason?(): string;
  onOpenChange(open: boolean): void;
  onSell(result: MarketResult): void;
  sell?(cardId: string): MarketResult;
  getItems?(): Readonly<{ revival: number; flare: number }> | undefined;
  onUseItem?(itemId: 'revival' | 'flare'): void;
}

/** One physical hand stays on the table while the content above it changes. */
export function createRunHand(options: RunHandOptions) {
  const root = document.getElementById('run-inventory')!;
  const app = document.getElementById('app')!;
  root.classList.add('run-hand');
  root.setAttribute('aria-label', 'Your active cards');
  root.innerHTML = `
    <button id="run-hand-owner" type="button" data-hand-key="owner" hidden></button>
    <span id="run-card-count"></span>
    <button id="run-hand-prev" class="run-hand-pager" data-hand-key="previous" aria-label="Previous hand cards" hidden>‹</button>
    <div id="run-cards" role="group" aria-label="Your hand"></div>
    <button id="run-hand-next" class="run-hand-pager" data-hand-key="next" aria-label="Next hand cards" hidden>›</button>
    <p id="run-hand-owner-note" role="status" hidden></p>
    <div id="run-hand-items" role="group" aria-label="Items"></div>
    <section id="run-hand-detail" aria-labelledby="run-hand-name" aria-owns="run-cards run-hand-prev run-hand-next" hidden>
      <h2 id="run-hand-name"></h2>
      <button id="run-hand-detail-owner" type="button" data-hand-key="owner" hidden></button>
      <div class="run-hand-reading">
        <p id="run-hand-copy"></p>
        <p id="run-hand-status" role="status" hidden></p>
      </div>
      <div class="run-hand-detail-pages">
        <button id="run-hand-detail-prev" data-hand-key="detail-previous" aria-label="Previous card details">‹</button>
        <span id="run-hand-page-count" aria-live="polite"></span>
        <button id="run-hand-detail-next" data-hand-key="detail-next" aria-label="Next card details">›</button>
      </div>
      <div class="run-hand-actions">
        <button id="run-hand-close" data-hand-key="close">Close</button>
        <button id="run-hand-sell" data-hand-key="sell">Sell</button>
      </div>
    </section>`;
  const get = <T extends HTMLElement = HTMLElement>(id: string): T => root.querySelector<T>(`#${id}`)!;
  const cards = get('run-cards'), count = get('run-card-count'), detail = get('run-hand-detail'), ownerLabel = get('run-hand-owner');
  const name = get('run-hand-name'), detailOwner = get('run-hand-detail-owner'), copy = get('run-hand-copy'), status = get('run-hand-status');
  const previous = get<HTMLButtonElement>('run-hand-prev'), next = get<HTMLButtonElement>('run-hand-next');
  const previousDetail = get<HTMLButtonElement>('run-hand-detail-prev'), nextDetail = get<HTMLButtonElement>('run-hand-detail-next');
  const pageCount = get('run-hand-page-count'), closeButton = get<HTMLButtonElement>('run-hand-close'), sell = get<HTMLButtonElement>('run-hand-sell');
  const ownerNote = get('run-hand-owner-note'), items = get('run-hand-items');
  const detailPager = root.querySelector<HTMLElement>('.run-hand-detail-pages')!;
  const reading = root.querySelector<HTMLElement>('.run-hand-reading')!;
  const measure = document.createElement('canvas').getContext('2d')!;
  let active = false, disposed = false, selected: string | null = null, handPage = 0, detailPage = 0;
  let pageSize = 3, fingerprint = '', message = '', pages = [''], lastRun: RunInventory | undefined, ownerKey = options.getOwnerKey?.() ?? '';
  let returnFocus: HTMLElement | null = null, pointerFocus: HTMLElement | null = null;

  function selectedCard(): HeldCard | undefined { return options.getRun().cards.find(card => card.id === selected); }

  function rememberFocus(): string | undefined {
    const focused = document.activeElement;
    return focused instanceof HTMLElement && root.contains(focused) ? focused.dataset.handKey : undefined;
  }

  function restoreKey(key?: string) {
    if (key) focus([...root.querySelectorAll<HTMLElement>('[data-hand-key]')].find(node => node.dataset.handKey === key));
  }

  function paintHand(force = false) {
    const run = options.getRun(), slots = Math.max(run.cards.length, run.cardCapacity);
    const width = Math.max(0, root.clientWidth), short = app.clientHeight < 420;
    const minimum = short ? 62 : app.clientWidth < 480 ? 68 : 100;
    const gap = short ? 5 : 8;
    const allFit = slots * minimum + Math.max(0, slots - 1) * gap <= width;
    pageSize = allFit ? slots : Math.max(1, Math.floor((width - 104 + gap) / (minimum + gap)));
    const totalPages = Math.max(1, Math.ceil(slots / pageSize));
    handPage = Math.max(0, Math.min(handPage, totalPages - 1));
    const stamp = `${run.cards.map(card => `${card.id}:${card.name}:${card.saleValue}`).join('|')}/${slots}/${handPage}/${pageSize}/${selected ?? ''}`;
    count.textContent = `${run.cards.length} / ${run.cardCapacity} cards${totalPages > 1 ? ` · ${handPage + 1}/${totalPages}` : ''}`;
    cards.setAttribute('aria-label', `Your hand, ${run.cards.length} of ${run.cardCapacity} cards`);
    previous.hidden = next.hidden = totalPages <= 1;
    previous.disabled = handPage === 0; next.disabled = handPage >= totalPages - 1;
    root.classList.toggle('is-paged', totalPages > 1);
    if (!force && stamp === fingerprint) return;
    const focused = rememberFocus();
    fingerprint = stamp;
    const fragment = document.createDocumentFragment();
    for (let index = handPage * pageSize; index < Math.min(slots, (handPage + 1) * pageSize); index++) {
      const card = run.cards[index];
      if (!card) {
        const empty = document.createElement('span');
        empty.className = 'run-hand-empty'; empty.setAttribute('aria-label', `Empty card slot ${index + 1}`);
        const mark = document.createElement('span'); mark.textContent = '+'; mark.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span'); label.textContent = 'Empty';
        empty.append(mark, label); fragment.append(empty); continue;
      }
      const button = document.createElement('button');
      button.className = `run-hand-card rarity-${card.rarity}`;
      button.dataset.handCard = card.id; button.dataset.handKey = `card:${card.id}`;
      button.setAttribute('aria-label', `${card.name}. Inspect active card`);
      button.setAttribute('aria-controls', 'run-hand-detail'); button.setAttribute('aria-expanded', String(selected === card.id));
      button.classList.toggle('is-selected', selected === card.id);
      button.style.setProperty('--item-color', card.color);
      const illustration = document.createElement('span'); illustration.className = 'run-hand-art'; illustration.textContent = card.icon; illustration.setAttribute('aria-hidden', 'true');
      const title = document.createElement('span'); title.className = 'run-hand-card-name'; title.textContent = card.name;
      button.title = card.name; button.append(illustration, title); fragment.append(button);
    }
    cards.replaceChildren(fragment);
    const charges = options.getItems?.();
    const itemControls: HTMLElement[] = [];
    for (const [id, quantity] of [['revival', charges?.revival ?? 0], ['flare', charges?.flare ?? 0]] as const) {
      if (!quantity) continue;
      const control = document.createElement('button'); control.type = 'button'; control.className = 'run-hand-item'; control.dataset.handItem = id; control.dataset.handKey = `item:${id}`;
      control.textContent = `${id === 'revival' ? 'Revival' : 'Flare'} ×${quantity}`; control.setAttribute('aria-label', `Use ${id === 'revival' ? 'Revival' : 'Flare'} ×${quantity}`);
      itemControls.push(control);
    }
    if (!itemControls.length) itemControls.push(Object.assign(document.createElement('span'), { className: 'run-hand-items-empty', textContent: 'Items: —' }));
    items.replaceChildren(...itemControls);
    restoreKey(focused);
  }

  function paintDetailPage() {
    const target = message ? status : copy;
    target.textContent = pages[detailPage] ?? '';
    pageCount.textContent = `${detailPage + 1} / ${pages.length}`;
    previousDetail.disabled = detailPage === 0; nextDetail.disabled = detailPage >= pages.length - 1;
    if (document.activeElement instanceof HTMLButtonElement && document.activeElement.disabled) focus(closeButton);
  }

  function paginate() {
    const card = selectedCard();
    if (!active || !card || detail.hidden) return;
    // Measure with the pager present; removing it for one page only adds room.
    detailPager.hidden = false;
    const target = message ? status : copy;
    const css = getComputedStyle(target);
    measure.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
    const width = reading.clientWidth - 2;
    const lineHeight = parseFloat(css.lineHeight) || parseFloat(css.fontSize) * 1.25;
    const maxLines = Math.max(1, Math.floor(reading.clientHeight / lineHeight));
    const words = (message || card.description).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const proposed = line ? `${line} ${word}` : word;
      if (line && measure.measureText(proposed).width > width) { lines.push(line); line = word; }
      else line = proposed;
    }
    if (line) lines.push(line);
    pages = [];
    for (let index = 0; index < lines.length; index += maxLines) pages.push(lines.slice(index, index + maxLines).join(' '));
    if (!pages.length) pages.push('Active for this run.');
    detailPage = Math.min(detailPage, pages.length - 1);
    detailPager.hidden = pages.length <= 1;
    paintDetailPage();
  }

  function updateDetail() {
    const card = selectedCard();
    if (!card) return;
    name.textContent = card.name; name.title = card.name;
    const owner = options.getOwnerLabel?.(); detailOwner.hidden = !owner; detailOwner.textContent = owner ?? '';
    detailOwner.setAttribute('aria-label', owner ? `View ${owner.replace(/^Viewing\s+/, '')}. Select the next Local Play owner.` : '');
    detail.dataset.rarity = card.rarity;
    sell.textContent = options.canSell() ? `Sell ${card.saleValue} ◆` : 'Selling unavailable';
    sell.setAttribute('aria-label', `Sell ${card.name} for ${card.saleValue} coins`);
    sell.disabled = !options.canSell();
    sell.title = options.canSell() ? '' : options.unavailableReason?.() ?? '';
    copy.hidden = Boolean(message); status.hidden = !message;
    paginate();
  }

  function close(): boolean {
    if (!selected) return false;
    selected = null; message = ''; detailPage = 0;
    detail.hidden = true; detail.removeAttribute('role'); detail.removeAttribute('aria-modal');
    root.classList.remove('is-inspecting');
    const target = returnFocus; returnFocus = null;
    paintHand();
    options.onOpenChange(false);
    if (target?.isConnected && visible(target)) focus(target);
    else focus(runHandControls()[0]);
    return true;
  }

  function open(id: string) {
    if (!active || !options.getRun().cards.some(card => card.id === id)) return;
    if (selected === id) { close(); return; }
    const wasOpen = Boolean(selected);
    if (!wasOpen) returnFocus = pointerFocus ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    pointerFocus = null; selected = id; message = ''; detailPage = 0;
    detail.hidden = false; detail.setAttribute('role', 'dialog'); detail.setAttribute('aria-modal', 'true');
    root.classList.add('is-inspecting');
    paintHand(); updateDetail();
    if (!wasOpen) options.onOpenChange(true);
    focus(closeButton);
  }

  function onClick(event: Event) {
    const target = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!target || !active) return;
    if (target === ownerLabel || target === detailOwner) options.selectNextOwner?.();
    else if (target.dataset.handCard) open(target.dataset.handCard);
    else if (target === closeButton) close();
    else if (target.dataset.handItem === 'revival' || target.dataset.handItem === 'flare') options.onUseItem?.(target.dataset.handItem);
    else if (target === previous || target === next) {
      handPage += target === previous ? -1 : 1; paintHand();
      focus(target.disabled ? cards.querySelector<HTMLButtonElement>('button') : target);
    } else if (target === previousDetail || target === nextDetail) {
      detailPage += target === previousDetail ? -1 : 1; paintDetailPage();
    } else if (target === sell && selected) {
      if (!options.canSell()) { message = options.unavailableReason?.() ?? 'This action is unavailable.'; detailPage = 0; updateDetail(); return; }
      const result = options.sell?.(selected) ?? options.getRun().sell(selected);
      if (result.ok) close();
      else { message = result.message; detailPage = 0; updateDetail(); }
      options.onSell(result);
      paintHand();
    }
  }

  const onPointerDown = () => { pointerFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null; };
  function invalidateOwner(): void {
    const wasOpen = Boolean(selected);
    selected = null; handPage = 0; detailPage = 0; fingerprint = ''; message = ''; pages = [''];
    returnFocus = null; pointerFocus = null;
    detail.hidden = true; detail.removeAttribute('role'); detail.removeAttribute('aria-modal'); root.classList.remove('is-inspecting');
    ownerNote.hidden = true; ownerNote.textContent = '';
    if (wasOpen) options.onOpenChange(false);
  }
  const onKey = (event: KeyboardEvent) => {
    if (!selected || !active || (event.key !== 'Tab' && event.key !== 'Escape')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (event.key === 'Escape') { close(); return; }
    const controls = runHandControls(), index = controls.indexOf(document.activeElement as HTMLElement);
    if (controls.length) focus(controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]);
  };
  const resize = () => { if (active && !disposed) { paintHand(); paginate(); } };
  const observer = new ResizeObserver(resize);
  observer.observe(app); observer.observe(root);
  root.addEventListener('click', onClick); root.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('keydown', onKey, true);
  document.fonts.addEventListener('loadingdone', resize);
  document.fonts.ready.then(() => { if (!disposed) resize(); });

  return {
    update({ visible: shown, reduced }: { visible: boolean; reduced: boolean }) {
      if (disposed) return;
      const run = options.getRun();
      const nextOwnerKey = options.getOwnerKey?.() ?? '';
      if (nextOwnerKey !== ownerKey) { invalidateOwner(); ownerKey = nextOwnerKey; }
      if (lastRun && lastRun !== run) { invalidateOwner(); }
      lastRun = run;
      if (!shown && selected) close();
      active = shown; root.hidden = !shown;
      const unavailable = !options.canSell() && !!options.unavailableReason?.();
      ownerNote.hidden = !unavailable; ownerNote.textContent = unavailable ? options.unavailableReason!() : '';
      const label = options.getOwnerLabel?.(); ownerLabel.hidden = !label; ownerLabel.textContent = label ?? '';
      root.dataset.ownerMutationUnavailable = String(unavailable);
      app.dataset.handVisible = String(shown); root.classList.toggle('less-motion', reduced);
      if (!shown) {
        // A finished run must not leave its old cards in the hidden UI. Rebuild
        // from the current inventory when the hand is shown again.
        if (cards.childElementCount) cards.replaceChildren();
        fingerprint = ''; pointerFocus = null;
        count.textContent = `${run.cards.length} / ${run.cardCapacity} cards`;
        return;
      }
      if (selected && !selectedCard()) close();
      paintHand();
      if (selected) updateDetail();
    },
    isOpen: () => Boolean(selected),
    close,
    containsFocus: () => active && root.contains(document.activeElement),
    navigate(direction: Direction) {
      if (!active) return;
      const controls = runHandControls(), index = controls.indexOf(document.activeElement as HTMLElement);
      if (!controls.length) return;
      const step = direction === 'back' || direction === 'right' ? 1 : -1;
      focus(controls[(index + step + controls.length) % controls.length]);
    },
    confirm() {
      if (!active) return;
      const focused = document.activeElement;
      if (focused instanceof HTMLButtonElement && runHandControls().includes(focused)) focused.click();
      else focus(runHandControls()[0]);
    },
    invalidateOwner,
    dispose() {
      disposed = true; observer.disconnect();
      root.removeEventListener('click', onClick); root.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey, true);
      document.fonts.removeEventListener('loadingdone', resize);
      delete app.dataset.handVisible;
    },
  };
}
