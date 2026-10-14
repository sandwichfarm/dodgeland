import './market.css';
import type { Direction } from './game.js';
import type { Character } from './content.js';
import type { RunInventory } from './market/run.js';
import type { HeldCard, MarketResult, Rarity, CosmeticDefinition, ItemDefinition } from './market/types.js';
import { createMarketPreview } from './market-preview.js';
import { createMarketScene } from './market-scene.js';
import { runHandControls } from './run-hand.js';

interface MarketUIOptions {
  getRun(): RunInventory;
  getCharacter(): Character;
  canOpen(): boolean;
  open(): boolean;
  close(resume: boolean): void;
  canRestoreFocus(): boolean;
  shortcut(): string;
  changed(): void;
  getReducedMotion?(): boolean;
}

type View = 'shop' | 'wardrobe';
type Source = 'offer' | 'card' | 'power' | 'look' | 'choice' | 'discard';
type StockSection = 'cards' | 'rare' | 'extras';
type Face = Pick<HeldCard, 'icon' | 'name' | 'rarity' | 'description' | 'color'>;
interface DisplayItem {
  key: string; id: string; source: Source; item: Face; definition?: ItemDefinition;
  price?: number; note?: string; section?: StockSection; sold?: boolean;
}
const element = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const rarityLabel = (rarity: Rarity): string => rarity[0].toUpperCase() + rarity.slice(1);
const ranks: Record<Rarity, string> = { common: 'C', uncommon: 'U', rare: 'R', epic: 'E', legendary: 'L' };
const lookLabel = (item: CosmeticDefinition): 'Hat' | 'Shirt' | 'Effect' => item.appearance.style === 'hat' ? 'Hat' : item.appearance.style === 'shirt' ? 'Shirt' : 'Effect';
function textNode<K extends keyof HTMLElementTagNameMap>(tag: K, text: string, className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.textContent = text; node.className = className; return node;
}

/** One market table, a separate wardrobe, and bounded pack/detail views. */
export function createMarketUI(options: MarketUIOptions) {
  const overlay = element('market'), opener = element<HTMLButtonElement>('market-open');
  const offers = element('market-offers');
  const hand = element('run-inventory');
  const wardrobe = element('market-wardrobe-items'), choices = element('market-choices');
  const travelerModel = element('market-traveler-model');
  const scene = createMarketScene(element<HTMLCanvasElement>('market-scene'));
  type Preview = ReturnType<typeof createMarketPreview>;
  const itemPreviews: { preview: Preview; unbind(): void }[] = [];
  let travelerPreview: Preview | undefined, unbindTraveler: (() => void) | undefined, travelerRendered = '';
  const picked = new Set<string>();
  const discarded = new Set<string>();
  let replacing = false;
  let currentRun: RunInventory | undefined, rendered = '', draftId = '', wasOpen = false;
  let lastMilestone = 0, disposed = false, view: View = 'shop';
  let inspection: string | undefined, page = 0, pageCount = 1, capacity = 1, roomy = false, short = false;
  let visibleKeys: string[] = [], pageAnchor: string | undefined;
  let closingRun: RunInventory | undefined, closeTimer: ReturnType<typeof setTimeout> | undefined;
  const peers = [...overlay.parentElement!.children].filter((node): node is HTMLElement => node instanceof HTMLElement && node !== overlay && node !== hand);
  const previousInert = new Map<HTMLElement, boolean>();
  const reducedMotion = (): boolean => !!options.getReducedMotion?.() || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  overlay.setAttribute('aria-owns', hand.id);
  const compactCopy = textNode('p', '', 'market-compact-copy'); compactCopy.id = 'market-compact-copy';
  compactCopy.setAttribute('aria-live', 'polite');
  const detailNext = button('→', 'detail-next', 'detail-next'); detailNext.id = 'market-detail-next';
  overlay.querySelector('.market-inspect-copy')!.append(compactCopy, detailNext);
  const measure = document.createElement('canvas').getContext('2d')!;
  let detailSource = '', detailPages: string[] = [], detailPage = 0;

  function paginateInspection(): void {
    if (!short || !inspection || !compactCopy.clientWidth || !compactCopy.clientHeight) return;
    const style = getComputedStyle(compactCopy);
    measure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const width = compactCopy.clientWidth - 2, lineCount = Math.max(1, Math.floor(compactCopy.clientHeight / parseFloat(style.lineHeight)));
    const lines: string[] = []; let line = '';
    for (const word of detailSource.split(/\s+/).filter(Boolean)) {
      const proposed = line ? `${line} ${word}` : word;
      if (line && measure.measureText(proposed).width > width) { lines.push(line); line = word; }
      else line = proposed;
    }
    if (line) lines.push(line);
    detailPages = [];
    for (let index = 0; index < lines.length; index += lineCount) detailPages.push(lines.slice(index, index + lineCount).join(' '));
    detailPage = Math.min(detailPage, Math.max(0, detailPages.length - 1));
    compactCopy.textContent = detailPages[detailPage] ?? '';
    detailNext.disabled = detailPages.length <= 1;
    detailNext.textContent = `${detailPage + 1}/${detailPages.length} →`;
    detailNext.setAttribute('aria-label', `Details page ${detailPage + 1} of ${detailPages.length}. ${detailPage + 1 === detailPages.length ? 'Read again' : 'Next page'}.`);
  }

  function bindPreview(target: HTMLElement, preview: Preview): () => void {
    let hovered = false;
    const sync = (): void => preview.setActive(hovered || target.contains(document.activeElement));
    const enter = (): void => { hovered = true; sync(); };
    const leave = (): void => { hovered = false; sync(); };
    const focusOut = (event: FocusEvent): void => preview.setActive(hovered || (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)));
    target.addEventListener('pointerenter', enter); target.addEventListener('pointerleave', leave);
    target.addEventListener('focusin', sync); target.addEventListener('focusout', focusOut);
    return () => {
      target.removeEventListener('pointerenter', enter); target.removeEventListener('pointerleave', leave);
      target.removeEventListener('focusin', sync); target.removeEventListener('focusout', focusOut);
    };
  }
  function clearItemPreviews(): void {
    for (const { preview, unbind } of itemPreviews) { unbind(); preview.dispose(); }
    itemPreviews.length = 0;
  }
  function syncPreviews(): void {
    const visible = options.getRun().isOpen && !closingRun && !document.hidden;
    for (const preview of [travelerPreview, ...itemPreviews.map(item => item.preview)]) {
      preview?.setReducedMotion(reducedMotion()); preview?.setVisible(visible);
    }
    // Theme changes write these root tokens. Reading the inline declaration
    // keeps frame updates from forcing a style/layout flush.
    const theme = document.documentElement.style;
    scene.update({ visible: options.getRun().isOpen && !document.hidden, reducedMotion: reducedMotion(),
      background: theme.getPropertyValue('--bg') || '#f4f2df',
      foreground: theme.getPropertyValue('--fg') || '#263c38',
      primary: theme.getPropertyValue('--primary') || '#477953' });
  }
  function renderTraveler(run: RunInventory): void {
    const character = options.getCharacter(), cosmetics = run.equippedCosmetics;
    const signature = `${character.id}:${cosmetics.map(item => item.id).join(',')}`;
    if (signature === travelerRendered) return;
    travelerRendered = signature;
    const subject = { kind: 'character' as const, character, cosmetics };
    if (travelerPreview) travelerPreview.setSubject(subject);
    else {
      travelerPreview = createMarketPreview(subject, { visible: false, reducedMotion: reducedMotion() });
      travelerModel.append(travelerPreview.element); unbindTraveler = bindPreview(travelerModel, travelerPreview);
    }
    travelerModel.dataset.character = character.id;
    element('market-traveler-name').textContent = character.name;
    element('market-traveler-outfit').textContent = cosmetics.length ? cosmetics.map(item => item.name).join(' · ') : 'Ready to hop';
    travelerModel.setAttribute('aria-label', `${character.name}, your current traveler. Hover or focus to rotate.`);
  }
  function cancelClosing(): void {
    if (closeTimer !== undefined) clearTimeout(closeTimer);
    closeTimer = undefined; closingRun = undefined; overlay.inert = false; overlay.classList.remove('is-closing');
  }
  function controls(): HTMLElement[] {
    if (closingRun) return [];
    return [...overlay.querySelectorAll<HTMLElement>('button:not(:disabled), [data-market-key][tabindex="0"]'), ...runHandControls()]
      .filter(control => !control.closest('[hidden], [inert]') && control.getClientRects().length > 0);
  }
  function focusControl(key?: string): void {
    const available = controls();
    const target = (key ? available.find(control => control.dataset.marketKey === key || `hand:${control.dataset.handKey}` === key) : undefined)
      ?? available.find(control => control.dataset.marketAction === (inspection ? 'back' : 'inspect'))
      ?? available[0];
    target?.focus({ preventScroll: true });
  }
  function modal(open: boolean): void {
    overlay.hidden = !open;
    if (open) {
      overlay.classList.add('is-entering');
      for (const peer of peers) { previousInert.set(peer, peer.inert); peer.inert = true; }
      focusControl();
    } else {
      cancelClosing(); overlay.classList.remove('is-entering');
      for (const [peer, inert] of previousInert) peer.inert = inert;
      previousInert.clear();
      if (wasOpen && options.canRestoreFocus()) (opener.hidden || opener.disabled ? element('pause') : opener).focus({ preventScroll: true });
    }
    wasOpen = open;
  }
  function button(label: string, key: string, action: string, id?: string): HTMLButtonElement {
    const control = textNode('button', label);
    control.type = 'button'; control.dataset.marketKey = key; control.dataset.marketAction = action;
    if (id) control.dataset.id = id;
    return control;
  }
  function decorate(node: HTMLElement, item: Face, index = 0): void {
    node.classList.add(`rarity-${item.rarity}`); node.style.setProperty('--item-color', item.color);
    node.style.setProperty('--deal-delay', `${index * 55}ms`);
  }
  function face(item: Face, kind = 'card', detail = false): HTMLElement {
    const body = textNode('span', '', 'playing-card-face');
    const corner = textNode('span', '', 'card-corner'); corner.setAttribute('aria-hidden', 'true');
    corner.append(textNode('b', ranks[item.rarity]), textNode('span', item.icon));
    const illustration = textNode('span', item.icon, 'card-illustration'); illustration.setAttribute('aria-hidden', 'true');
    if (kind === 'pack') illustration.classList.add('card-pack-seal');
    body.append(corner, illustration);
    if (!detail) body.append(textNode('strong', item.name, 'card-name'));
    return body;
  }
  function cosmeticFace(target: HTMLElement, item: CosmeticDefinition, detail = false): void {
    const preview = createMarketPreview({ kind: 'cosmetic', item }, { visible: false, reducedMotion: reducedMotion() });
    const display = textNode('span', '', 'market-cosmetic-display'); display.append(preview.element);
    target.append(display);
    if (!detail) target.append(textNode('strong', item.name, 'market-cosmetic-name'));
    itemPreviews.push({ preview, unbind: bindPreview(target, preview) });
  }
  function entries(run: RunInventory): DisplayItem[] {
    const result: DisplayItem[] = [];
    for (const offer of run.market?.offers ?? []) {
      const item = run.catalog.get(offer.itemId); if (!item) continue;
      result.push({ key: `offer:${offer.id}`, id: offer.id, source: 'offer', item, definition: item, price: offer.price, sold: offer.sold,
        section: offer.section ?? (item.kind === 'card' ? 'cards' : item.kind === 'cosmetic' ? 'extras' : 'rare') });
    }
    for (const card of run.cards) {
      const source = run.pendingPack && replacing ? 'discard' : 'card';
      result.push({ key: `${source}:${card.id}`, id: card.id, source, item: card, price: card.saleValue });
    }
    for (const power of run.powers) {
      const item = run.catalog.get(power.itemId); if (item) result.push({ key: `power:${power.id}`, id: power.id, source: 'power', item, definition: item, note: `${Math.ceil(power.remaining)}s of play left` });
    }
    for (const id of run.cosmetics) {
      const item = run.catalog.get(id); if (item?.kind === 'cosmetic') result.push({ key: `look:${id}`, id, source: 'look', item, definition: item,
        note: run.equippedCosmetics.some(look => look.id === id) ? '✓ Wearing' : 'Owned' });
    }
    for (const card of run.pendingPack?.choices ?? []) result.push({ key: `choice:${card.id}`, id: card.id, source: 'choice', item: card });
    return result;
  }
  function currentEntries(run: RunInventory, all = entries(run)): DisplayItem[] {
    if (run.pendingPack) return all.filter(entry => entry.source === (replacing ? 'discard' : 'choice'));
    if (view === 'wardrobe') return all.filter(entry => entry.source === 'look');
    return all.filter(entry => entry.source === 'offer');
  }
  function tile(entry: DisplayItem, index: number): HTMLButtonElement {
    const control = button('', `inspect:${entry.key}`, 'inspect', entry.key);
    const kind = entry.definition?.kind ?? 'card';
    control.className = `market-item market-tile market-${kind}${kind === 'cosmetic' ? '' : ' playing-card'}${entry.source === 'offer' ? '' : ' market-held'}`;
    if (entry.source === 'offer') { control.dataset.offer = entry.id; control.dataset.sold = String(!!entry.sold); control.disabled = !!entry.sold; }
    if (entry.source === 'card' || entry.source === 'choice' || entry.source === 'discard') control.dataset.card = entry.id;
    if (entry.source === 'look') control.dataset.cosmetic = entry.id;
    if (entry.source === 'power') control.dataset.power = entry.id;
    decorate(control, entry.item, index);
    if (entry.definition?.kind === 'cosmetic') cosmeticFace(control, entry.definition);
    else control.append(face(entry.item, kind));
    const selected = entry.source === 'choice' ? picked.has(entry.id) : entry.source === 'discard' && discarded.has(entry.id);
    const state = entry.source === 'offer' ? entry.sold ? '✓ Yours' : `${entry.price} ◆`
      : entry.source === 'choice' ? selected ? '✓ Selected' : 'View card'
      : entry.source === 'discard' ? selected ? '✕ Discard' : 'Keep'
      : entry.source === 'card' ? 'In your hand' : entry.note ?? 'Owned';
    control.append(textNode('span', state, 'market-tile-price'));
    control.setAttribute('aria-label', `${entry.item.name}, ${rarityLabel(entry.item.rarity)}. ${state}. ${entry.sold ? 'Purchased.' : 'View details.'}`);
    if (entry.source === 'choice' || entry.source === 'discard') {
      control.classList.add('market-choice'); control.classList.toggle('is-selected', selected);
      control.classList.toggle('is-discarded', entry.source === 'discard' && selected);
      control.setAttribute('aria-pressed', String(selected));
      const burst = textNode('span', '', 'card-selection-burst'); burst.setAttribute('aria-hidden', 'true'); control.prepend(burst);
    }
    return control;
  }
  function renderInspection(run: RunInventory, entry: DisplayItem): void {
    const art = element('market-inspect-art'); art.replaceChildren(); art.className = `market-inspect-art rarity-${entry.item.rarity}`;
    art.style.setProperty('--item-color', entry.item.color);
    if (entry.definition?.kind === 'cosmetic') cosmeticFace(art, entry.definition, true);
    else art.append(face(entry.item, entry.definition?.kind, true));
    element('market-inspect-name').textContent = entry.item.name;
    element('market-inspect-kind').textContent = `${rarityLabel(entry.item.rarity)} · ${entry.definition?.kind === 'cosmetic' ? lookLabel(entry.definition) : entry.definition?.kind === 'pack' ? 'Pack' : entry.definition?.kind === 'power' ? 'Power' : 'Card'}`;
    element('market-inspect-description').textContent = entry.item.description;
    const action = element<HTMLButtonElement>('market-inspect-action');
    element('market-inspect-note').classList.remove('market-error');
    action.hidden = false; action.disabled = false; action.dataset.id = entry.id;
    let actionName = '', label = '', note = entry.note ?? 'Lasts this run.';
    if (entry.source === 'offer') {
      actionName = 'buy'; label = `${entry.definition?.kind === 'pack' ? 'Open' : 'Buy'} · ${entry.price} ◆`;
      action.disabled = run.wallet < entry.price!;
      if (action.disabled) note = `Need ${entry.price! - run.wallet} more coins.`;
      else if (entry.definition?.kind === 'pack') note = 'Choose after opening. Skipping keeps no cards and gives no refund.';
    } else if (entry.source === 'card') { actionName = 'sell'; label = `Sell · ${entry.price} ◆`; }
    else if (entry.source === 'look') {
      actionName = 'equip'; label = entry.note === '✓ Wearing' ? '✓ Wearing' : 'Wear it';
      action.disabled = entry.note === '✓ Wearing';
    } else if (entry.source === 'choice') {
      actionName = 'choice'; label = picked.has(entry.id) ? 'Unselect card' : 'Choose card';
      note = `${picked.size} of ${run.pendingPack?.picks} selected`;
    } else if (entry.source === 'discard') {
      actionName = 'discard'; label = discarded.has(entry.id) ? 'Keep card' : 'Discard';
      note = 'Leaves your hand when you confirm. No sale coins.';
    } else { action.hidden = true; }
    action.dataset.marketAction = actionName; action.dataset.marketKey = `${actionName}:${entry.id}`; action.textContent = label;
    action.setAttribute('aria-label', entry.source === 'discard' ? `${label}: ${entry.item.name}. Changes apply only after confirming the replacement.` : label);
    element('market-inspect-note').textContent = note;
    detailSource = `${entry.item.name}. ${entry.item.description} ${note}`;
    paginateInspection();
  }
  function renderContents(run: RunInventory): void {
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement.dataset.marketKey
      ?? (document.activeElement.dataset.handKey ? `hand:${document.activeElement.dataset.handKey}` : undefined) : undefined;
    clearItemPreviews(); offers.replaceChildren(); wardrobe.replaceChildren(); choices.replaceChildren();
    const all = entries(run), inspected = all.find(entry => entry.key === inspection && !entry.sold);
    if (!inspected) inspection = undefined;
    const screen = inspection ? 'inspect' : run.pendingPack ? 'draft' : view;
    overlay.dataset.marketView = screen; overlay.dataset.marketRoomy = String(roomy); overlay.dataset.marketCapacity = String(capacity); overlay.dataset.marketShort = String(short);
    overlay.dataset.marketDraftPhase = replacing ? 'replace' : 'choose';
    overlay.classList.toggle('is-drafting', !!run.pendingPack); overlay.classList.toggle('is-inspecting', !!inspection);
    for (const [id, value] of [['market-table', 'shop'], ['market-wardrobe', 'wardrobe'], ['market-draft', 'draft'], ['market-inspect', 'inspect']]) {
      const panel = element(id); panel.hidden = screen !== value; panel.inert = panel.hidden;
    }
    for (const key of ['shop', 'wardrobe'] as const) {
      const tab = element<HTMLButtonElement>(`market-${key}-tab`); tab.setAttribute('aria-pressed', String(view === key)); tab.disabled = !!run.pendingPack;
    }
    element('market-close').setAttribute('aria-disabled', String(!!run.pendingPack));
    element('market-close').hidden = !!run.pendingPack;
    element('market-skip').hidden = !run.pendingPack;
    element('market-picks-back').hidden = !run.pendingPack || !replacing || !!inspection;
    element('market-view-heading').textContent = screen === 'wardrobe' ? 'Dress your traveler' : screen === 'draft' ? 'Choose your cards' : screen === 'inspect' ? 'Take a closer look' : 'Choose a find';
    const items = currentEntries(run, all), limit = screen === 'shop' ? 6 : capacity;
    if (pageAnchor) {
      const index = items.findIndex(entry => entry.key === pageAnchor);
      if (index >= 0) page = Math.floor(index / limit);
      pageAnchor = undefined;
    }
    pageCount = Math.max(1, Math.ceil(items.length / limit)); page = Math.min(page, pageCount - 1);
    const shown = items.slice(page * limit, (page + 1) * limit); visibleKeys = shown.map(entry => entry.key);
    if (inspected) renderInspection(run, inspected);
    else if (screen === 'shop') {
      // Keep the same six places after a purchase. An empty rare shelf is a
      // deliberate slot; it never makes cosmetics slide into the card row.
      for (const [section, label, slots] of [['cards', 'Cards', 3], ['rare', 'Rare finds', 1], ['extras', 'Cosmetics', 2]] as const) {
        const group = textNode('section', '', `market-stock-group market-stock-${section}`); group.dataset.section = section;
        group.setAttribute('aria-label', label); group.append(textNode('h4', label));
        const grid = textNode('div', '', 'market-stock-grid');
        const stock = items.filter(entry => entry.section === section);
        for (let index = 0; index < slots; index++) {
          const entry = stock[index];
          const slot = String((section === 'cards' ? 1 : section === 'rare' ? 4 : 5) + index);
          if (entry) { const item = tile(entry, index); item.dataset.marketSlot = slot; grid.append(item); }
          else {
            const empty = textNode('div', '', 'market-stock-empty');
            empty.dataset.emptySlot = section; empty.dataset.marketSlot = slot;
            empty.append(textNode('span', section === 'rare' ? '✦' : '—', 'market-empty-mark'),
              textNode('span', section === 'rare' ? 'No rare find' : 'Sold out'));
            grid.append(empty);
          }
        }
        group.append(grid); offers.append(group);
      }
    } else {
      const target = screen === 'wardrobe' ? wardrobe : choices;
      shown.forEach((entry, index) => target.append(tile(entry, index)));
      if (!shown.length) target.append(textNode('p', screen === 'draft' ? 'No cards to replace. Keep your choices or skip this pack.' : 'Find a new look at the market.', 'market-empty'));
    }
    element('market-pagination').hidden = screen === 'shop' || !!inspection || pageCount <= 1;
    element('market-page-count').textContent = `${page + 1} / ${pageCount}`;
    element<HTMLButtonElement>('market-prev').disabled = page === 0;
    element<HTMLButtonElement>('market-next').disabled = page === pageCount - 1;
    element('market-draft-footer').hidden = !run.pendingPack || !!inspection;
    if (run.pendingPack) {
      const pending = run.pendingPack;
      const projection = run.previewPack([...picked], replacing ? [...discarded] : []);
      element('market-draft-heading').textContent = replacing ? 'Make room' : pending.name;
      element('market-draft-rule').textContent = replacing ? 'Mark old cards to discard. Confirm to swap.' : `Choose ${pending.picks} of ${pending.choices.length} · Skip: no cards or refund`;
      element('market-bonus').hidden = !pending.bonus || replacing;
      element('market-pick-count').textContent = replacing ? `${projection.count} / ${projection.capacity} cards` : `${picked.size} / ${pending.picks} selected`;
      const claim = element<HTMLButtonElement>('market-claim');
      claim.disabled = replacing ? !projection.valid : picked.size !== pending.picks;
      const label = replacing ? 'Swap cards' : picked.size === pending.picks && !projection.valid ? 'Make room' : `Keep ${pending.picks} card${pending.picks === 1 ? '' : 's'}`;
      claim.textContent = short ? replacing ? 'Swap' : picked.size === pending.picks && !projection.valid ? 'Replace' : 'Keep' : label;
      claim.setAttribute('aria-label', replacing ? `Confirm replacement: ${projection.count} cards in ${projection.capacity} slots. ${discarded.size} old cards discarded.` : label);
    }
    if (wasOpen && focused) focusControl(focused);
  }
  function resetView(): void { view = 'shop'; inspection = undefined; page = 0; pageAnchor = undefined; rendered = ''; }
  function update(): void {
    if (disposed) return;
    const run = options.getRun(); overlay.classList.toggle('less-motion', reducedMotion());
    if (closingRun && (closingRun !== run || !run.isOpen || !run.alive || !options.canRestoreFocus())) {
      const forceClose = closingRun === run && run.isOpen;
      cancelClosing(); if (forceClose) options.close(false);
    }
    if (currentRun !== run) {
      currentRun = run; travelerRendered = ''; lastMilestone = 0; draftId = ''; picked.clear(); discarded.clear(); replacing = false; resetView();
      element('market-status').textContent = ''; element('market-reveal').replaceChildren();
    }
    const window = run.market, available = !!window && run.alive;
    opener.hidden = !available; opener.disabled = !options.canOpen() && !run.isOpen;
    opener.textContent = run.pendingPack ? 'Finish choosing cards' : window ? `Market · ${options.shortcut()} · ${Math.ceil(window.remaining)}s` : 'Market';
    opener.setAttribute('aria-label', run.pendingPack ? `Finish choosing your pack cards (${options.shortcut()})` : window ? `Open market at ${window.milestone} points, ${Math.ceil(window.remaining)} seconds remaining (${options.shortcut()})` : 'Market unavailable');
    element('market-wallet').textContent = `${run.wallet} ◆`;
    element('market-tab-wallet').textContent = `${run.wallet} ◆`;
    element('market-heading').textContent = window ? `Market · ${window.milestone}` : 'Market';
    element('market-window').textContent = 'Take your time. The trail is paused.';
    if (window && window.milestone !== lastMilestone) {
      lastMilestone = window.milestone; resetView();
      element('market-announcement').textContent = `Market open at ${window.milestone} points. Press ${options.shortcut()} or use Market. You have 15 seconds of play to visit.`;
    }
    if (!run.alive) { picked.clear(); element('market-status').textContent = ''; element('market-reveal').replaceChildren(); element('market-announcement').textContent = ''; }
    if (run.pendingPack?.id !== (draftId || undefined)) {
      draftId = run.pendingPack?.id ?? ''; picked.clear(); discarded.clear(); replacing = false; page = 0; inspection = undefined; rendered = '';
    }
    // The shared hand can sell while this draft stays open. Only prune removed
    // discards: current choices, offer inspection and the page remain intact.
    for (const id of discarded) if (!run.cards.some(card => card.id === id)) discarded.delete(id);
    const signature = `${run.revision}:${window?.milestone ?? 0}:${run.wallet}:${view}:${inspection}:${page}:${capacity}:${roomy}:${short}:${[...picked]}:${replacing}:${[...discarded]}`;
    if (run.isOpen && signature !== rendered) { rendered = signature; renderContents(run); }
    if (run.isOpen) renderTraveler(run);
    if (run.isOpen !== wasOpen) modal(run.isOpen);
    syncPreviews();
  }
  function changeScreen(next: View): void {
    view = next; inspection = undefined; page = 0; pageAnchor = undefined; rendered = ''; update(); focusControl();
  }
  function finish(result: MarketResult, target?: DisplayItem): void {
    element('market-status').textContent = result.message;
    let acquiredKey: string | undefined;
    if (result.ok) {
      inspection = undefined; page = 0;
      if (result.cards?.length) { view = 'shop'; }
      else if (target?.definition?.kind === 'cosmetic' || target?.source === 'look') {
        view = 'wardrobe'; acquiredKey = `look:${target.definition?.id ?? target.id}`;
      } else if (target?.definition?.kind === 'power') {
        view = 'shop';
      }
      pageAnchor = acquiredKey;
      rendered = '';
    }
    update(); options.changed();
    if (!result.ok && inspection) {
      element('market-status').textContent = '';
      const note = element('market-inspect-note'); note.textContent = result.message; note.classList.add('market-error');
      const entry = entries(options.getRun()).find(item => item.key === inspection);
      detailSource = `${result.message} ${entry?.item.name ?? ''}. ${entry?.item.description ?? ''}`;
      detailPage = 0; paginateInspection();
    }
    if (result.ok && runIsVisible()) focusControl(acquiredKey ? `inspect:${acquiredKey}` : undefined);
  }
  function runIsVisible(): boolean { return options.getRun().isOpen && !closingRun; }
  function close(resume = true): void {
    const run = options.getRun();
    if (!resume) {
      cancelClosing(); if (run.isOpen) options.close(false);
      update(); options.changed(); return;
    }
    if (!run.isOpen || closingRun) return;
    if (run.pendingPack) { element('market-status').textContent = 'Keep your cards or skip this pack before hopping.'; focusControl(); return; }
    if (reducedMotion()) { options.close(options.canRestoreFocus()); update(); options.changed(); return; }
    closingRun = run; overlay.inert = true; overlay.classList.add('is-closing'); syncPreviews();
    closeTimer = setTimeout(() => {
      const owner = closingRun; cancelClosing();
      if (!disposed && owner === options.getRun() && owner?.isOpen && owner.alive) options.close(options.canRestoreFocus());
      update(); options.changed();
    }, 160);
  }
  function toggle(): void {
    if (closingRun) return;
    if (options.getRun().isOpen) { close(); return; }
    if (!options.canOpen() || !options.open()) return;
    update(); options.changed();
  }
  function back(): void {
    element('market-status').textContent = '';
    const previous = inspection; inspection = undefined; rendered = ''; update(); focusControl(previous ? `inspect:${previous}` : undefined);
  }
  function click(event: Event): void {
    if (closingRun) return;
    const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-market-action]') : null;
    if (!target || target.disabled) return;
    const run = options.getRun(), id = target.dataset.id!, action = target.dataset.marketAction;
    if (action && ['view', 'page', 'inspect'].includes(action)) element('market-status').textContent = '';
    if (action === 'close') close();
    else if (action === 'view' && !run.pendingPack) changeScreen(id === 'wardrobe' ? 'wardrobe' : 'shop');
    else if (action === 'page') {
      page = Math.max(0, Math.min(pageCount - 1, page + (id === 'next' ? 1 : -1)));
      rendered = ''; update(); focusControl();
    } else if (action === 'inspect') {
      inspection = id; detailPage = 0; rendered = ''; update(); focusControl('back');
    } else if (action === 'detail-next') {
      detailPage = (detailPage + 1) % Math.max(1, detailPages.length); paginateInspection();
    } else if (action === 'back') back();
    else if (action === 'picks-back' && run.pendingPack) {
      replacing = false; page = 0; inspection = undefined; rendered = ''; update(); focusControl();
    } else if (action === 'discard' && run.pendingPack && replacing) {
      if (!run.cards.some(card => card.id === id)) return;
      if (discarded.has(id)) discarded.delete(id); else discarded.add(id);
      back();
    } else if (action === 'skip' && run.pendingPack) {
      const result = run.skipPack();
      if (result.ok) view = 'shop';
      finish(result);
    }
    else if (action === 'choice') {
      if (!run.pendingPack || !run.pendingPack.choices.some(card => card.id === id)) return;
      if (picked.has(id)) picked.delete(id);
      else if (picked.size < run.pendingPack.picks) picked.add(id);
      else if (run.pendingPack.picks === 1) { picked.clear(); picked.add(id); }
      else { element('market-status').textContent = 'Unselect a card to swap it.'; return; }
      element('market-status').textContent = ''; back();
    } else if (action === 'claim' && run.pendingPack) {
      if (!replacing && picked.size === run.pendingPack.picks && !run.previewPack([...picked]).valid) {
        replacing = true; inspection = undefined; page = 0; rendered = ''; update(); focusControl();
      } else finish(run.claimPack([...picked], replacing ? [...discarded] : []));
    }
    else if (action === 'buy') {
      const entry = entries(run).find(item => item.key === `offer:${id}`); finish(run.buy(id), entry);
    } else if (action === 'sell') finish(run.sell(id));
    else if (action === 'equip') {
      const entry = entries(run).find(item => item.key === `look:${id}`); finish(run.equipCosmetic(id), entry);
    }
  }
  function navigate(direction: Direction): void {
    if (!options.getRun().isOpen || closingRun) return;
    const available = controls(), index = available.indexOf(document.activeElement as HTMLElement);
    const step = direction === 'right' || direction === 'back' ? 1 : -1;
    const target = available[index < 0 ? 0 : (index + step + available.length) % available.length];
    target?.focus({ preventScroll: true });
  }
  function keydown(event: KeyboardEvent): void {
    if (!options.getRun().isOpen || event.defaultPrevented) return;
    if (closingRun) { event.preventDefault(); return; }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (inspection) back(); else close(); }
    else if (event.key === 'Tab') { event.preventDefault(); navigate(event.shiftKey ? 'left' : 'right'); }
  }
  function confirm(): void {
    if (!closingRun && options.getRun().isOpen && document.activeElement instanceof HTMLButtonElement && controls().includes(document.activeElement)) document.activeElement.click();
  }
  function resize(): void {
    const width = overlay.clientWidth || window.innerWidth, height = overlay.clientHeight || window.innerHeight;
    const nextCapacity = width >= 760 && height >= 430 ? 3 : 1, nextRoomy = width >= 1100 && height >= 780, nextShort = height < 330;
    if (nextCapacity === capacity && nextRoomy === roomy && nextShort === short) return;
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement.dataset.marketKey : undefined;
    const anchor = inspection ?? (focused?.startsWith('inspect:') ? focused.slice(8) : visibleKeys[0]);
    capacity = nextCapacity; roomy = nextRoomy; short = nextShort; pageAnchor = anchor; rendered = ''; update();
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(overlay);
  const detailObserver = new ResizeObserver(paginateInspection); detailObserver.observe(compactCopy);
  document.fonts.addEventListener('loadingdone', paginateInspection);
  opener.addEventListener('click', toggle); overlay.addEventListener('click', click); overlay.addEventListener('keydown', keydown); hand.addEventListener('keydown', keydown);
  resize();
  return { update, toggle, close, navigate, confirm, dispose(): void {
    if (disposed) return;
    disposed = true; resizeObserver.disconnect(); detailObserver.disconnect(); document.fonts.removeEventListener('loadingdone', paginateInspection); cancelClosing(); modal(false); clearItemPreviews(); unbindTraveler?.(); travelerPreview?.dispose(); scene.dispose();
    opener.removeEventListener('click', toggle); overlay.removeEventListener('click', click); overlay.removeEventListener('keydown', keydown); hand.removeEventListener('keydown', keydown); compactCopy.remove(); detailNext.remove();
  } };
}
