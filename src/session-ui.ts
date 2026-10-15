import { DEFAULT_KEYBOARD_BINDINGS, KEYBOARD_ACTIONS, normalizeKeyboardKey, updateKeyboardBinding, validateKeyboardBindings } from './keyboard-input.js';
import type { BindingValidation, KeyboardAction, KeyboardBindings, KeyboardProfileId } from './keyboard-input.js';

const actionLabels: Record<KeyboardAction, string> = {
  forward: 'Up / forward', left: 'Left', back: 'Down / back', right: 'Right', call: 'Call',
};
const profileSeats: Record<KeyboardProfileId, string> = { 'keyboard-a': 'P1', 'keyboard-b': 'P2' };
const profileNames: Record<KeyboardProfileId, string> = { 'keyboard-a': 'Keyboard A', 'keyboard-b': 'Keyboard B' };

export interface SessionKeyboardEditorOptions {
  readonly root: HTMLElement;
  readonly bindings: () => KeyboardBindings;
  readonly commit: (next: KeyboardBindings) => Promise<BindingValidation>;
  readonly capture: (active: boolean) => void;
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
  root.insertBefore(edit, launch); root.append(panel);

  let selected: KeyboardProfileId = 'keyboard-a';
  let capture: { profile: KeyboardProfileId; action: KeyboardAction; origin: HTMLButtonElement } | undefined;
  let reset: KeyboardProfileId | undefined;
  let page = 0;
  let disposed = false;
  const status = document.createElement('p');
  status.className = 'session-controls-status'; status.setAttribute('aria-live', 'polite');

  const visibleSetup = (visible: boolean): void => {
    edit.hidden = visible; launch.hidden = visible; back.hidden = visible; panel.hidden = !visible;
  };
  const errorFor = (result: BindingValidation): string => {
    if (result.ok) return '';
    const conflict = result.conflicts[0];
    return conflict ? `${conflict.key} already controls ${profileSeats[conflict.first.profile]} ${actionLabels[conflict.first.action]}. Choose another key.` : result.reason ?? 'Controls could not be saved.';
  };
  const focusBinding = (action: KeyboardAction): void => {
    queueMicrotask(() => [...panel.querySelectorAll<HTMLButtonElement>('.session-binding')]
      .find(button => button.getAttribute('aria-label')?.startsWith(`${actionLabels[action]}:`))
      ?.focus({ preventScroll: true }));
  };
  const render = (message = ''): void => {
    if (disposed) return;
    panel.replaceChildren();
    const heading = document.createElement('h3'); heading.id = 'session-controls-heading'; heading.tabIndex = -1; heading.textContent = `${profileSeats[selected]} controls · ${profileNames[selected]}`;
    panel.append(heading);
    const profiles = document.createElement('div'); profiles.className = 'session-controls-profiles'; profiles.setAttribute('role', 'tablist');
    for (const profile of ['keyboard-a', 'keyboard-b'] as const) {
      const tab = document.createElement('button'); tab.type = 'button';
      const compact = matchMedia('(max-width: 319px), (max-height: 319px)').matches;
      tab.textContent = compact ? profileSeats[profile] : `${profileSeats[profile]} · ${profileNames[profile]}`;
      tab.setAttribute('aria-label', `${profileSeats[profile]} · ${profileNames[profile]}`); tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(profile === selected));
      tab.addEventListener('click', () => { selected = profile; capture = undefined; reset = undefined; options.capture(false); render(); queueMicrotask(() => panel.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')?.focus({ preventScroll: true })); }); profiles.append(tab);
    }
    panel.append(profiles);
    if (reset) {
      const confirm = document.createElement('section'); confirm.className = 'session-controls-confirm'; confirm.setAttribute('role', 'alertdialog'); confirm.setAttribute('aria-labelledby', 'session-controls-reset-copy');
      const copy = document.createElement('p'); copy.id = 'session-controls-reset-copy'; copy.textContent = `Reset ${profileSeats[reset]} to the shared-keyboard defaults?`;
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
