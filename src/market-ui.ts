import './market.css';
import type { Direction } from './game.js';
import type { Character } from './content.js';
import type { RunInventory } from './market/run.js';
import type { HeldCard, MarketResult, Rarity, CosmeticDefinition, ItemDefinition } from './market/types.js';
import { CONSUMABLES } from './consumables.js';
import type { CoOpMarketContext } from './co-op-market.js';
import { createMarketPreview } from './market-preview.js';
import { createMarketScene } from './market-scene.js';
import { runHandControls } from './run-hand.js';

export interface MarketGear {readonly id:string;readonly name:string;readonly icon:string;readonly color:string;readonly description:string}
interface MarketUIOptions {
  getGear?():readonly MarketGear[]|undefined;
  getRun(): RunInventory;
  getCharacter(): Character;
  getOwner?(): { key: string; seat: string; marker: string; character: Character } | undefined;
  getOwners?(): readonly { key: string; seat: string; marker: string; character: Character }[];
  getOwnerKey?(): string;
  getOwnerLabel?(): string | undefined;
  selectOwner?(seat: string): void;
  selectNextOwner?(): void;
  canMutate?(): boolean;
  unavailableReason?(): string;
  getCoOpContext?(): CoOpMarketContext | undefined;
  transaction?(request: { kind: 'buy' | 'buy-consumable' | 'sell' | 'claim-pack' | 'skip-pack' | 'equip'; offerId?: string; itemId?: string; cardId?: string; ids?: readonly string[]; discardIds?: readonly string[] }): MarketResult;
  canOpen(): boolean;
  open(): boolean;
  close(resume: boolean): void;
  canRestoreFocus(): boolean;
  shortcut(): string;
  changed(): void;
  getReducedMotion?(): boolean;
}

type View = 'shop' | 'wardrobe';
type Source = 'offer' | 'consumable' | 'card' | 'power' | 'look' | 'choice' | 'discard';
type StockSection = 'cards' | 'rare' | 'extras';
type Face = Pick<HeldCard, 'icon' | 'name' | 'rarity' | 'description' | 'color'>;
interface DisplayItem {
  key: string; id: string; source: Source; item: Face; definition?: ItemDefinition;
  itemId?:string; price?: number; note?: string; section?: StockSection; sold?: boolean;
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
  const owner = textNode('span', '', 'market-owner'); owner.id = 'market-owner'; owner.hidden = true;
  owner.tabIndex = -1; owner.setAttribute('role', 'heading'); owner.setAttribute('aria-level', '2');
  const ownerStrip = textNode('div', '', 'market-owner-strip'); ownerStrip.id = 'market-owner-strip'; ownerStrip.hidden = true; ownerStrip.setAttribute('role', 'group'); ownerStrip.setAttribute('aria-label', 'Local Play owner');
  overlay.querySelector('.market-toolbar')!.prepend(ownerStrip, owner);
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
  // Only an empty Local Play inventory needs a UI-only presentation flag. An
  // ordinary market follows its own RunInventory.isOpen lifecycle exactly.
  let ownerKey = options.getOwnerKey?.() ?? 'solo', ownerGeneration = 0, ownerRoster = '', virtualPresentation = false;
  // A ghost can still have an authoritative market window, but cannot submit
  // its close action. Remember a local dismissal until an owner selection
  // intentionally opens that read-only view again.
  let dismissedRun: RunInventory | undefined;
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
  function mutationsAvailable(): boolean { return options.canMutate?.() ?? true; }
  function unavailableReason(): string { return options.unavailableReason?.() ?? 'This action is unavailable.'; }
  function syncOwner(): void {
    const shared = options.getOwner?.();
    const owners = options.getOwners?.() ?? [];
    owner.hidden = !shared;
    ownerStrip.hidden = owners.length < 2;
    owner.textContent = options.getOwnerLabel?.() ?? (shared ? `Viewing ${shared.seat.toUpperCase()} ${shared.marker} · ${shared.character.name}` : '');
    overlay.setAttribute('aria-label', owner.textContent || 'Market');
    owner.dataset.ownerKey = shared?.key ?? '';
    owner.title = shared ? `${owner.textContent}. ${mutationsAvailable() ? 'Run interactions are available.' : unavailableReason()}` : '';
    const roster = owners.map(candidate => `${candidate.key}:${candidate.character.id}`).join('|');
    if (roster !== ownerRoster) {
      ownerRoster = roster;
      ownerStrip.replaceChildren(...owners.map(candidate => {
        const control = button(`${candidate.seat.toUpperCase()} ${candidate.marker}`, `owner:${candidate.seat}`, 'owner-seat', candidate.seat);
        control.className = 'market-owner-seat'; control.setAttribute('aria-label', `View ${candidate.seat.toUpperCase()} ${candidate.marker}, ${candidate.character.name}`);
        return control;
      }));
    }
    for (const control of ownerStrip.querySelectorAll<HTMLButtonElement>('[data-market-action="owner-seat"]')) {
      const selected = control.dataset.id === shared?.seat;
      control.setAttribute('aria-pressed', String(selected)); control.classList.toggle('is-selected', selected);
    }
  }
  function resetOwnerState(): void {
    cancelClosing(); currentRun = undefined; dismissedRun = undefined; travelerRendered = ''; lastMilestone = 0; draftId = '';
    picked.clear(); discarded.clear(); replacing = false; view = 'shop'; inspection = undefined;
    page = 0; pageCount = 1; pageAnchor = undefined; visibleKeys = []; rendered = '';
    detailSource = ''; detailPages = []; detailPage = 0;
    element('market-status').textContent = ''; element('market-reveal').replaceChildren();
  }
  function invalidateOwner(): boolean {
    const oldRun = currentRun;
    const marketWasOpen = isOpen();
    ownerGeneration += 1;
    // Call the existing close path while getRun still addresses the departing
    // owner; a selected HUD seat is changed only after this returns.
    if (marketWasOpen && oldRun === options.getRun()) options.close(false);
    if (wasOpen) modal(false);
    virtualPresentation = false; resetOwnerState(); syncOwner(); return marketWasOpen;
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
    for (const offer of options.getCoOpContext?.()?.offers.filter(candidate => candidate.source === 'consumable') ?? []) {
      const gear=options.getGear?.();
      const item = gear?gear.find(candidate=>candidate.id===offer.itemId):CONSUMABLES.find(candidate => candidate.id === offer.itemId);
      if (!item) continue;
      result.push({ key: `consumable:${offer.id}`, id: offer.id, itemId:offer.itemId, source: 'consumable', item: { name: item.name, icon: 'icon' in item?item.icon:item.id === 'revival' ? '✚' : '✦', rarity: 'rare', color:'color' in item?item.color:item.id === 'revival' ? '#5aa795' : '#d59d4b', description: 'description' in item?item.description:`${item.name} item. ${item.id === 'revival' ? 'Return one dead teammate safely.' : 'Regroup dead teammates safely.'}` }, price: offer.price, sold: offer.sold, section: 'rare' });
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
    return all.filter(entry => entry.source === 'offer' || entry.source === 'consumable');
  }
  function tile(entry: DisplayItem, index: number): HTMLButtonElement {
    const control = button('', `inspect:${entry.key}`, 'inspect', entry.key);
    const gear=!!options.getGear?.()&&entry.source==='consumable';
    const kind = entry.definition?.kind ?? 'card';
    const gearUnavailable=gear&&entry.sold?(currentRun?.market?(short?'Full':'Item capacity reached'):(short?'At market':'Available at an earned market')):'';
    control.className = `market-item market-tile market-${kind}${kind === 'cosmetic' ? '' : ' playing-card'}${entry.source === 'offer' ? '' : ' market-held'}`;
    if (entry.source === 'offer' || entry.source === 'consumable') {
      control.dataset.offer = entry.id; control.dataset.sold = String(!!entry.sold); control.disabled = !!entry.sold;
      if (entry.source === 'consumable' && entry.sold) control.title = gearUnavailable || `Already carrying ${entry.item.name}.`;
    }
    if (entry.source === 'card' || entry.source === 'choice' || entry.source === 'discard') control.dataset.card = entry.id;
    if (entry.source === 'look') control.dataset.cosmetic = entry.id;
    if (entry.source === 'power') control.dataset.power = entry.id;
    if(gear){control.className='market-item market-tile market-gear';control.style.setProperty('--item-color',entry.item.color);}
    else decorate(control, entry.item, index);
    if(gear){const art=textNode('span',entry.item.icon,'market-gear-voxel');art.setAttribute('aria-hidden','true');control.append(art,textNode('strong',entry.item.name));}
    else if (entry.definition?.kind === 'cosmetic') cosmeticFace(control, entry.definition);
    else control.append(face(entry.item, kind));
    const selected = entry.source === 'choice' ? picked.has(entry.id) : entry.source === 'discard' && discarded.has(entry.id);
    const state = entry.source === 'offer' ? entry.sold ? '✓ Yours' : `${entry.price} ◆`
      : entry.source === 'consumable' ? entry.sold ? gearUnavailable || `Already carrying ${entry.item.name}` : `${entry.price} ◆`
      : entry.source === 'choice' ? selected ? '✓ Selected' : 'View card'
      : entry.source === 'discard' ? selected ? '✕ Discard' : 'Keep'
      : entry.source === 'card' ? 'In your hand' : entry.note ?? 'Owned';
    control.append(textNode('span', state, 'market-tile-price'));
    control.setAttribute('aria-label', `${entry.item.name}, ${rarityLabel(entry.item.rarity)}. ${state}. ${entry.sold ? entry.source === 'consumable' ? gearUnavailable || 'Maximum one held.' : 'Purchased.' : 'View details.'}`);
    if (entry.source === 'choice' || entry.source === 'discard') {
      control.classList.add('market-choice'); control.classList.toggle('is-selected', selected);
      control.classList.toggle('is-discarded', entry.source === 'discard' && selected);
      control.setAttribute('aria-pressed', String(selected));
      const burst = textNode('span', '', 'card-selection-burst'); burst.setAttribute('aria-hidden', 'true'); control.prepend(burst);
    }
    if (!mutationsAvailable() && ['choice', 'discard'].includes(entry.source)) {
      control.disabled = true; control.title = unavailableReason();
      control.setAttribute('aria-label', `${entry.item.name}. ${unavailableReason()}`);
    }
    return control;
  }
  function renderInspection(run: RunInventory, entry: DisplayItem): void {
    const art = element('market-inspect-art'); art.replaceChildren(); art.className = `market-inspect-art rarity-${entry.item.rarity}`;
    art.style.setProperty('--item-color', entry.item.color);
    if(options.getGear?.()&&entry.source==='consumable')art.append(textNode('span',entry.item.icon,'market-gear-voxel'));
    else if (entry.definition?.kind === 'cosmetic') cosmeticFace(art, entry.definition, true);
    else art.append(face(entry.item, entry.definition?.kind, true));
    element('market-inspect-name').textContent = entry.item.name;
    element('market-inspect-kind').textContent = `${rarityLabel(entry.item.rarity)} · ${entry.definition?.kind === 'cosmetic' ? lookLabel(entry.definition) : entry.definition?.kind === 'pack' ? 'Pack' : entry.definition?.kind === 'power' ? 'Power' : entry.source === 'consumable' ? 'Item' : 'Card'}`;
    element('market-inspect-description').textContent = entry.item.description;
    const action = element<HTMLButtonElement>('market-inspect-action');
    element('market-inspect-note').classList.remove('market-error');
    action.hidden = false; action.disabled = false; action.dataset.id = entry.id;
    let actionName = '', label = '', note = entry.note ?? 'Lasts this run.';
    if (entry.source === 'offer' || entry.source === 'consumable') {
      actionName = entry.source === 'consumable' ? 'buy-consumable' : 'buy'; label = entry.source === 'consumable' ? `Buy ${entry.item.name} · ${entry.price} ◆` : `${entry.definition?.kind === 'pack' ? 'Open' : 'Buy'} · ${entry.price} ◆`;
      action.disabled = run.wallet < entry.price!;
      if (action.disabled) note = options.getGear?.()?'Not enough coins.':`Need ${entry.price! - run.wallet} more coins.`;
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
    if (actionName && !mutationsAvailable()) { action.disabled = true; note = unavailableReason(); }
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
    const narrowCoOpShop = screen === 'shop' && short && !owner.hidden && window.innerWidth < 480 && window.innerHeight < 330;
    overlay.dataset.marketView = screen; overlay.dataset.marketRoomy = String(roomy); overlay.dataset.marketCapacity = String(capacity); overlay.dataset.marketShort = String(short);
    overlay.dataset.marketSingleOffer = String(narrowCoOpShop);
    overlay.dataset.marketDraftPhase = replacing ? 'replace' : 'choose';
    overlay.classList.toggle('is-drafting', !!run.pendingPack); overlay.classList.toggle('is-inspecting', !!inspection);
    for (const [id, value] of [['market-table', 'shop'], ['market-wardrobe', 'wardrobe'], ['market-draft', 'draft'], ['market-inspect', 'inspect']]) {
      const panel = element(id); panel.hidden = screen !== value; panel.inert = panel.hidden;
    }
    for (const key of ['shop', 'wardrobe'] as const) {
      const tab = element<HTMLButtonElement>(`market-${key}-tab`); tab.setAttribute('aria-pressed', String(view === key)); tab.disabled = !!run.pendingPack;
    }
    // A paid draft remains locked for its active owner, but a disconnected
    // owner must still be able to dismiss its read-only presentation without
    // accidentally skipping or claiming the already-paid pack.
    const draftLocked = !!run.pendingPack && mutationsAvailable();
    element('market-close').setAttribute('aria-disabled', String(draftLocked));
    element('market-close').hidden = draftLocked;
    element('market-skip').hidden = !run.pendingPack;
    element('market-picks-back').hidden = !run.pendingPack || !replacing || !!inspection;
    element('market-view-heading').textContent = screen === 'wardrobe' ? 'Dress your traveler' : screen === 'draft' ? 'Choose your cards' : screen === 'inspect' ? 'Take a closer look' : options.getGear?.()?'Race gear':'Choose a find';
    // A short owner toolbar leaves room for one readable offer row. Keep the
    // remaining stock on the existing visible pager instead of clipping it
    // beneath the persistent hand. Shop pages advance each fixed shelf
    // section independently, so both rare consumables keep the one rare slot
    // instead of a flat slice silently dropping the second one.
    const gear=options.getGear?.();
    const items = currentEntries(run, all).filter(entry=>!gear||view==='wardrobe'||entry.source==='consumable'), limit = screen === 'shop' ? 6 : capacity;
    const shopSections:readonly (readonly [StockSection,number])[]=gear?[['rare',2]]:[['cards',3],['rare',1],['extras',2]];
    // Solo retains its established six-slot shelf. Only an owner-labelled
    // Local Play table uses the bounded one-per-section page in a short frame.
    const visibleShopSlots = (slots: number): number => short && !owner.hidden ? 1 : slots;
    const shopPageFor = (entry: DisplayItem): number => {
      if (narrowCoOpShop) return Math.max(0, items.findIndex(item => item.key === entry.key));
      const section = shopSections.find(([name]) => name === entry.section);
      if (!section) return 0;
      const stock = items.filter(item => item.section === section[0]);
      return Math.floor(Math.max(0, stock.findIndex(item => item.key === entry.key)) / visibleShopSlots(section[1]));
    };
    if (pageAnchor) {
      const index = items.findIndex(entry => entry.key === pageAnchor);
      if (index >= 0) page = screen === 'shop' ? shopPageFor(items[index]!) : Math.floor(index / limit);
      pageAnchor = undefined;
    }
    pageCount = narrowCoOpShop
      ? Math.max(1, items.length)
      : screen === 'shop'
      ? Math.max(1, ...shopSections.map(([section, slots]) => Math.ceil(items.filter(item => item.section === section).length / visibleShopSlots(slots))))
      : Math.max(1, Math.ceil(items.length / limit));
    page = Math.min(page, pageCount - 1);
    const shown = narrowCoOpShop
      ? items.slice(page, page + 1)
      : screen === 'shop'
      ? shopSections.flatMap(([section, slots]) => {
        const visible = visibleShopSlots(slots);
        return items.filter(item => item.section === section).slice(page * visible, (page + 1) * visible);
      })
      : items.slice(page * limit, (page + 1) * limit);
    visibleKeys = shown.map(entry => entry.key);
    if (inspected) renderInspection(run, inspected);
    else if (screen === 'shop' && narrowCoOpShop) {
      shown.forEach((entry, index) => offers.append(tile(entry, index)));
    } else if(screen==='shop'&&gear){shown.forEach((entry,index)=>offers.append(tile(entry,index)));
    } else if (screen === 'shop') {
      // Keep the same six places after a purchase. An empty rare shelf is a
      // deliberate slot; it never makes cosmetics slide into the card row.
      for (const [section, label, fullSlots] of [['cards', 'Cards', 3], ['rare', 'Rare finds', 1], ['extras', 'Cosmetics', 2]] as const) {
        const slots = visibleShopSlots(fullSlots);
        const group = textNode('section', '', `market-stock-group market-stock-${section}`); group.dataset.section = section;
        group.setAttribute('aria-label', label); group.append(textNode('h4', label));
        const grid = textNode('div', '', 'market-stock-grid');
        // Each page retains the established three-card, one-rare, two-look
        // shelf. Paging makes both eligible consumables reachable when they
        // share the single rare place instead of silently hiding Flare.
        const stock = shown.filter(entry => entry.section === section);
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
    element('market-pagination').hidden = !!inspection || pageCount <= 1;
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
    const nextOwnerKey = options.getOwnerKey?.() ?? 'solo';
    if (nextOwnerKey !== ownerKey) { ownerKey = nextOwnerKey; ownerGeneration += 1; resetOwnerState(); }
    syncOwner();
    const run = options.getRun(); overlay.classList.toggle('less-motion', reducedMotion());
    if (closingRun && (closingRun !== run || !run.isOpen || !run.alive || !options.canRestoreFocus())) {
      const forceClose = closingRun === run && run.isOpen;
      cancelClosing(); if (forceClose) options.close(false);
    }
    if (currentRun !== run) {
      virtualPresentation = false;
      currentRun = run; travelerRendered = ''; lastMilestone = 0; draftId = ''; picked.clear(); discarded.clear(); replacing = false; resetView();
      element('market-status').textContent = ''; element('market-reveal').replaceChildren();
    }
    if (!run.alive && virtualPresentation) {
      // A virtual inspection has no RunInventory close transition of its own.
      // Return the shared session before removing the modal when its owner dies.
      options.close(false);
    }
    if (!run.alive) virtualPresentation = false;
    const window = run.market, available = !!window && run.alive, open = isOpen();
    opener.hidden = !available; opener.disabled = !options.canOpen() && !run.isOpen;
    opener.textContent = run.pendingPack ? 'Finish choosing cards' : window ? `Market · ${options.shortcut()} · ${Math.ceil(window.remaining)}s` : 'Market';
    opener.setAttribute('aria-label', run.pendingPack ? `Finish choosing your pack cards (${options.shortcut()})` : window ? `Open market at ${window.milestone} points, ${Math.ceil(window.remaining)} seconds remaining (${options.shortcut()})` : 'Market unavailable');
    element('market-wallet').textContent = `${run.wallet} ◆`;
    element('market-tab-wallet').textContent = `${run.wallet} ◆`;
    element('market-shop-tab').querySelector('span')!.textContent=options.getGear?.()?'Race gear':'Market';
    overlay.dataset.gearOnly=String(!!options.getGear?.());
    element('market-heading').textContent = options.getGear?.()?'Race gear':window ? `Market · ${window.milestone}` : 'Market';
    element('market-window').textContent = window && mutationsAvailable() ? 'Take your time. The trail is paused.' : window ? unavailableReason() : `${unavailableReason()} No active market is open for this player.`;
    if (window && window.milestone !== lastMilestone) {
      lastMilestone = window.milestone; resetView();
      element('market-announcement').textContent = `Market open at ${window.milestone} points. Press ${options.shortcut()} or use Market. You have 15 seconds of play to visit.`;
    }
    if (!run.alive) { picked.clear(); element('market-status').textContent = ''; element('market-reveal').replaceChildren(); element('market-announcement').textContent = ''; }
    if (run.pendingPack?.id !== (draftId || undefined)) {
      draftId = run.pendingPack?.id ?? ''; picked.clear(); discarded.clear(); replacing = false; page = 0; inspection = undefined; rendered = '';
    }
    for (const id of ['market-skip', 'market-claim']) {
      const control = element<HTMLButtonElement>(id);
      if (!mutationsAvailable() && !control.hidden) { control.disabled = true; control.title = unavailableReason(); }
    }
    // The shared hand can sell while this draft stays open. Only prune removed
    // discards: current choices, offer inspection and the page remain intact.
    for (const id of discarded) if (!run.cards.some(card => card.id === id)) discarded.delete(id);
    // Participation can change without mutating a RunInventory revision. It
    // still changes whether the current owner may commit a visible action.
    const signature = `${run.revision}:${window?.milestone ?? 0}:${run.wallet}:${mutationsAvailable()}:${unavailableReason()}:${view}:${inspection}:${page}:${capacity}:${roomy}:${short}:${[...picked]}:${replacing}:${[...discarded]}`;
    if (open && signature !== rendered) { rendered = signature; renderContents(run); }
    if (open) renderTraveler(run);
    if (open !== wasOpen) modal(open);
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
  /** Presentation stays modal through the close animation; actions do not. */
  function isOpen(): boolean { const run = options.getRun(); return run.alive && run !== dismissedRun && (virtualPresentation || run.isOpen); }
  function runIsVisible(): boolean { return isOpen() && !closingRun; }
  function close(resume = true): void {
    const run = options.getRun();
    if (!resume) {
      cancelClosing(); if (runIsVisible()) options.close(false); virtualPresentation = false;
      update(); options.changed(); return;
    }
    if (!runIsVisible()) return;
    if (run.pendingPack && mutationsAvailable()) { element('market-status').textContent = 'Keep your cards or skip this pack before hopping.'; focusControl(); return; }
    if (!run.isOpen || reducedMotion()) {
      virtualPresentation = false; options.close(options.canRestoreFocus());
      if (!mutationsAvailable()) dismissedRun = run;
      update(); options.changed(); return;
    }
    closingRun = run; overlay.inert = true; overlay.classList.add('is-closing'); syncPreviews();
    const closeGeneration = ownerGeneration;
    closeTimer = setTimeout(() => {
      if (closeGeneration !== ownerGeneration) return;
      const owner = closingRun; cancelClosing();
      if (!disposed && owner === options.getRun() && owner?.isOpen && owner.alive) {
        options.close(options.canRestoreFocus());
        if (!mutationsAvailable()) dismissedRun = owner;
      }
      update(); options.changed();
    }, 160);
  }
  function openForSelected(): boolean {
    dismissedRun = undefined;
    if (!options.canOpen() || !options.open()) return false;
    const run = options.getRun(), virtual = !run.isOpen;
    // Let the normal replacement reset run before latching a real empty-owner
    // view. Otherwise that reset would immediately clear the virtual flag.
    if (virtual && currentRun !== run) update();
    virtualPresentation = virtual; update(); options.changed(); return true;
  }
  function focusSelectedOwner(): boolean {
    if (owner.hidden || owner.closest('[hidden], [inert]') || !owner.getClientRects().length) return false;
    owner.focus({ preventScroll: true }); return true;
  }
  function toggle(): void {
    if (closingRun) return;
    if (runIsVisible()) { close(); return; }
    openForSelected();
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
    if (action === 'owner-seat') { if (id) options.selectOwner?.(id); return; }
    if (action && ['buy', 'buy-consumable', 'sell', 'equip', 'choice', 'discard', 'claim', 'skip'].includes(action) && !mutationsAvailable()) {
      element('market-status').textContent = unavailableReason(); return;
    }
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
      const result = options.transaction?.({ kind: 'skip-pack' }) ?? run.skipPack();
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
      } else finish(options.transaction?.({ kind: 'claim-pack', ids: [...picked], discardIds: replacing ? [...discarded] : [] }) ?? run.claimPack([...picked], replacing ? [...discarded] : []));
    }
    else if (action === 'buy') {
      const entry = entries(run).find(item => item.key === `offer:${id}`); finish(options.transaction?.({ kind: 'buy', offerId: id }) ?? run.buy(id), entry);
    } else if (action === 'buy-consumable') {
      const entry = entries(run).find(item => item.key === `consumable:${id}`); finish(options.transaction?.({ kind: 'buy-consumable', offerId: id, itemId: entry?.itemId }) ?? { ok: false, message: 'That item is unavailable.' }, entry);
    } else if (action === 'sell') finish(options.transaction?.({ kind: 'sell', cardId: id }) ?? run.sell(id));
    else if (action === 'equip') {
      const entry = entries(run).find(item => item.key === `look:${id}`); finish(options.transaction?.({ kind: 'equip', itemId: id }) ?? run.equipCosmetic(id), entry);
    }
  }
  function navigate(direction: Direction): void {
    if (!runIsVisible()) return;
    const available = controls(), index = available.indexOf(document.activeElement as HTMLElement);
    const step = direction === 'right' || direction === 'back' ? 1 : -1;
    const target = available[index < 0 ? 0 : (index + step + available.length) % available.length];
    target?.focus({ preventScroll: true });
  }
  function keydown(event: KeyboardEvent): void {
    if (!runIsVisible() || event.defaultPrevented) return;
    if (closingRun) { event.preventDefault(); return; }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (inspection) back(); else close(); }
    else if (event.key === 'Tab') { event.preventDefault(); navigate(event.shiftKey ? 'left' : 'right'); }
  }
  function confirm(): void {
    if (!closingRun && runIsVisible() && document.activeElement instanceof HTMLButtonElement && controls().includes(document.activeElement)) document.activeElement.click();
  }
  function resize(): void {
    const width = overlay.clientWidth || window.innerWidth, height = overlay.clientHeight || window.innerHeight;
    // The market may reserve a hand shelf whose overflowing controls report a
    // larger box than the actual frame. The frame itself is authoritative for
    // the bounded short owner layout.
    const nextCapacity = width >= 760 && height >= 430 ? 3 : 1, nextRoomy = width >= 1100 && height >= 780, nextShort = height < 330 || window.innerHeight < 330;
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
  return { update, toggle, close, navigate, confirm, invalidateOwner, openForSelected, focusSelectedOwner, isOpen, dispose(): void {
    if (disposed) return;
    disposed = true; resizeObserver.disconnect(); detailObserver.disconnect(); document.fonts.removeEventListener('loadingdone', paginateInspection); cancelClosing(); modal(false); clearItemPreviews(); unbindTraveler?.(); travelerPreview?.dispose(); scene.dispose();
    opener.removeEventListener('click', toggle); overlay.removeEventListener('click', click); overlay.removeEventListener('keydown', keydown); hand.removeEventListener('keydown', keydown); compactCopy.remove(); detailNext.remove(); owner.remove(); ownerStrip.remove();
  } };
}
