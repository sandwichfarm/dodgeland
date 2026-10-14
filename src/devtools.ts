import './devtools.css';
import type { Game } from './game.js';
import type { ItemDefinition } from './market/types.js';
import { DEVELOPMENT_SCORE_LIMIT, developmentDiagnostics, jumpDevelopmentRun, loadDevelopmentRun } from './devtools-state.js';

export interface DevToolsOptions {
  getGame(): Game;
  /** Full catalog: the loaded seed may choose a different mode. */
  getCatalog(): readonly ItemDefinition[];
  replaceGame(next: Game): void;
  /** Close other modal surfaces and pause before accepting inspector input. */
  suspend(): void;
  /** Mark this run as ineligible for lifetime records before mutating it. */
  markSandbox(): void;
  isSandbox(): boolean;
  resume(): void;
  changed(): void;
}
export interface DevTools { readonly isOpen: boolean; update(): void; dispose(): void }

/** Development-only controls. Never import this module outside the DEV gate. */
export function mountDevTools(options: DevToolsOptions): DevTools {
  const host = document.createElement('aside'); host.id = 'development-tools';
  host.innerHTML = `<button id="development-toggle" type="button" aria-expanded="false" aria-controls="development-panel">Dev</button>
    <section id="development-panel" hidden aria-label="Development controls">
      <div class="development-bar"><strong>Run inspector</strong><button id="development-close" type="button" aria-label="Close development controls">×</button></div>
      <p>Jump or load starts a fresh sandbox run. Records stay unchanged.</p>
      <form id="development-seed-form"><label for="development-seed">Load copied seed</label><div class="development-row"><input id="development-seed" type="text" maxlength="64" placeholder="ph3-…" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="button">Load seed</button></div></form>
      <form id="development-jump-form"><label for="development-score">Jump to score</label><div class="development-row"><input id="development-score" type="number" min="0" max="${DEVELOPMENT_SCORE_LIMIT}" step="1" value="99" inputmode="numeric"><button type="button">Jump</button></div></form>
      <div class="development-presets" aria-label="Score presets">${[50, 99, 100, 150, 159, 160, 250, 319, 320, 479, 480].map(score => `<button type="button" data-development-score="${score}">${score}</button>`).join('')}</div>
      <div class="development-actions"><button id="development-coins" type="button">+25 run coins</button><button id="development-heal" type="button">Heal</button><button id="development-clear-mobs" type="button">Clear mobs</button><button id="development-resume" type="button">Resume run</button></div>
      <output id="development-status" aria-live="polite"></output>
      <pre id="development-state" data-napplet-select="text"></pre>
    </section>`;
  document.body.append(host);
  const get = <T extends HTMLElement>(id: string) => host.querySelector<T>(`#${id}`)!;
  const panel = get<HTMLElement>('development-panel'), toggle = get<HTMLButtonElement>('development-toggle');
  const input = get<HTMLInputElement>('development-score'), status = get<HTMLOutputElement>('development-status');
  let disposed = false, lastText = '';
  const app = document.getElementById('app');
  let previousInert = false;
  const close = (focus = true) => {
    if (!panel.hidden && app) app.inert = previousInert;
    panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); if (focus) toggle.focus();
  };
  const update = () => {
    if (disposed || panel.hidden) return;
    const game = options.getGame(), text = developmentDiagnostics(game, options.isSandbox());
    if (text !== lastText) { get('development-state').textContent = text; lastText = text; }
    for (const id of ['development-coins', 'development-heal', 'development-clear-mobs', 'development-resume']) get<HTMLButtonElement>(id).disabled = game.state === 'dead';
  };
  const open = () => {
    options.suspend();
    if (app) { previousInert = app.inert; app.inert = true; }
    panel.hidden = false; toggle.setAttribute('aria-expanded', 'true'); update(); input.focus(); input.select();
  };
  const mutate = (action: () => void, message: string) => { options.markSandbox(); action(); status.textContent = message; options.changed(); update(); };
  const jump = (score: number) => mutate(() => {
    const next = jumpDevelopmentRun(options.getGame(), score); options.replaceGame(next); input.value = String(next.maxY);
  }, 'Jumped. Run paused; resume when ready.');
  toggle.addEventListener('click', () => panel.hidden ? open() : close());
  get('development-close').addEventListener('click', () => close());
  // An allow-scripts iframe blocks native form submission before a submit
  // event is dispatched. Run local actions directly; Enter prevents the
  // browser's implicit submission, so one gesture invokes an action once.
  const bindFormAction = (id: string, action: () => void) => {
    const form = get<HTMLFormElement>(id);
    form.querySelector('button')!.addEventListener('click', action);
    form.querySelector('input')!.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault(); if (!event.repeat) action();
    });
    form.addEventListener('submit', event => { event.preventDefault(); });
  };
  bindFormAction('development-jump-form', () => jump(input.valueAsNumber));
  bindFormAction('development-seed-form', () => {
    try {
      // Parsing precedes every mutation, including the lifetime-record guard.
      const next = loadDevelopmentRun(options.getGame(), get<HTMLInputElement>('development-seed').value, options.getCatalog());
      mutate(() => { options.replaceGame(next); input.value = '0'; }, 'Seed loaded. Run paused; resume when ready.');
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Could not load that seed.';
    }
  });
  host.querySelectorAll<HTMLButtonElement>('[data-development-score]').forEach(button => button.addEventListener('click', () => jump(Number(button.dataset.developmentScore))));
  get('development-coins').addEventListener('click', () => mutate(() => { options.getGame().run.creditCoins(25); }, 'Added 25 sandbox coins.'));
  get('development-heal').addEventListener('click', () => mutate(() => { const game = options.getGame(); game.health = game.maxHealth; game.hurtRemaining = 0; }, 'Health restored.'));
  get('development-clear-mobs').addEventListener('click', () => mutate(() => { options.getGame().mobs.splice(0); }, 'Current pursuers cleared.'));
  get('development-resume').addEventListener('click', () => { close(false); options.resume(); options.changed(); document.getElementById('pause')?.focus(); });
  // Native typing stays local; injected SDK/gamepad callbacks are gated by the
  // host while isOpen, since they need not travel through DOM key events.
  host.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); close(); } event.stopPropagation(); });
  const visibility = () => { if (document.hidden) close(false); };
  const blur = () => close(false);
  const resize = () => { if (innerWidth < 240 || innerHeight < 240) close(false); };
  document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', blur); window.addEventListener('resize', resize);
  return { get isOpen() { return !disposed && !panel.hidden; }, update,
    dispose() { close(false); disposed = true; document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', blur); window.removeEventListener('resize', resize); host.remove(); },
  };
}
