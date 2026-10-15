export interface SeedCopyElements {
  readonly panel: HTMLElement;
  readonly field: HTMLTextAreaElement;
  readonly button: HTMLButtonElement;
  readonly status: HTMLElement;
}

/** Clipboard access is optional; denied copies keep a visible text selection. */
export function createSeedCopyControls({ panel, field, button, status }: SeedCopyElements) {
  let code: string | null = null;
  let generation = 0;
  let disposed = false;

  function select() {
    field.focus({ preventScroll: true });
    field.select();
  }

  async function copy() {
    if (disposed || !code || button.disabled) return;
    const value = code;
    const attempt = ++generation;
    const previousFocus = document.activeElement;
    select();
    let copied = false;
    // Opaque frames commonly cannot use the async Clipboard API. This command
    // copies the visibly selected field during the original user gesture.
    try { copied = document.execCommand('copy'); } catch { /* Try the optional API below. */ }
    if (!copied) {
      button.disabled = true;
      status.textContent = 'Copying…';
      try {
        if (typeof navigator.clipboard?.writeText === 'function') {
          await navigator.clipboard.writeText(value);
          copied = true;
        }
      } catch { /* The host or browser can deny clipboard access. */ }
    }
    if (disposed || attempt !== generation || code !== value) return;
    button.disabled = false;
    status.textContent = copied ? 'Seed copied.' : document.hasFocus() && document.activeElement === field
      ? 'Selected. Use your device’s Copy.'
      : 'Select the seed. Use your device’s Copy.';
    // Preserve keyboard focus on success; failed copies retain a real selection
    // for the browser's Copy command. Never take focus back after another action.
    if (copied && document.hasFocus() && document.activeElement === field && previousFocus instanceof HTMLElement) {
      previousFocus.focus({ preventScroll: true });
    }
  }

  // A seed tap is a copy gesture. Prevent the textarea's pointer caret placement
  // from collapsing the all-text selection needed by a denied-copy fallback.
  const retainSelection = (event: PointerEvent) => { if (event.button === 0) event.preventDefault(); };
  const activate = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void copy(); }
  };
  button.addEventListener('click', copy);
  field.addEventListener('pointerdown', retainSelection);
  field.addEventListener('click', copy);
  field.addEventListener('keydown', activate);
  return {
    update(next: string | null) {
      if (disposed || next === code) return;
      code = next;
      generation++;
      panel.hidden = !next;
      field.value = next ?? '';
      button.disabled = false;
      status.textContent = '';
    },
    dispose() {
      disposed = true;
      generation++;
      button.removeEventListener('click', copy);
      field.removeEventListener('pointerdown', retainSelection);
      field.removeEventListener('click', copy);
      field.removeEventListener('keydown', activate);
    },
  };
}
