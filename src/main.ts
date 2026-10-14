import './styles.css';
import './game-ui.css';
import { storage, themeGet, themeOnChanged, keys, intent } from '@napplet/sdk';
import type { Theme } from '@napplet/sdk';
import { runtimeHasDomain, runtimeHasMethod } from './domain-availability.js';
import { parseGameOpenIntent } from './game-intents.js';
import type { GameLaunch } from './game-intents.js';
import { CHARACTERS, DEFAULT_CHARACTER, WORLDS, characterById } from './content.js';
import { Game, freshProgress, parseProgress } from './game.js';
import type { Direction, Progress } from './game.js';
import { soloModeDefinition } from './mode-rules.js';
import { installHealthMeter, readyPursuitCopy, updateChaseMeter, updateHealthMeter } from './solo-ui.js';
import { Renderer, modelThumbnail } from './render.js';
import { LocalSession } from './session.js';
import { GameAudio } from './audio.js';
import { Soundscape } from './soundscape.js';
import { createSoundSettings } from './sound-settings.js';
import { mobDefinition } from './mobs.js';
import type { Mob, MobKind } from './mobs.js';
import { createGamepadControls } from './gamepad.js';
import { ITEM_CATALOG } from './market/catalog.js';
import { createMarketUI } from './market-ui.js';
import { createSeedUI } from './seed-ui.js';
import { createCharacterPowerUI } from './character-power-ui.js';
import { DEATH_SPILL_REVEAL } from './death-spill.js';
import { DeathSpillAudio } from './death-spill-audio.js';
import { createPauseUI } from './pause-ui.js';
import { createRunMenuUI } from './run-menu.js';
import { createCollectionUI } from './collection-ui.js';
import { createRunHand } from './run-hand.js';
import './hand-layout.css';
import type { DevTools } from './devtools.js';
const el = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const renderer = new Renderer(el<HTMLCanvasElement>('scene'));
let progress: Progress = freshProgress();
let game = new Game(1, undefined, undefined, undefined, ITEM_CATALOG);
let localStage: ReturnType<typeof LocalSession.stage> | undefined;
let localSession: LocalSession | undefined;
let sessionPaused = false;
let preparedLaunch: GameLaunch | undefined;
let shortLosses = 0, previousState = '', chapter = 0, toastUntil = 0, toastMessage = '';
let restoreAfterDrawer = false, disposed = false, raf = 0;
let handPausedPlay = false;
let devTools: DevTools | undefined;
let sandboxRun = false;
let resultTraveler = DEFAULT_CHARACTER;
let saveQueue: Promise<void> = Promise.resolve();
let hydration: Promise<void> = Promise.resolve();
const changedPreferences = new Set<keyof Progress>();
const audio = new GameAudio();
const soundscape = new Soundscape(audio);
const spillAudio = new DeathSpillAudio(audio);
const sounds = createSoundSettings(audio, () => progress, (fields, save = true) => { fields.forEach(key => changedPreferences.add(key)); updateCallControl(); if (save) persist(); });
let lastCall = -Infinity, callShortcut = '', marketShortcut = '', controllerConnected = false, localFocus = true, restoreModalFocus = true;
const bindings: { close: () => void }[] = [];
let featherClips: SVGRectElement[] = [];
let displayedHealth = -1;
const mediaQuery = matchMedia('(prefers-reduced-motion: reduce)');
const seedUI = createSeedUI();
const hand = createRunHand({
  getRun: () => game.run,
  canSell: () => game.run.alive && !disposed && !document.hidden && localFocus,
  onOpenChange: open => {
    if (open && game.state === 'playing') { handPausedPlay = true; audio.stop(); game.pause(); }
    else if (!open) {
      const resume = handPausedPlay && !disposed && !document.hidden && localFocus && innerWidth >= 240 && innerHeight >= 240 && el('drawer').hidden && !game.run.isOpen && !game.run.pendingPack;
      handPausedPlay = false;
      if (resume) {
        game.resume();
        queueMicrotask(() => {
          if (!disposed && game.state === 'playing' && !hand.isOpen() && el('drawer').hidden && !game.run.isOpen) el('scene').focus({ preventScroll: true });
        });
      }
    }
    updateHud();
  },
  onSell: result => { if (result.ok) game.syncEffects(); updateHud(); },
});
const pauseUI = createPauseUI();
const runMenuUI = createRunMenuUI();
const collectionUI = createCollectionUI({
  read: () => progress,
  selectTraveler: id => {
    changedPreferences.add('selected'); progress.selected = id;
    if (game.state === 'ready') reset(preparedLaunch); else readyPreview();
    collectionUI.update(); updateHud(); persist();
  },
  selectWorld: id => {
    changedPreferences.add('world'); progress.world = id;
    if (game.state === 'ready') reset(); else notify('Your next run starts in this world.');
    collectionUI.update(); persist();
  },
});
const powerUI = createCharacterPowerUI();
const market = createMarketUI({
  getRun: () => game.run,
  getCharacter: () => characterById(progress.selected),
  canOpen: () => !localStage && !disposed && !(import.meta.env.DEV && devTools?.isOpen) && !document.hidden && localFocus && innerWidth >= 240 && innerHeight >= 240 && el('drawer').hidden && (game.state === 'playing' || (game.state === 'paused' && !!game.run.pendingPack)) && !!game.run.market,
  open: () => { if (!game.openMarket()) return false; handPausedPlay = false; hand.close(); audio.stop(); return true; },
  close: resume => {
    const allowed = resume && !disposed && !document.hidden && localFocus && innerWidth >= 240 && innerHeight >= 240;
    game.closeMarket(allowed); if (allowed) audio.unlock();
  },
  canRestoreFocus: () => restoreModalFocus && !disposed && !document.hidden && localFocus && innerWidth >= 240 && innerHeight >= 240,
  shortcut: () => controllerConnected ? 'LB' : marketShortcut || 'tap',
  getReducedMotion: () => progress.reduced || mediaQuery.matches,
  changed: updateHud,
});
const gamepad = createGamepadControls({
  enabled: () => !disposed && !(import.meta.env.DEV && devTools?.isOpen) && !document.hidden && innerWidth >= 240 && innerHeight >= 240,
  context: () => `${localStage ? 'setup' : localSession ? sessionPaused ? 'session-paused' : 'session' : 'solo'}:${game.state}:${hand.isOpen() ? 'hand' : game.run.isOpen ? 'market' : el('drawer').hidden ? `run:${el('app').dataset.runMenuPage ?? el('app').dataset.pausePage ?? ''}` : `collection:${el('drawer').dataset.collectionTab}:${el('drawer').dataset.collectionView}`}`,
  direction: move,
  confirm: confirmMenu,
  pause: () => hand.isOpen() ? hand.close() : game.run.isOpen ? market.close() : !el('drawer').hidden ? closeDrawer() : game.state === 'ready' ? play() : togglePause(),
  call: callCharacter,
  back: backMenu,
  menu: () => el('drawer').hidden ? openDrawer() : closeDrawer(),
  market: () => market.toggle(),
  onFocusLost: suspendPlay,
  onConnection: connected => {
    if (controllerConnected && !connected && (game.state === 'playing' || game.run.isOpen)) {
      suspendPlay(); notify('Controller disconnected. Reconnect or use the on-screen controls.');
    }
    controllerConnected = connected;
    el('gamepad-help').hidden = !connected;
    previousState = ''; updateCallControl(); updateHud();
  },
});
const unlocked = (c: typeof CHARACTERS[number]): boolean => progress.coins >= c.coins && progress.best >= c.distance;
function notify(message: string): void { toastMessage = message; toastUntil = performance.now() + 3200; }
function featherAmount(value: number): string {
  const rounded = Math.round(value * 100) / 100, whole = Math.floor(rounded), fraction = rounded - whole;
  const glyph = [[.25, '¼'], [.5, '½'], [.75, '¾']].find(([part]) => Math.abs(fraction - Number(part)) < .001)?.[1];
  return glyph ? `${whole || ''}${glyph}` : String(rounded);
}
function persist(): void {
  if (!runtimeHasDomain('storage')) return;
  saveQueue = saveQueue.then(async () => {
    await hydration;
    try { await storage.setItem('puddlehop.progress.v1', JSON.stringify(progress)); el('storage-status').textContent = 'Progress saved by your shell'; }
    catch { el('storage-status').textContent = 'Save unavailable — progress lasts this session'; notify('Progress could not be saved. You can keep playing.'); }
  });
}
function applyTheme(theme: Theme): void {
  for (const [name, color] of [['bg', theme.colors.background], ['fg', theme.colors.text], ['primary', theme.colors.primary]]) document.documentElement.style.setProperty(`--${name}`, color);
  renderer.backdrop = theme.colors.background; renderer.ink = theme.colors.text;
}
function readyPreview(): void {
  const c = characterById(progress.selected);
  if (!localSession && !localStage) game.setCharacter(c.id);
  el<HTMLImageElement>('traveler-image').src = modelThumbnail(c.model);
  el('traveler-name').textContent = c.name; el('traveler-note').textContent = c.note;
  el('mode').textContent = game.mode === 'arcade' ? 'Arcade ↔' : 'Stroll ↔';
  el('chase-instructions').textContent = readyPursuitCopy(game.rules.presentation, game.rules.pursuers);
  el<HTMLInputElement>('reduced-motion').checked = progress.reduced;
  updateCallControl();
}
function updateCallControl(): void {
  const c = characterById(progress.selected), button = el<HTMLButtonElement>('character-call');
  const verb = c.callLabel[0].toUpperCase() + c.callLabel.slice(1);
  button.textContent = `${verb}${controllerConnected ? ' · X' : callShortcut ? ` · ${callShortcut}` : ''}`;
  button.setAttribute('aria-label', `Make ${c.name} ${c.callLabel}${callShortcut ? ` (${callShortcut})` : ''}`);
  button.title = progress.muted ? `Unmute sounds to ${c.callLabel}` : button.getAttribute('aria-label')!;
}
function callCharacter(): void {
  if (import.meta.env.DEV && devTools?.isOpen) return;
  if (localStage || (localSession && sessionPaused) || disposed || !localFocus || document.hidden || game.run.isOpen || !el('drawer').hidden || progress.muted || innerWidth < 240 || innerHeight < 240 || (game.state !== 'ready' && game.state !== 'playing')) return;
  const now = performance.now(); if (now - lastCall < 450) return;
  audio.unlock(); audio.play(characterById(progress.selected).call); lastCall = now;
}
function runGoal(): string {
  switch (progress.runs % 3) { case 0: return 'Little goal: reach 25 hops this run.'; case 1: return 'Little goal: find 3 coins this run.'; default: return 'Little goal: reach the next world at 32 hops.'; }
}
function reset(launch?: GameLaunch): void {
  localSession?.stop(); localSession = undefined; localStage?.cancel(); localStage = undefined; sessionPaused = false;
  el<HTMLDivElement>('local-session-setup').hidden = true;
  preparedLaunch = launch;
  if (import.meta.env.DEV) sandboxRun = false;
  handPausedPlay = false; hand.close();
  audio.stop(); soundscape.reset(); spillAudio.reset();
  const home = progress.world === 'home' ? characterById(progress.selected).home : progress.world;
  const mode = launch?.seed?.mode ?? launch?.mode ?? progress.mode;
  const definition = soloModeDefinition(mode);
  game = new Game(launch?.seed ?? Math.floor(Math.random() * 4294967296), home, mode, shortLosses >= 3, ITEM_CATALOG, progress.selected, { definition });
  rebuildPluckHud();
  renderer.camera = 0; chapter = 0; previousState = '';
  const introduced = new Set<MobKind>();
  const mobSound = (cue: 'mob.spawn' | 'mob.attack', mob: Mob): void => {
    const dx = mob.x - game.groundX, dy = mob.y - game.groundY;
    audio.play(cue, { gain: .75 / (1 + Math.hypot(dx, dy) * .25), pan: Math.max(-.9, Math.min(.9, (dx + dy * .3) / 6)) });
  };
  game.onMobSpawn = mob => {
    mobSound('mob.spawn', mob);
    if (!introduced.has(mob.kind)) {
      introduced.add(mob.kind);
      const definition = mobDefinition(mob.kind);
      notify(`${definition.name} spotted! ${definition.hint}`);
    }
  };
  game.onMobAttack = mob => mobSound('mob.attack', mob);
  game.onHurt = ({ face, amount }) => {
    audio.play(face === 'rear' ? 'hurt.rear' : 'hurt.side');
    notify(`${face === 'rear' ? 'Rear bump' : 'Side hit'}: −${featherAmount(amount)} feather${amount === 1 ? '' : 's'}. Keep hopping!`);
  };
  game.onHeal = amount => { audio.play('health.restore'); notify(`A little pluck returns. +${featherAmount(amount)} feather${amount === 1 ? '' : 's'}.`); };
  game.onPower = ({ power, cause }) => {
    audio.play(characterById(game.characterId).call, { gain: .8 });
    audio.play(cause === 'water' ? 'hop' : 'health.restore', { gain: .65 });
    notify(`${power.name}! Safe again. Recharges in ${power.cooldown} new blocks.`);
  };
  game.onCoin = amount => {
    audio.play('coin');
    if (import.meta.env.DEV && sandboxRun) return;
    const before = CHARACTERS.filter(unlocked).length; progress.coins += amount;
    if (CHARACTERS.filter(unlocked).length > before) notify('A new traveler joined your collection!');
    persist();
  };
  game.onEnd = () => {
    resultTraveler = game.characterId;
    audio.stop(); audio.play(`death.${game.deathCause ?? 'traffic'}`);
    if (import.meta.env.DEV && sandboxRun) {
      el('result-kicker').textContent = 'DEVELOPMENT RUN';
      el('result-score').textContent = String(game.maxY); el('reason').textContent = game.reason;
      el('run-reward').textContent = 'Sandbox finished. Lifetime records unchanged.';
      return;
    }
    const before = CHARACTERS.filter(unlocked).length;
    const oldBest = game.mode === 'arcade' ? progress.best : progress.strollBest;
    if (game.mode === 'arcade') progress.best = Math.max(progress.best, game.maxY); else progress.strollBest = Math.max(progress.strollBest, game.maxY);
    shortLosses = game.maxY < 12 ? shortLosses + 1 : 0;
    const goalSuccess = progress.runs % 3 === 0 ? game.maxY >= 25 : progress.runs % 3 === 1 ? game.coins >= 3 : game.maxY >= 32;
    el('result-kicker').textContent = game.maxY > oldBest ? 'A NEW PERSONAL BEST' : 'A LITTLE FURTHER NEXT TIME';
    el('result-score').textContent = String(game.maxY); el('reason').textContent = game.reason;
    el('run-reward').textContent = `${game.coins} coin${game.coins === 1 ? '' : 's'} found${goalSuccess ? ' · Little goal complete' : ''}. Run wallet and items lost.`;
    progress.runs++; persist();
    if (CHARACTERS.filter(unlocked).length > before) notify('New traveler unlocked. Meet them in the collection!');
  };
  el('goal').textContent = runGoal(); readyPreview(); updateHud();
}
function presentingDeathSpill(): boolean {
  return game.state === 'dead' && !!game.deathSpill?.drops.length && !progress.reduced && !mediaQuery.matches && game.deathSpill.age < DEATH_SPILL_REVEAL;
}
function receiveGameIntent(delivery: unknown): void {
  if (disposed) return;
  const request = parseGameOpenIntent(delivery);
  if (!request) return;
  if (request.kind === 'invalid') { notify('This game link has an invalid seed or mode. Your run is unchanged.'); return; }
  const { launch } = request;
  // Opening an existing instance is navigation, not a request to restart it.
  if (!launch.seed && !launch.mode) return;
  if (localSession || localStage || (game.state !== 'ready' && game.state !== 'dead') || presentingDeathSpill() || (import.meta.env.DEV && devTools?.isOpen)) {
    notify('Finish this run, then open the game link again.'); return;
  }
  restoreAfterDrawer = false;
  el('drawer').hidden = true; collectionUI.update();
  reset(launch);
  notify(launch.seed ? 'Shared course ready. Let’s hop when you’re ready.' : `${game.mode === 'arcade' ? 'Arcade' : 'Stroll'} ready. Let’s hop when you’re ready.`);
}
function frameAvailable(): boolean {
  return !disposed && !document.hidden && localFocus && innerWidth >= 240 && innerHeight >= 240 && !(import.meta.env.DEV && devTools?.isOpen);
}
function displayedRunState(): typeof game.state {
  if (localStage) return 'paused';
  if (!localSession?.running) return game.state;
  if (sessionPaused || game.state === 'paused') return 'paused';
  return localSession.players.some(player => player.state === 'playing') ? 'playing' : 'dead';
}
function updateHud(): void {
  const seats = el('session-seats');
  seats.hidden = !localSession?.running;
  if (localSession?.running) {
    seats.replaceChildren(...localSession.views().map(player => {
      const label = document.createElement('span'); label.dataset.seat = player.seat;
      label.textContent = `${player.marker} ${characterById(player.characterId).name} · ${player.y}`;
      return label;
    }));
  }
  el('score').textContent = String(game.maxY); el('coins').textContent = String(game.run.wallet);
  el('best').textContent = `${game.mode === 'stroll' ? 'STROLL BEST' : 'BEST'} ${game.mode === 'stroll' ? progress.strollBest : progress.best}`;
  const currentChapter = Math.floor(game.maxY / 32);
  if (currentChapter !== chapter) { chapter = currentChapter; if (!game.powerFlash) notify(`A new place to explore: ${game.lane.world.name}`); }
  el('world-label').textContent = game.lane.world.name;
  el('chapter-label').textContent = `CHAPTER ${currentChapter + 1}`;
  updatePluckHud();
  powerUI.update(game, progress.reduced || mediaQuery.matches);
  updateRunPowers();
  updateChaseHud();
  const state = displayedRunState();
  hand.update({ visible: !localStage && game.run.alive && (state === 'playing' || state === 'paused') && (game.run.cards.length > 0 || game.run.isOpen) && !(import.meta.env.DEV && devTools?.isOpen), reduced: progress.reduced || mediaQuery.matches });
  seedUI.update(state === 'dead' && !presentingDeathSpill() ? game.seedCode : null);
  el<HTMLButtonElement>('character-call').disabled = progress.muted || (state !== 'ready' && state !== 'playing');
  const viewState = `${state}:${Boolean(game.run.pendingPack)}:${Boolean(localStage)}:${Boolean(localSession)}`;
  if (viewState !== previousState) {
    if (state === 'paused') audio.stop();
    previousState = viewState;
    el('app').dataset.runState = state;
    el('run-panel').hidden = state === 'playing';
    el('ready-content').hidden = state !== 'ready'; el('result-content').hidden = state !== 'dead'; el('pause-content').hidden = state !== 'paused' || !!localStage;
    el('play').innerHTML = `${state === 'dead' ? 'Hop again' : state === 'paused' ? game.run.pendingPack ? 'Choose cards' : 'Keep hopping' : 'Let’s hop'} <span aria-hidden="true">↗</span>`;
    el('play').hidden = !!localStage; el('choose').hidden = !!localStage;
    el('local-play').hidden = !!localStage || !!localSession || state === 'dead';
    el('mode').hidden = state === 'paused' || !!localSession; el('goal').hidden = state !== 'ready';
    el<HTMLButtonElement>('collection').disabled = !!localStage;
    const pause = el<HTMLButtonElement>('pause'); pause.textContent = state === 'paused' ? '▷' : 'Ⅱ'; pause.setAttribute('aria-label', state === 'paused' ? 'Resume game' : 'Pause game'); pause.title = state === 'paused' ? 'Resume game' : 'Pause game'; pause.disabled = state === 'dead' || state === 'ready';
    el('hint').textContent = state === 'playing' ? controllerConnected ? 'Stick / D-pad · A hop · X call · Start pause' : 'Tap ↑ · Swipe to dodge' : state === 'paused' ? 'Paused · take your time' : state === 'dead' ? 'Every run is a new path' : 'Tap anywhere to begin';
  }
  el('run-panel').hidden = state === 'playing' || presentingDeathSpill() || game.run.isOpen || !el('drawer').hidden || (hand.isOpen() && handPausedPlay);
  el('app').dataset.modalOpen = String((!el('run-panel').hidden || !el('drawer').hidden || hand.isOpen()) && !(import.meta.env.DEV && devTools?.isOpen));
  el('app').classList.toggle('ui-less-motion', progress.reduced || mediaQuery.matches);
  pauseUI.update(!localStage && state === 'paused' && !el('run-panel').hidden && !(import.meta.env.DEV && devTools?.isOpen), progress.reduced || mediaQuery.matches);
  runMenuUI.update({
    state: state === 'dead' ? 'dead' : 'ready', distance: game.maxY, earnedCoins: game.coins,
    activeSeconds: game.time / game.rules.simulation.worldTimeScale,
    best: game.mode === 'stroll' ? progress.strollBest : progress.best,
    mode: game.mode === 'stroll' ? 'Stroll' : 'Arcade', world: game.lane.world.name,
    chapter: currentChapter + 1, traveler: characterById(state === 'dead' ? resultTraveler : game.characterId).name,
  }, (state === 'ready' || state === 'dead') && !el('run-panel').hidden && !(import.meta.env.DEV && devTools?.isOpen), progress.reduced || mediaQuery.matches);
  market.update();
}
let displayedPowers = '';
function updateRunPowers(): void {
  const powers = game.run.powers, signature = powers.map(power => `${power.id}:${Math.ceil(power.remaining)}`).join(',');
  if (signature === displayedPowers) return;
  displayedPowers = signature;
  const target = el('active-run-powers'); target.replaceChildren(); target.hidden = !powers.length;
  for (const power of powers) {
    const item = game.run.catalog.get(power.itemId); if (!item) continue;
    const label = document.createElement('span'); label.dataset.power = power.id;
    label.textContent = `${item.icon} ${item.name} · ${Math.ceil(power.remaining)}s`;
    label.title = `${item.description} ${Math.ceil(power.remaining)} active seconds left.`;
    target.append(label);
  }
}
function updatePluckHud(): void {
  const meter = el('pluck');
  meter.classList.toggle('recovering', game.hurtRemaining > 0);
  if (displayedHealth === game.health) return;
  displayedHealth = game.health;
  updateHealthMeter(meter, el('pluck-value'), featherClips, game.health, game.maxHealth, featherAmount);
}
function rebuildPluckHud(): void {
  featherClips = installHealthMeter(el('pluck'), el('pluck-feathers'), game.rules.health);
  displayedHealth = -1;
}
function updateChaseHud(): void {
  const meter = el('chase-meter');
  updateChaseMeter(meter, el('chase-fill'), game.waveSeconds, game.rules.pursuit.warningSeconds);
  const visible = game.rules.presentation.pursuitVisible && game.warning && game.state === 'playing', warning = el('idle');
  warning.hidden = !visible;
  const forward = document.querySelector<HTMLButtonElement>('[data-direction="forward"]')!;
  forward.classList.toggle('escape', visible);
  if (!visible) { forward.removeAttribute('aria-describedby'); return; }
  forward.setAttribute('aria-describedby', 'chase-action');
  const seconds = Math.ceil(game.waveSeconds), urgent = seconds <= 2;
  warning.classList.toggle('urgent', urgent);
  const message = urgent ? 'Wave at your heels' : 'Wave closing in';
  if (el('chase-message').textContent !== message) el('chase-message').textContent = message;
  el('chase-time').textContent = `${seconds}s`;
  meter.setAttribute('aria-valuenow', String(seconds));
  el('chase-meter').setAttribute('aria-valuetext', `${seconds} seconds until the wave catches you if you stay here`);
}
function play(): void {
  if (import.meta.env.DEV && devTools?.isOpen) return;
  if (localStage || !el('drawer').hidden || game.run.isOpen || !frameAvailable()) return;
  if (presentingDeathSpill()) return;
  if (game.run.pendingPack) { market.toggle(); return; }
  audio.unlock();
  if (localSession?.running && localSession.players.some(player => player.state === 'playing' || player.state === 'paused')) {
    sessionPaused = false; game.resume(); accumulator = 0; updateHud(); return;
  }
  if (game.state === 'dead') reset();
  if (game.state === 'paused') game.resume(); else game.start();
  updateHud();
}
/** Setup freezes the existing loop without advancing or rebuilding its owners. */
function openLocalPlay(): void {
  if (!frameAvailable() || localStage || localSession || game.state === 'dead' || !el('drawer').hidden || hand.isOpen() || game.run.isOpen || game.run.pendingPack) return;
  try { localStage = LocalSession.stage(game); }
  catch { notify('Local Play needs a safe second starting spot on this course.'); return; }
  accumulator = 0; pointer = null; audio.stop();
  const setup = el<HTMLDivElement>('local-session-setup');
  setup.hidden = false; setup.setAttribute('role', 'dialog'); setup.setAttribute('aria-modal', 'true'); setup.setAttribute('aria-label', 'Local Play');
  updateHud(); el('local-session-start').focus({ preventScroll: true });
}
/** Back to solo restores the same run, including its previous paused/playing state. */
function backToSolo(): void {
  if (!localStage) return;
  game = localStage.cancel(); localStage = undefined;
  accumulator = 0;
  el<HTMLDivElement>('local-session-setup').hidden = true;
  updateHud();
  el(game.state === 'playing' ? 'scene' : 'local-play').focus({ preventScroll: true });
}
function startLocalPlay(): void {
  if (!localStage || !frameAvailable()) return;
  localSession = localStage.commit(); localStage = undefined;
  game.resume(); sessionPaused = false; accumulator = 0;
  el<HTMLDivElement>('local-session-setup').hidden = true;
  audio.unlock(); updateHud(); el('scene').focus({ preventScroll: true });
}
function moveLocal(seat: 'p1' | 'p2', direction: Direction): void {
  if (!frameAvailable()) return;
  if (!localSession?.running || localStage || hand.isOpen() || hand.containsFocus() || game.run.isOpen || !el('drawer').hidden || displayedRunState() !== 'playing') { move(direction); return; }
  audio.unlock(); if (localSession.dispatch({ seat, direction })) audio.play('hop'); updateHud();
}
function localSetupKeydown(event: KeyboardEvent): void {
  if (!localStage || disposed || event.key !== 'Tab') return;
  const buttons = [el('local-session-start'), el('local-session-back')];
  const current = buttons.indexOf(document.activeElement as HTMLElement);
  event.preventDefault();
  buttons[(current + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]!.focus({ preventScroll: true });
}
document.addEventListener('keydown', localSetupKeydown, true);
function move(direction: Direction): void {
  if (!frameAvailable()) return;
  if (localStage) {
    const buttons = [el('local-session-start'), el('local-session-back')];
    const current = buttons.indexOf(document.activeElement as HTMLElement);
    buttons[(current + 1) % buttons.length]!.focus({ preventScroll: true }); return;
  }
  if (hand.isOpen() || (game.state === 'playing' && hand.containsFocus())) { hand.navigate(direction); return; }
  if (game.run.isOpen) { market.navigate(direction); return; }
  if (!el('drawer').hidden) { collectionUI.navigate(direction); return; }
  if (innerWidth < 240 || innerHeight < 240) return;
  const state = displayedRunState();
  if (state === 'dead' || state === 'ready') { runMenuUI.navigate(direction); return; }
  if (state === 'paused') { pauseUI.navigate(direction); return; }
  audio.unlock(); if (localSession?.running ? localSession.dispatch({ seat: 'p1', direction }) : game.move(direction)) audio.play('hop'); updateHud();
}
function confirmMenu(): void {
  if (!frameAvailable()) return;
  if (localStage) {
    if (document.activeElement === el('local-session-back')) backToSolo(); else startLocalPlay();
    return;
  }
  if (hand.isOpen() || hand.containsFocus()) { hand.confirm(); return; }
  if (game.run.isOpen) market.confirm();
  else if (!el('drawer').hidden) collectionUI.confirm();
  else if (displayedRunState() === 'paused') pauseUI.confirm();
  else if (displayedRunState() === 'playing') move('forward'); else runMenuUI.confirm();
}
function togglePause(): void {
  if (!frameAvailable() || localStage) return;
  if (hand.close()) return;
  if (game.run.isOpen) { market.close(); return; }
  if (!el('drawer').hidden) return;
  if (displayedRunState() === 'paused') play();
  else if (localSession?.running) { sessionPaused = true; accumulator = 0; audio.stop(); }
  else game.pause();
  updateHud();
}
function suspendPlay(): void { if (localSession) sessionPaused = true; pointer = null; audio.stop(); handPausedPlay = false; hand.close(); game.closeMarket(false); game.pause(); restoreAfterDrawer = false; restoreModalFocus = false; updateHud(); restoreModalFocus = true; }
function openDrawer(): void {
  if (localStage || !frameAvailable()) return;
  const wasPlaying = handPausedPlay || game.state === 'playing'; handPausedPlay = false; hand.close();
  if (game.run.isOpen) market.close(false);
  audio.stop(); restoreAfterDrawer = wasPlaying; game.pause();
  collectionUI.open(); updateHud();
}
function closeDrawer(): void {
  audio.stop(); el('drawer').hidden = true; collectionUI.update();
  if (restoreAfterDrawer && !document.hidden && localFocus && innerWidth >= 240 && innerHeight >= 240) { audio.unlock(); game.resume(); }
  restoreAfterDrawer = false; updateHud();
  el(game.state === 'playing' ? 'collection' : 'play').focus({ preventScroll: true });
}
function backMenu(): void {
  if (localStage) { backToSolo(); return; }
  if (hand.close()) return;
  if (game.run.isOpen) market.close();
  else if (!el('drawer').hidden) { if (!collectionUI.back()) closeDrawer(); }
  else if (displayedRunState() === 'paused') { if (!pauseUI.back()) play(); }
  else if (displayedRunState() === 'ready' || displayedRunState() === 'dead') runMenuUI.back();
  else togglePause();
}
el('play').addEventListener('click', play); el('pause').addEventListener('click', togglePause); el('collection').addEventListener('click', openDrawer); el('choose').addEventListener('click', openDrawer); el('close-drawer').addEventListener('click', closeDrawer);
el('local-play').addEventListener('click', openLocalPlay); el('local-session-back').addEventListener('click', backToSolo); el('local-session-start').addEventListener('click', startLocalPlay);
el('character-call').addEventListener('click', callCharacter);
el('character-call').addEventListener('pointerdown', () => audio.unlock());
el('mode').addEventListener('click', () => { changedPreferences.add('mode'); progress.mode = game.mode === 'arcade' ? 'stroll' : 'arcade'; reset(); persist(); });
el<HTMLInputElement>('reduced-motion').addEventListener('change', event => { changedPreferences.add('reduced'); progress.reduced = (event.target as HTMLInputElement).checked; persist(); });
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-direction]')) button.addEventListener('click', () => move(button.dataset.direction as Direction));
let pointer: { x: number; y: number; id: number } | null = null;
renderer.canvas.addEventListener('pointerdown', event => { if (!event.isPrimary) return; audio.unlock(); pointer = { x: event.clientX, y: event.clientY, id: event.pointerId }; renderer.canvas.setPointerCapture(event.pointerId); });
renderer.canvas.addEventListener('pointerup', event => { if (!pointer || pointer.id !== event.pointerId) return; const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y; pointer = null; if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) move('forward'); else move(Math.abs(dx) > Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'forward' : 'back'); });
renderer.canvas.addEventListener('pointercancel', () => { pointer = null; });
const observer = new ResizeObserver(() => { renderer.resize(); if (innerWidth < 240 || innerHeight < 240) suspendPlay(); }); observer.observe(el('app'));
document.addEventListener('visibilitychange', () => { if (document.hidden) suspendPlay(); });
window.addEventListener('blur', () => { localFocus = false; suspendPlay(); });
window.addEventListener('focus', () => { localFocus = true; });
let last = performance.now(), accumulator = 0;
function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, .05); last = now;
  gamepad.update(now);
  const sessionUnblocked = frameAvailable() && !localStage && displayedRunState() !== 'paused' && !hand.isOpen() && el('drawer').hidden && !game.run.isOpen && !game.run.pendingPack;
  const sessionAdvancing = sessionUnblocked && displayedRunState() === 'playing';
  if (localSession?.running) {
    if (sessionAdvancing) {
      const fixedStep = localSession.definition.rules.simulation.fixedStep;
      accumulator += dt;
      while (accumulator >= fixedStep) { localSession.update(fixedStep); accumulator -= fixedStep; }
    } else accumulator = 0;
  } else if (!localStage && game.state === 'playing') {
    const fixedStep = game.rules.simulation.fixedStep;
    accumulator += dt;
    while (accumulator >= fixedStep) { game.update(fixedStep); accumulator -= fixedStep; }
  } else accumulator = 0;
  if (!document.hidden && localFocus && innerWidth >= 240 && innerHeight >= 240) {
    if (localSession?.running) { if (sessionUnblocked) localSession.advanceDeathVisuals(dt); }
    else game.advanceDeathVisuals(dt);
  }
  spillAudio.update(game.state === 'dead' ? game.deathSpill : null,
    !progress.muted && !document.hidden && localFocus && !game.run.isOpen && el('drawer').hidden && innerWidth >= 240 && innerHeight >= 240,
    progress.reduced || mediaQuery.matches);
  soundscape.update(game, !progress.muted && !document.hidden && !game.run.isOpen && el('drawer').hidden && innerWidth >= 240 && innerHeight >= 240);
  renderer.reduced = progress.reduced || mediaQuery.matches;
  if (localSession?.running) renderer.drawSession(localSession.world, localSession.views(), sessionAdvancing ? dt : 0); else renderer.draw(game, progress.selected, localStage ? 0 : dt);
  updateHud(); el('toast').textContent = now < toastUntil && !(game.state === 'playing' && game.warning) ? toastMessage : '';
  if (import.meta.env.DEV) devTools?.update();
  raf = requestAnimationFrame(frame);
}
async function boot(): Promise<void> {
  sounds.sync(); renderer.resize(); reset(); raf = requestAnimationFrame(frame);
  if (import.meta.env.DEV) {
    const { mountDevTools } = await import('./devtools.js');
    if (disposed) return;
    devTools = mountDevTools({
      getGame: () => game,
      getCatalog: () => ITEM_CATALOG,
      replaceGame: next => {
        audio.stop(); soundscape.reset(); spillAudio.reset(); game = next;
        rebuildPluckHud();
        renderer.camera = next.maxY; chapter = Math.floor(next.maxY / 32); previousState = ''; accumulator = 0;
      },
      suspend: () => { suspendPlay(); el('drawer').hidden = true; updateHud(); },
      markSandbox: () => { sandboxRun = true; }, isSandbox: () => sandboxRun,
      resume: play, changed: updateHud,
    });
  }
  if (runtimeHasDomain('storage')) {
    // Avoid a brief audible hop before a saved mute preference has arrived.
    audio.setMuted(true);
    // Keep play immediately available; merge any coins/runs earned during the asynchronous read.
    hydration = (async () => { try {
      const raw = await storage.getItem('puddlehop.progress.v1'); const loaded = parseProgress(raw);
      loaded.coins += progress.coins; loaded.runs += progress.runs; loaded.best = Math.max(loaded.best, progress.best); loaded.strollBest = Math.max(loaded.strollBest, progress.strollBest);
      if (disposed) return;
      for (const key of changedPreferences) Object.assign(loaded, { [key]: progress[key] });
      progress = loaded;
      sounds.sync();
      if (!CHARACTERS.some(c => c.id === progress.selected && unlocked(c))) progress.selected = DEFAULT_CHARACTER;
      if (!['home', 'shuffle', ...WORLDS.map(w => w.id)].includes(progress.world)) progress.world = 'home';
      if (!localStage && !localSession && game.state === 'ready' && !(import.meta.env.DEV && sandboxRun)) reset(); else readyPreview();
      collectionUI.update();
      el('storage-status').textContent = 'Progress saved by your shell';
      // Save the traveler migration through the queue after hydration. This
      // also preserves any preference the player changed while the read ran.
      if (raw !== null) persist();
    } catch { if (!disposed) sounds.sync(); el('storage-status').textContent = 'Save unavailable — progress lasts this session'; notify('Saved progress is unavailable. This session still works.'); } })();
    await hydration;
  }
  if (disposed) return;
  // The runtime retains initial deliveries until registration. Subscribe after
  // saved preferences settle, so hydration cannot overwrite a shared course.
  if (runtimeHasMethod('intent', 'onDelivery')) {
    try {
      const subscription = intent.onDelivery(receiveGameIntent);
      if (disposed) subscription.close(); else bindings.push(subscription);
    } catch { notify('Game links are unavailable. You can keep playing.'); }
  }
  if (runtimeHasDomain('theme')) {
    try { applyTheme(await themeGet()); const off = themeOnChanged(applyTheme); if (disposed) off.close(); else bindings.push(off); } catch { notify('Using the local color palette.'); }
  }
  if (runtimeHasDomain('keys')) {
    const actions: [string, string, () => void][] = [['forward', 'ArrowUp', () => moveLocal('p2', 'forward')], ['back', 'ArrowDown', () => moveLocal('p2', 'back')], ['left', 'ArrowLeft', () => moveLocal('p2', 'left')], ['right', 'ArrowRight', () => moveLocal('p2', 'right')], ['forward-w', 'w', () => moveLocal('p1', 'forward')], ['back-s', 's', () => moveLocal('p1', 'back')], ['left-a', 'a', () => moveLocal('p1', 'left')], ['right-d', 'd', () => moveLocal('p1', 'right')], ['play', 'Enter', confirmMenu], ['pause', 'p', () => !el('drawer').hidden ? closeDrawer() : togglePause()], ['call', 'q', callCharacter], ['market', 'm', () => market.toggle()], ['back-menu', 'Escape', backMenu]];
    for (const [id, defaultKey, handler] of actions) {
      if (disposed) return;
      try {
        const binding = await keys.register({ id: `puddlehop.${id}`, label: id === 'call' ? 'Make your traveler call' : `Down to Duck ${id}`, defaultKey }, () => {
          if (import.meta.env.DEV && devTools?.isOpen) return;
          // A selected seed belongs to the browser's copy/selection controls.
          // Shell shortcuts must not turn Enter or arrow keys into a retry.
          if (id !== 'back-menu' && game.state === 'dead' && el('run-seed').contains(document.activeElement)) {
            if (id === 'play' && (document.activeElement === el('copy-seed') || document.activeElement === el('run-seed-code'))) (document.activeElement as HTMLElement).click();
            return;
          }
          // Typing and native selection belong to the active menu field.
          const focused = document.activeElement;
          if (!el('drawer').hidden && id !== 'back-menu' &&
              ((focused instanceof HTMLInputElement && focused.type === 'text') || focused instanceof HTMLSelectElement)) return;
          handler();
        });
        if (disposed) binding.close();
        else { bindings.push(binding); if (id === 'call') { callShortcut = (binding.binding || defaultKey).toUpperCase(); updateCallControl(); } if (id === 'market') { marketShortcut = (binding.binding || defaultKey).toUpperCase(); market.update(); } }
      } catch { notify('Keyboard shortcuts unavailable. Use the on-screen controls.'); break; }
    }
  }
}
window.addEventListener('pagehide', () => { if (disposed) return; disposed = true; localSession?.stop(); localStage?.cancel(); localStage = undefined; document.removeEventListener('keydown', localSetupKeydown, true); if (import.meta.env.DEV) devTools?.dispose(); game.closeMarket(false); gamepad.close(); market.dispose(); pauseUI.dispose(); runMenuUI.dispose(); collectionUI.dispose(); hand.dispose(); seedUI.dispose(); sounds.dispose(); cancelAnimationFrame(raf); observer.disconnect(); bindings.forEach(b => b.close()); });
void boot();
