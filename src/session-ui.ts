import { DEFAULT_KEYBOARD_BINDINGS, KEYBOARD_ACTIONS, normalizeKeyboardKey, updateKeyboardBinding, validateKeyboardBindings } from './keyboard-input.js';
import type { BindingValidation, KeyboardAction, KeyboardBindings, KeyboardProfileId } from './keyboard-input.js';
import { CHARACTERS, characterById } from './content.js';
import { modelThumbnail } from './render.js';
import type { DeviceId, SeatId } from './session.js';

const actionLabels: Record<KeyboardAction, string> = {
  forward: 'Up / forward', left: 'Left', back: 'Down / back', right: 'Right', call: 'Call',
};
const profileNames: Record<KeyboardProfileId, string> = { 'keyboard-a': 'Keyboard A', 'keyboard-b': 'Keyboard B' };

export interface SessionKeyboardEditorOptions {
  readonly root: HTMLElement;
  readonly bindings: () => KeyboardBindings;
  readonly commit: (next: KeyboardBindings) => Promise<BindingValidation>;
  readonly capture: (active: boolean) => void;
  readonly seatForProfile?: (profile: KeyboardProfileId) => SeatId | undefined;
}

export interface SessionKeyboardEditor {
  open(): void;
  close(): void;
  dispose(): void;
}

/** Compact keyboard configuration owned by Local Play setup, not shell keys. */
export function createSessionKeyboardEditor(options: SessionKeyboardEditorOptions): SessionKeyboardEditor {
  const { root } = options;
  const launch = root.querySelector<HTMLElement>('#local-session-start');
  const back = root.querySelector<HTMLElement>('#local-session-back');
  if (!launch || !back) throw new Error('Local setup controls are missing.');
  const edit = document.createElement('button');
  edit.id = 'local-session-controls'; edit.type = 'button'; edit.textContent = 'Edit controls';
  const panel = document.createElement('section');
  panel.id = 'session-keyboard-editor'; panel.hidden = true;
  panel.setAttribute('aria-label', 'Keyboard controls');
  // The Local Play board owns its action row.  Put the editor trigger beside
  // the launch action rather than assuming the launch button is a root child.
  launch.parentElement?.insertBefore(edit, launch);
  root.append(panel);

  let selected: KeyboardProfileId = 'keyboard-a';
  let capture: { profile: KeyboardProfileId; action: KeyboardAction; origin: HTMLButtonElement } | undefined;
  let reset: KeyboardProfileId | undefined;
  let page = 0;
  let disposed = false;
  const profileSeat = (profile: KeyboardProfileId): string => {
    const seat = options.seatForProfile?.(profile);
    return seat ? `P${seat.slice(1)}` : 'Unassigned';
  };
  const status = document.createElement('p');
  status.className = 'session-controls-status'; status.setAttribute('aria-live', 'polite');

  const visibleSetup = (visible: boolean): void => {
    root.querySelector<HTMLElement>('#session-board')!.hidden = visible;
    edit.hidden = visible; launch.hidden = visible; back.hidden = visible; panel.hidden = !visible;
  };
  const errorFor = (result: BindingValidation): string => {
    if (result.ok) return '';
    const conflict = result.conflicts[0];
    return conflict ? `${conflict.key} already controls ${profileSeat(conflict.first.profile)} ${actionLabels[conflict.first.action]}. Choose another key.` : result.reason ?? 'Controls could not be saved.';
  };
  const focusBinding = (action: KeyboardAction): void => {
    queueMicrotask(() => [...panel.querySelectorAll<HTMLButtonElement>('.session-binding')]
      .find(button => button.getAttribute('aria-label')?.startsWith(`${actionLabels[action]}:`))
      ?.focus({ preventScroll: true }));
  };
  const render = (message = ''): void => {
    if (disposed) return;
    panel.replaceChildren();
    const heading = document.createElement('h3'); heading.id = 'session-controls-heading'; heading.tabIndex = -1; heading.textContent = `${profileSeat(selected)} controls · ${profileNames[selected]}`;
    panel.append(heading);
    const profiles = document.createElement('div'); profiles.className = 'session-controls-profiles'; profiles.setAttribute('role', 'tablist');
    for (const profile of ['keyboard-a', 'keyboard-b'] as const) {
      const tab = document.createElement('button'); tab.type = 'button';
      const compact = matchMedia('(max-width: 319px), (max-height: 319px)').matches;
      tab.textContent = compact ? profileSeat(profile) : `${profileSeat(profile)} · ${profileNames[profile]}`;
      tab.setAttribute('aria-label', `${profileSeat(profile)} · ${profileNames[profile]}`); tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(profile === selected));
      tab.addEventListener('click', () => { selected = profile; capture = undefined; reset = undefined; options.capture(false); render(); queueMicrotask(() => panel.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')?.focus({ preventScroll: true })); }); profiles.append(tab);
    }
    panel.append(profiles);
    if (reset) {
      const confirm = document.createElement('section'); confirm.className = 'session-controls-confirm'; confirm.setAttribute('role', 'alertdialog'); confirm.setAttribute('aria-labelledby', 'session-controls-reset-copy');
      const copy = document.createElement('p'); copy.id = 'session-controls-reset-copy'; copy.textContent = `Reset ${profileSeat(reset)} to the shared-keyboard defaults?`;
      const keep = document.createElement('button'); keep.type = 'button'; keep.textContent = 'Keep current controls';
      const apply = document.createElement('button'); apply.type = 'button'; apply.className = 'danger'; apply.textContent = 'Reset controls';
      keep.addEventListener('click', () => { reset = undefined; render(); queueMicrotask(() => panel.querySelector<HTMLButtonElement>('.danger')?.focus({ preventScroll: true })); });
      apply.addEventListener('click', async () => {
        const defaults = DEFAULT_KEYBOARD_BINDINGS.profiles[reset!];
        const proposal = { ...options.bindings(), profiles: { ...options.bindings().profiles, [reset!]: { ...defaults } } } as KeyboardBindings;
        const result = await options.commit(proposal);
        if (!result.ok) { reset = undefined; render(errorFor(result)); return; }
        reset = undefined; render(`${profileNames[selected]} defaults restored.`); queueMicrotask(() => panel.querySelector<HTMLButtonElement>('.danger')?.focus({ preventScroll: true }));
      });
      confirm.append(copy, keep, apply); panel.append(confirm); queueMicrotask(() => keep.focus({ preventScroll: true }));
    } else {
      const rows = document.createElement('div'); rows.className = 'session-controls-rows';
      const perPage = 1;
      const actionPages = Math.ceil(KEYBOARD_ACTIONS.length / perPage);
      const resetPage = actionPages;
      const lastPage = resetPage;
      for (const action of page < actionPages ? KEYBOARD_ACTIONS.slice(page * perPage, page * perPage + perPage) : []) {
        const row = document.createElement('div'); row.className = 'session-controls-row';
        const label = document.createElement('span'); label.textContent = actionLabels[action];
        const key = document.createElement('button'); key.type = 'button'; key.className = 'session-binding';
        const current = options.bindings().profiles[selected][action]; key.textContent = capture?.profile === selected && capture.action === action ? `Capturing ${actionLabels[action]}` : current;
        key.setAttribute('aria-label', `${actionLabels[action]}: ${current}. Press to capture a new key.`);
        key.addEventListener('click', () => { capture = { profile: selected, action, origin: key }; options.capture(true); status.textContent = `Press a key for ${actionLabels[action]}. Esc cancels.`; render(); queueMicrotask(() => panel.querySelector<HTMLButtonElement>('.session-binding[aria-pressed="true"]')?.focus({ preventScroll: true })); });
        if (capture?.profile === selected && capture.action === action) key.setAttribute('aria-pressed', 'true');
        row.append(label, key); rows.append(row);
      }
      panel.append(rows);
      const pages = document.createElement('div'); pages.className = 'session-controls-pages';
      const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = 'Back'; previous.disabled = page === 0;
      const next = document.createElement('button'); next.type = 'button'; next.textContent = page === lastPage ? 'Finish' : 'More';
      previous.addEventListener('click', () => { capture = undefined; status.textContent = ''; options.capture(false); page--; render(); if (page < actionPages) focusBinding(KEYBOARD_ACTIONS[page * perPage]); }); next.addEventListener('click', () => { if (page < lastPage) { capture = undefined; status.textContent = ''; options.capture(false); page++; render(); if (page < actionPages) focusBinding(KEYBOARD_ACTIONS[page * perPage]); } else { visibleSetup(false); edit.focus({ preventScroll: true }); } });
      pages.append(previous, next); panel.append(pages);
      if (page === resetPage) {
        const resetButton = document.createElement('button'); resetButton.type = 'button'; resetButton.className = 'danger'; resetButton.textContent = `Reset ${profileNames[selected]}`;
        resetButton.addEventListener('click', () => { reset = selected; capture = undefined; status.textContent = ''; options.capture(false); render(); });
        panel.append(resetButton);
      }
    }
    status.textContent = message || status.textContent; panel.append(status);
  };
  const keydown = async (event: KeyboardEvent): Promise<void> => {
    if (!capture || disposed) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); const action = capture.action; capture = undefined; options.capture(false); status.textContent = 'Capture cancelled.'; render(); focusBinding(action); return;
    }
    const key = normalizeKeyboardKey(event.key);
    if (!key) { event.preventDefault(); event.stopPropagation(); status.textContent = 'Use a letter, arrow, or punctuation key.'; return; }
    event.preventDefault(); event.stopPropagation();
    const next = updateKeyboardBinding(options.bindings(), capture.profile, capture.action, key);
    const parsed = validateKeyboardBindings(next);
    if (!parsed.ok) { const action = capture.action; capture = undefined; options.capture(false); render(errorFor(parsed)); focusBinding(action); return; }
    const action = capture.action; capture = undefined;
    const committed = await options.commit(parsed.bindings); options.capture(false);
    render(committed.ok ? `${actionLabels[action]} is now ${key}.` : errorFor(committed)); focusBinding(action);
  };
  root.addEventListener('keydown', keydown, true);
  edit.addEventListener('click', () => { visibleSetup(true); render(); panel.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true }); });
  return {
    open() { visibleSetup(false); capture = undefined; reset = undefined; status.textContent = ''; },
    close() { capture = undefined; reset = undefined; options.capture(false); visibleSetup(false); },
    dispose() { disposed = true; options.capture(false); root.removeEventListener('keydown', keydown, true); edit.remove(); panel.remove(); },
  };
}

export interface SessionSetupSeat {
  readonly seat: SeatId;
  readonly device: DeviceId | null;
  readonly deviceLabel: string;
  readonly characterId: string | null;
  readonly disconnected?: boolean;
}

export interface LocalSessionBoardOptions {
  readonly root: HTMLElement;
  readonly capacity: number;
  readonly seats: () => readonly SessionSetupSeat[];
  readonly controllerAvailable: () => boolean;
  readonly onAddKeyboard: () => void;
  readonly onLeave: (seat: SeatId) => void;
  readonly onCharacter: (seat: SeatId, characterId: string) => void;
  readonly onStart: () => void;
  readonly onBack: () => void;
  readonly onRendered?: () => void;
}

export interface LocalSessionBoard {
  render(message?: string): void;
  focusStart(): void;
}

const markerFor = (seat: SeatId): string => ({ p1: '▲', p2: '●', p3: '◆', p4: '■' })[seat];
const seatLabel = (seat: SeatId): string => `P${Number(seat.slice(1))}`;

/**
 * Setup deliberately holds only a roster draft. Main owns the adoption
 * transaction, so a character click cannot mutate the staged Game owner.
 */
export function createLocalSessionBoard(options: LocalSessionBoardOptions): LocalSessionBoard {
  const { root } = options;
  const board = document.createElement('section');
  board.id = 'session-board';
  board.setAttribute('aria-labelledby', 'local-session-heading');
  const heading = document.createElement('h2'); heading.id = 'local-session-heading'; heading.textContent = 'Local Play';
  const subtitle = document.createElement('p'); subtitle.className = 'session-subtitle'; subtitle.textContent = 'Pick a traveler and a controller for every player.';
  const strip = document.createElement('div'); strip.className = 'session-roster-strip'; strip.setAttribute('aria-label', 'Player seats');
  const roster = document.createElement('div'); roster.id = 'session-roster';
  const detail = document.createElement('section'); detail.id = 'session-seat-detail'; detail.setAttribute('aria-live', 'polite');
  const pages = document.createElement('div'); pages.className = 'session-setup-pages';
  const rosterPage = document.createElement('button'); rosterPage.type = 'button'; rosterPage.textContent = 'Roster';
  const characterPage = document.createElement('button'); characterPage.type = 'button'; characterPage.textContent = 'Traveler';
  const controlsPage = document.createElement('button'); controlsPage.type = 'button'; controlsPage.textContent = 'Controls';
  pages.append(rosterPage, characterPage, controlsPage);
  const status = document.createElement('p'); status.id = 'session-status'; status.setAttribute('aria-live', 'polite');
  const actions = document.createElement('div'); actions.className = 'session-actions';
  const addKeyboard = document.createElement('button'); addKeyboard.id = 'session-add-keyboard'; addKeyboard.type = 'button';
  const start = document.createElement('button'); start.id = 'local-session-start'; start.type = 'button'; start.className = 'primary'; start.textContent = 'Start Local Play';
  const back = document.createElement('button'); back.id = 'local-session-back'; back.type = 'button'; back.textContent = 'Back to solo';
  actions.append(addKeyboard, start, back); board.append(heading, subtitle, strip, pages, roster, detail, status, actions); root.replaceChildren(board);

  let selected: SeatId = 'p1';
  let page: 'roster' | 'character' | 'controls' = 'roster';
  let message = '';
  const ready = (seat: SessionSetupSeat): boolean => !!seat.device && !!seat.characterId && !seat.disconnected;
  const compact = (): boolean => matchMedia('(max-width: 479px), (max-height: 419px)').matches;
  const render = (nextMessage = message): void => {
    const active = document.activeElement instanceof HTMLElement && board.contains(document.activeElement) ? document.activeElement : undefined;
    const focusId = active?.id;
    const focusSeat = active?.dataset.seat;
    const focusRole = active?.dataset.sessionFocus;
    message = nextMessage;
    const seats = options.seats();
    const bySeat = new Map(seats.map(seat => [seat.seat, seat]));
    // Keep the logical compact page through a live resize. Wide CSS shows both
    // panes, but the compact rule can immediately restore the chosen page.
    board.dataset.page = page;
    rosterPage.setAttribute('aria-pressed', String(page === 'roster'));
    characterPage.setAttribute('aria-pressed', String(page === 'character'));
    controlsPage.setAttribute('aria-pressed', String(page === 'controls'));
    characterPage.disabled = !bySeat.has(selected);
    strip.replaceChildren();
    for (let index = 1; index <= options.capacity; index++) {
      const seat = `p${index}` as SeatId;
      const chip = document.createElement('button'); chip.type = 'button'; chip.className = 'session-seat-chip'; chip.textContent = `${markerFor(seat)} ${index}`;
      chip.dataset.seat = seat;
      chip.setAttribute('aria-label', `${seatLabel(seat)} ${bySeat.has(seat) ? 'selected seat' : 'open seat'}`);
      chip.setAttribute('aria-pressed', String(selected === seat));
      chip.addEventListener('click', () => { selected = seat; if (compact()) page = 'character'; render(); }); strip.append(chip);
    }
    roster.replaceChildren();
    for (let index = 1; index <= options.capacity; index++) {
      const seatId = `p${index}` as SeatId, seat = bySeat.get(seatId);
      const card = document.createElement('button'); card.type = 'button'; card.className = 'session-seat-card'; card.dataset.seat = seatId;
      card.setAttribute('aria-pressed', String(selected === seatId));
      const title = document.createElement('strong'); title.textContent = `${markerFor(seatId)} ${seatLabel(seatId)}`;
      if (!seat) {
        const empty = document.createElement('span'); empty.textContent = 'Open seat';
        card.append(title, empty);
      } else {
        const character = seat.characterId ? characterById(seat.characterId) : undefined;
        const identity = document.createElement('span'); identity.className = 'session-device'; identity.textContent = seat.disconnected ? 'Disconnected' : seat.deviceLabel;
        const state = document.createElement('span'); state.className = 'session-ready'; state.textContent = character?.name ?? 'Choose traveler';
        card.append(title, identity, state);
      }
      card.addEventListener('click', () => { selected = seatId; if (compact() && seat) page = 'character'; render(); });
      roster.append(card);
    }
    detail.replaceChildren();
    const current = bySeat.get(selected);
    if (current) {
      const title = document.createElement('h3'); title.textContent = `${markerFor(selected)} ${seatLabel(selected)} traveler`;
      const device = document.createElement('p'); device.className = 'session-device'; device.textContent = current.disconnected ? 'Controller disconnected — press a button after it returns.' : current.deviceLabel;
      const candidates = CHARACTERS.filter(candidate => !seats.some(other => other.seat !== selected && other.characterId === candidate.id));
      const currentIndex = Math.max(0, candidates.findIndex(candidate => candidate.id === current.characterId));
      const candidate = candidates[currentIndex] ?? candidates[0];
      const picker = document.createElement('div'); picker.className = 'session-character-picker';
      const previous = document.createElement('button'); previous.type = 'button'; previous.dataset.sessionFocus = 'previous'; previous.textContent = 'Prev'; previous.setAttribute('aria-label', 'Previous available traveler');
      const next = document.createElement('button'); next.type = 'button'; next.dataset.sessionFocus = 'next'; next.textContent = 'Next'; next.setAttribute('aria-label', 'Next available traveler');
      const choose = document.createElement('button'); choose.type = 'button'; choose.className = 'session-character-choice'; choose.dataset.sessionFocus = 'choice';
      if (candidate) {
        const image = document.createElement('img'); image.src = modelThumbnail(candidate.model); image.alt = `${candidate.name} voxel preview`; image.className = 'session-preview';
        const name = document.createElement('strong'); name.textContent = candidate.name;
        choose.setAttribute('aria-pressed', String(candidate.id === current.characterId)); choose.append(image, name);
        const selectOffset = (offset: number): void => {
          const at = (currentIndex + offset + candidates.length) % candidates.length;
          options.onCharacter(selected, candidates[at]!.id); page = 'character';
        };
        previous.addEventListener('click', () => selectOffset(-1)); next.addEventListener('click', () => selectOffset(1)); choose.addEventListener('click', () => options.onCharacter(selected, candidate.id));
      }
      previous.disabled = candidates.length < 2; next.disabled = candidates.length < 2;
      picker.append(previous, choose, next); detail.append(title, device, picker);
      const leave = document.createElement('button'); leave.type = 'button'; leave.className = 'session-leave'; leave.dataset.sessionFocus = 'leave'; leave.textContent = 'Leave this seat'; leave.disabled = selected === 'p1';
      leave.addEventListener('click', () => { selected = seats.find(seat => seat.seat !== selected)?.seat ?? 'p1'; page = 'roster'; options.onLeave(current.seat); }); detail.append(leave);
    } else {
      const title = document.createElement('h3'); title.textContent = `${markerFor(selected)} ${seatLabel(selected)} is open`;
      const copy = document.createElement('p'); copy.textContent = 'Press a fresh controller button to join this seat, or add Keyboard B.';
      detail.append(title, copy);
    }
    const readyCount = seats.filter(ready).length;
    start.disabled = readyCount < 2 || readyCount !== seats.length;
    start.title = start.disabled
      ? seats.some(seat => seat.disconnected) ? 'Reconnect or remove every disconnected player first.' : 'Choose a traveler and device for every player first.'
      : 'Start Local Play';
    const keyboard = (['keyboard-a', 'keyboard-b'] as const).find(device => !seats.some(seat => seat.device === device));
    addKeyboard.textContent = compact() ? keyboard === 'keyboard-a' ? 'Add A' : 'Add B' : keyboard === 'keyboard-a' ? 'Add Keyboard A' : 'Add Keyboard B';
    addKeyboard.disabled = !keyboard || seats.length >= options.capacity;
    addKeyboard.hidden = !keyboard;
    status.textContent = message || (options.controllerAvailable() ? 'Press a controller button to join an open seat.' : 'Controllers aren’t available in this shell. Keyboard players can still join.');
    options.onRendered?.();
    if (active) queueMicrotask(() => {
      const restore = (focusId ? board.querySelector<HTMLElement>(`#${CSS.escape(focusId)}`) : undefined)
        ?? (focusSeat ? board.querySelector<HTMLElement>(`[data-seat="${focusSeat}"]`) : undefined)
        ?? (focusRole ? board.querySelector<HTMLElement>(`[data-session-focus="${focusRole}"]:not(:disabled)`) : undefined)
        ?? board.querySelector<HTMLElement>('.session-seat-chip[aria-pressed="true"]')
        ?? start;
      restore.focus({ preventScroll: true });
    });
  };
  rosterPage.addEventListener('click', () => { page = 'roster'; render(); });
  characterPage.addEventListener('click', () => { page = 'character'; render(); });
  controlsPage.addEventListener('click', () => { page = 'controls'; render(); });
  addKeyboard.addEventListener('click', options.onAddKeyboard);
  start.addEventListener('click', options.onStart);
  back.addEventListener('click', options.onBack);
  return { render, focusStart: () => start.focus({ preventScroll: true }) };
}
