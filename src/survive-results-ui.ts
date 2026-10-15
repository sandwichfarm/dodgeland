import { characterById } from './content.js';
import { modelThumbnail } from './render.js';
import { createSeedCopyControls } from './seed-copy.js';
import type { SurviveContribution, SurviveTogetherResult } from './survive-results.js';

export interface SurviveResultsBoard {
  show(result: SurviveTogetherResult, seedCode?: string | null): void;
  hide(): void;
  dispose(): void;
}
const metrics = [
  ['Hops', 'furthestDistance'], ['Coins found', 'coins'],
  ['Rescues', 'teammateRevives'], ['Items found', 'itemsFound'],
] as const;
const markers: Record<string, string> = { p1: '▲', p2: '●', p3: '◆', p4: '■' };
const finish = (player: SurviveContribution): string => player.lifecycle === 'departed' ? 'Left run'
  : player.lifecycle === 'device-lost' ? 'Disconnected' : player.lifecycle === 'dead' ? 'Down' : 'Active';

/** Presentation of the committed team snapshot; no live session or inventory access. */
export function createSurviveResultsBoard(root: HTMLElement, options: { readonly onAgain: () => void }): SurviveResultsBoard {
  root.classList.add('survive-results'); root.hidden = true;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'survive-results-heading');
  const previews = new Map<string, string>();
  const previousInert = new Map<HTMLElement, boolean>();
  let result: SurviveTogetherResult | undefined;
  let seedCode: string | undefined, seedPage = false;
  let seedControls: ReturnType<typeof createSeedCopyControls> | undefined;
  let selected = 0, metric = 0, short = false, perPage = 1, disposed = false;
  let returnFocus: HTMLElement | undefined;
  let lastFocusedAction: string | undefined;
  function button(label: string, action: string, callback: () => void): HTMLButtonElement {
    const node = document.createElement('button'); node.type = 'button'; node.textContent = label;
    node.dataset.resultAction = action; node.addEventListener('click', callback); return node;
  }
  function focusAction(action = 'again'): void {
    if (root.hidden || disposed || innerWidth < 240 || innerHeight < 240) return;
    root.querySelector<HTMLElement>(`[data-result-action="${action}"]:not(:disabled)`)?.focus({ preventScroll: true });
  }
  function render(): void {
    if (!result || disposed) return;
    const focused = root.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.resultAction : undefined;
    short = innerHeight < 420;
    perPage = short || innerWidth < 900 ? 1 : innerWidth >= 1200 ? 4 : 2;
    root.dataset.short = String(short);
    root.dataset.resultPage = seedPage ? 'seed' : 'results';
    seedControls?.dispose(); seedControls = undefined;
    root.replaceChildren();
    const notice = document.createElement('p'); notice.className = 'survive-results-tiny';
    notice.textContent = 'Needs 240×240 to play — enlarge this pane.';
    const sheet = document.createElement('div'); sheet.className = 'survive-results-sheet';
    if (seedPage && seedCode) {
      const heading = document.createElement('h2'); heading.id = 'survive-results-heading'; heading.textContent = 'Run seed';
      const panel = document.createElement('div'); panel.className = 'survive-results-seed';
      const field = document.createElement('textarea'); field.readOnly = true; field.setAttribute('aria-label', 'Run seed'); field.dataset.resultAction = 'seed-field'; field.spellcheck = false;
      const status = document.createElement('p'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
      const actions = document.createElement('div'); actions.className = 'survive-results-footer';
      const back = button('Back to results', 'seed-back', () => { seedPage = false; render(); focusAction('seed'); });
      const copy = document.createElement('button'); copy.type = 'button'; copy.textContent = 'Copy seed'; copy.dataset.resultAction = 'seed-copy'; copy.className = 'survive-results-again';
      panel.append(field, status); actions.append(back, copy); sheet.append(heading, panel, actions); root.append(notice, sheet);
      seedControls = createSeedCopyControls({ panel, field, button: copy, status }); seedControls.update(seedCode);
      if (focused) focusAction(focused);
      return;
    }
    const heading = document.createElement('h2'); heading.id = 'survive-results-heading'; heading.textContent = "The flock's run";
    const outcome = document.createElement('p'); outcome.className = 'survive-results-outcome';
    outcome.textContent = result.distance > 0 ? `The flock reached ${result.distance} hops.` : 'The flock needs another crossing.';
    const perch = document.createElement('div'); perch.className = 'survive-results-perch';
    const start = Math.floor(selected / perPage) * perPage;
    const shown = result.contributions.slice(start, start + perPage);
    perch.style.setProperty('--result-count', String(Math.max(1, shown.length)));
    for (const player of shown) {
      const character = characterById(player.characterId);
      const tile = document.createElement('section'); tile.className = 'survive-result-player';
      tile.dataset.participant = player.participantId;
      const image = document.createElement('img'); image.className = 'survive-result-preview'; image.alt = '';
      if (!previews.has(character.id)) previews.set(character.id, modelThumbnail(character.model, 480));
      image.src = previews.get(character.id)!;
      const name = document.createElement('h3'); name.textContent = `${markers[player.seat] ?? '◆'} ${player.seat.toUpperCase()} · ${character.name}`;
      const lifecycle = document.createElement('p'); lifecycle.className = 'survive-result-finish'; lifecycle.textContent = finish(player);
      const stats = document.createElement('dl'); stats.className = 'survive-result-stats';
      for (const [label, key] of short ? [metrics[metric]!] : metrics) {
        const group = document.createElement('div');
        const term = document.createElement('dt'); term.textContent = label;
        const value = document.createElement('dd'); value.textContent = String(player[key]);
        group.append(term, value); stats.append(group);
      }
      tile.append(image, name, lifecycle, stats); perch.append(tile);
    }
    const pages = document.createElement('nav'); pages.className = 'survive-results-pages'; pages.setAttribute('aria-label', 'Result pages');
    const total = Math.max(1, short ? result.contributions.length * metrics.length : Math.ceil(result.contributions.length / perPage));
    const current = short ? selected * metrics.length + metric : Math.floor(selected / perPage);
    const turn = (delta: number): void => {
      const next = current + delta;
      selected = short ? Math.floor(next / metrics.length) : next * perPage;
      if (short) metric = next % metrics.length;
      render(); focusAction(delta > 0 ? 'next' : 'previous');
      if (!root.contains(document.activeElement)) focusAction();
    };
    const previous = button('←', 'previous', () => turn(-1)); previous.setAttribute('aria-label', 'Previous results'); previous.disabled = current === 0;
    const next = button('→', 'next', () => turn(1)); next.setAttribute('aria-label', 'Next results'); next.disabled = current >= total - 1;
    const page = document.createElement('span'); page.className = 'survive-results-page'; page.setAttribute('aria-live', 'polite'); page.textContent = `${current + 1} / ${total}`;
    pages.append(previous, page, next);
    const again = button('Hop again', 'again', options.onAgain); again.className = 'survive-results-again';
    const footer = document.createElement('div'); footer.className = 'survive-results-footer'; footer.append(again);
    if (seedCode) footer.append(button('Seed', 'seed', () => { seedPage = true; render(); focusAction('seed-copy'); }));
    sheet.append(heading, outcome, perch, pages, footer); root.append(notice, sheet);
    if (focused) focusAction(focused);
  }
  const onResize = (): void => {
    if (!result || root.hidden) return;
    if (!seedPage) render();
    if (!root.contains(document.activeElement) || !(document.activeElement as HTMLElement)?.getClientRects().length) {
      focusAction(lastFocusedAction ?? (seedPage ? 'seed-copy' : 'again'));
      if (!root.contains(document.activeElement)) focusAction(seedPage ? 'seed-copy' : 'again');
    }
  };
  const onFocus = (event: FocusEvent): void => {
    if (event.target instanceof HTMLElement && event.target.dataset.resultAction) lastFocusedAction = event.target.dataset.resultAction;
  };
  const onKey = (event: KeyboardEvent): void => {
    if (root.hidden || event.key !== 'Tab') return;
    const controls = [...root.querySelectorAll<HTMLElement>('button:not(:disabled), textarea')].filter(node => node.getClientRects().length);
    if (!controls.length) { event.preventDefault(); return; }
    const index = controls.indexOf(document.activeElement as HTMLButtonElement);
    if (event.shiftKey && index <= 0) { event.preventDefault(); controls.at(-1)!.focus(); }
    else if (!event.shiftKey && (index < 0 || index === controls.length - 1)) { event.preventDefault(); controls[0]!.focus(); }
  };
  addEventListener('resize', onResize); root.addEventListener('keydown', onKey); root.addEventListener('focusin', onFocus);
  function hide(): void {
    root.hidden = true; result = undefined;
    seedControls?.dispose(); seedControls = undefined; seedPage = false; seedCode = undefined;
    lastFocusedAction = undefined;
    for (const [node, inert] of previousInert) node.inert = inert;
    previousInert.clear();
    if (returnFocus?.isConnected && !returnFocus.closest('[inert]') && returnFocus.getClientRects().length) returnFocus.focus({ preventScroll: true });
    returnFocus = undefined;
  }
  return {
    show(snapshot, value) {
      const code = value ?? undefined;
      if (disposed || result === snapshot && seedCode === code && !root.hidden) return;
      if (root.hidden) {
        returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
        for (const node of root.parentElement?.children ?? []) if (node !== root && node instanceof HTMLElement) { previousInert.set(node, node.inert); node.inert = true; }
      }
      result = snapshot; seedCode = code; seedPage = false; selected = metric = 0; root.hidden = false; render(); focusAction();
    },
    hide,
    dispose() { hide(); disposed = true; removeEventListener('resize', onResize); root.removeEventListener('keydown', onKey); root.removeEventListener('focusin', onFocus); root.replaceChildren(); },
  };
}
