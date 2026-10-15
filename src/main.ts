import './styles.css';
import './game-ui.css';
import './session-ui.css';
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
import type { DeviceId, SeatId, SessionSeatSpec } from './session.js';
import { createKeyboardInput, DEFAULT_KEYBOARD_BINDINGS } from './keyboard-input.js';
import { createKeyboardBindingStore } from './keyboard-input.js';
import type { BindingValidation, KeyboardBindings, KeyboardBindingStore, KeyboardInput } from './keyboard-input.js';
import { createLocalSessionBoard, createSessionKeyboardEditor } from './session-ui.js';
import type { LocalSessionBoard, SessionSetupSeat } from './session-ui.js';
import { GameAudio } from './audio.js';
import { Soundscape } from './soundscape.js';
import { createSoundSettings } from './sound-settings.js';
import { mobDefinition } from './mobs.js';
import type { Mob, MobKind } from './mobs.js';
import { createGamepadControls } from './gamepad.js';
import { GamepadRouter } from './session-input.js';
import type { GamepadDevice, GamepadLifecycle } from './session-input.js';
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
let setupDraft: SessionSetupSeat[] = [];
let sessionBoard: LocalSessionBoard | undefined;
let soloGamepad: GamepadDevice | undefined;
let hudSelected: SeatId = 'p1';
const controllerDevices = new Map<number, GamepadDevice>();
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
const sessionCalls = new Map<SeatId, number>();
let keyboardBindings: KeyboardBindings = DEFAULT_KEYBOARD_BINDINGS;
let keyboardInput: KeyboardInput | undefined;
let keyboardStore: KeyboardBindingStore | undefined;
const observedNativeKeys = new Set<string>();
const bindings: { close: () => void }[] = [];
const shellShortcutLeases = new Map<string, { close: () => void }>();
let nativeKeyboardActive = false;
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
const router = new GamepadRouter({
  context: () => `${localStage ? 'setup' : localSession ? sessionPaused ? 'session-paused' : 'session' : 'solo'}:${game.state}:${hand.isOpen() ? 'hand' : game.run.isOpen ? 'market' : el('drawer').hidden ? `run:${el('app').dataset.runMenuPage ?? el('app').dataset.pausePage ?? ''}` : `collection:${el('drawer').dataset.collectionTab}:${el('drawer').dataset.collectionView}`}`,
  dispatch: ({ seat, direction }) => {
    if (localSession?.running) { moveSessionCharacter(seat, direction); return true; }
    if (seat === 'p1') { move(direction); return true; }
    return false;
  },
  action: (seat, action) => {
    if (action === 'call') { localSession?.running ? callSessionCharacter(seat) : callCharacter(); return; }
    if (action === 'confirm') {
      if (displayedRunState() !== 'playing' || localStage || hand.isOpen() || game.run.isOpen || !el('drawer').hidden) { confirmMenu(); return; }
      if (localSession?.running) moveSessionCharacter(seat, 'forward'); else move('forward');
      return;
    }
    if (action === 'pause') { togglePause(); return; }
    if (action === 'back') { backMenu(); return; }
    if (action === 'menu') { el('drawer').hidden ? openDrawer() : closeDrawer(); return; }
    if (action === 'market') market.toggle();
  },
  acceptsDevice: () => !localSession || localStage !== undefined || setupDraft.length < 4,
  requestFirstPlayer: device => {
    if (soloGamepad || localStage || localSession || game.state === 'dead') return false;
    soloGamepad = device;
    return router.assign(device, 'p1', true);
  },
  requestLocalPlay: device => requestControllerSeat(device),
  requestReclaim: (device, seat) => reclaimControllerSeat(device, seat),
  lifecycle: event => handleControllerLifecycle(event),
  onFrameSafetyLost: suspendPlay,
});
const gamepad = createGamepadControls({ context: () => 'session-router', enabled: () => !disposed, direction: () => {}, confirm: () => {}, pause: () => {}, call: () => {}, back: () => {}, menu: () => {} }, undefined, undefined, undefined,
  (state, now) => router.receive(state, now));
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
/** Session calls deliberately resolve the assigned seat, never saved solo choice. */
function callSessionCharacter(seat: SeatId): void {
  if (import.meta.env.DEV && devTools?.isOpen) return;
  if (!localSession?.running || localStage || sessionPaused || disposed || !localFocus || document.hidden || game.run.isOpen || !el('drawer').hidden || progress.muted || innerWidth < 240 || innerHeight < 240 || displayedRunState() !== 'playing') return;
  const player = localSession.players.find(candidate => candidate.seat === seat);
  if (!player || player.state !== 'playing') return;
  const now = performance.now(), last = sessionCalls.get(seat) ?? -Infinity;
  if (now - last < 450) return;
  audio.unlock(); audio.play(characterById(player.characterId).call); sessionCalls.set(seat, now);
}
function moveSessionCharacter(seat: SeatId, direction: Direction): void {
  if (!frameAvailable() || !localSession?.running || localStage || hand.isOpen() || hand.containsFocus() || game.run.isOpen || !el('drawer').hidden || displayedRunState() !== 'playing') return;
  audio.unlock(); if (localSession.dispatch({ seat, direction })) audio.play('hop'); updateHud();
}
function releaseNativeKeyboard(): void {
  keyboardInput?.suspend();
}
function activateNativeKeyboard(): void {
  if (nativeKeyboardActive) { keyboardInput?.resume([...observedNativeKeys]); return; }
  nativeKeyboardActive = true;
  keyboardInput?.resume([...observedNativeKeys]);
  suspendOverlappingShellShortcuts();
}
function deactivateNativeKeyboard(): void {
  keyboardInput?.suspend();
  if (!nativeKeyboardActive) return;
  nativeKeyboardActive = false;
  void restoreOverlappingShellShortcuts();
}
function replaceKeyboardInput(next: KeyboardBindings): void {
  keyboardInput?.dispose();
  keyboardBindings = next;
  keyboardInput = createKeyboardInput({ move: moveSessionCharacter, call: callSessionCharacter, seatForProfile: keyboardSeatForProfile }, keyboardBindings);
  if (nativeKeyboardActive) keyboardInput.resume([...observedNativeKeys]); else keyboardInput.suspend();
}
function keyboardSeatForProfile(profile: 'keyboard-a' | 'keyboard-b'): SeatId | undefined {
  const device = profile as DeviceId;
  if (localSession?.running) return localSession.players.find(player => player.device === device)?.seat;
  if (localStage) return setupDraft.find(seat => seat.device === device)?.seat;
  return profile === 'keyboard-a' ? 'p1' : 'p2';
}
async function commitKeyboardBindings(next: KeyboardBindings): Promise<BindingValidation> {
  const result = await (keyboardStore?.commit(next) ?? Promise.resolve({ ok: true, bindings: next } as const));
  if (result.ok) replaceKeyboardInput(result.bindings);
  return result;
}
sessionBoard = createLocalSessionBoard({
  root: el('local-session-setup'),
  capacity: 4,
  seats: () => setupDraft,
  controllerAvailable: () => gamepad.supported,
  onAddKeyboard: () => addKeyboardSeat(),
  onLeave: seat => leaveSetupSeat(seat),
  onCharacter: (seat, characterId) => chooseSetupCharacter(seat, characterId),
  onStart: () => startLocalPlay(),
  onBack: () => backToSolo(),
});
const sessionKeyboardEditor = createSessionKeyboardEditor({
  root: el('local-session-setup'),
  bindings: () => keyboardBindings,
  commit: commitKeyboardBindings,
  capture: active => active ? keyboardInput?.beginCapture() : keyboardInput?.endCapture([...observedNativeKeys]),
  seatForProfile: keyboardSeatForProfile,
});
type ShellShortcutDefinition = { id: string; defaultKey: string; handler: () => void };
const shellShortcutDefinitions: readonly ShellShortcutDefinition[] = [
  { id: 'forward', defaultKey: 'ArrowUp', handler: () => moveLocal('p2', 'forward') },
  { id: 'back', defaultKey: 'ArrowDown', handler: () => moveLocal('p2', 'back') },
  { id: 'left', defaultKey: 'ArrowLeft', handler: () => moveLocal('p2', 'left') },
  { id: 'right', defaultKey: 'ArrowRight', handler: () => moveLocal('p2', 'right') },
  { id: 'forward-w', defaultKey: 'w', handler: () => moveLocal('p1', 'forward') },
  { id: 'back-s', defaultKey: 's', handler: () => moveLocal('p1', 'back') },
  { id: 'left-a', defaultKey: 'a', handler: () => moveLocal('p1', 'left') },
  { id: 'right-d', defaultKey: 'd', handler: () => moveLocal('p1', 'right') },
  { id: 'play', defaultKey: 'Enter', handler: confirmMenu },
  { id: 'pause', defaultKey: 'p', handler: () => !el('drawer').hidden ? closeDrawer() : togglePause() },
  { id: 'call', defaultKey: 'q', handler: callCharacter },
  { id: 'market', defaultKey: 'm', handler: () => market.toggle() },
  { id: 'back-menu', defaultKey: 'Escape', handler: backMenu },
];
const overlappingShortcutIds = new Set(['forward', 'back', 'left', 'right', 'forward-w', 'back-s', 'left-a', 'right-d', 'call']);
function guardedShellShortcut(definition: ShellShortcutDefinition): void {
  if (import.meta.env.DEV && devTools?.isOpen) return;
  if (definition.id !== 'back-menu' && game.state === 'dead' && el('run-seed').contains(document.activeElement)) {
    if (definition.id === 'play' && (document.activeElement === el('copy-seed') || document.activeElement === el('run-seed-code'))) (document.activeElement as HTMLElement).click();
    return;
  }
  const focused = document.activeElement;
  if (!el('drawer').hidden && definition.id !== 'back-menu' &&
      ((focused instanceof HTMLInputElement && focused.type === 'text') || focused instanceof HTMLSelectElement)) return;
  definition.handler();
}
async function registerShellShortcut(definition: ShellShortcutDefinition): Promise<void> {
  if (disposed || shellShortcutLeases.has(definition.id) || !runtimeHasDomain('keys')) return;
  try {
    const lease = await keys.register({ id: `puddlehop.${definition.id}`, label: definition.id === 'call' ? 'Make your traveler call' : `Down to Duck ${definition.id}`, defaultKey: definition.defaultKey }, () => guardedShellShortcut(definition));
    if (disposed || (nativeKeyboardActive && overlappingShortcutIds.has(definition.id))) { lease.close(); return; }
    shellShortcutLeases.set(definition.id, lease);
    if (definition.id === 'call') { callShortcut = (lease.binding || definition.defaultKey).toUpperCase(); updateCallControl(); }
    if (definition.id === 'market') { marketShortcut = (lease.binding || definition.defaultKey).toUpperCase(); market.update(); }
  } catch { notify('Keyboard shortcuts unavailable. Use the on-screen controls.'); }
}
function suspendOverlappingShellShortcuts(): void {
  for (const id of overlappingShortcutIds) {
    const lease = shellShortcutLeases.get(id);
    if (lease) { lease.close(); shellShortcutLeases.delete(id); }
  }
}
async function restoreOverlappingShellShortcuts(): Promise<void> {
  await Promise.all(shellShortcutDefinitions.filter(definition => overlappingShortcutIds.has(definition.id)).map(registerShellShortcut));
}
function runGoal(): string {
  switch (progress.runs % 3) { case 0: return 'Little goal: reach 25 hops this run.'; case 1: return 'Little goal: find 3 coins this run.'; default: return 'Little goal: reach the next world at 32 hops.'; }
}
function reset(launch?: GameLaunch): void {
  deactivateNativeKeyboard(); sessionCalls.clear();
  const restoreController = soloGamepad;
  for (const player of localSession?.players ?? []) router.release(player.seat);
  for (const seat of setupDraft) if (seat.device?.startsWith('gamepad-')) router.release(seat.seat);
  localSession?.stop(); localSession = undefined; localStage?.cancel(); localStage = undefined; setupDraft = []; sessionPaused = false;
  if (restoreController) router.assign(restoreController, 'p1');
  sessionKeyboardEditor.close();
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
    seats.replaceChildren(...localSession.players.map(player => {
      const character = characterById(player.characterId);
      const tile = document.createElement('button'); tile.type = 'button'; tile.className = `session-hud-tile${hudSelected === player.seat ? ' session-hud-selected' : ''}`; tile.dataset.seat = player.seat;
      tile.setAttribute('aria-label', `${player.seat.toUpperCase()} ${seatMarker(player.seat)} ${character.name}, ${player.device}, ${player.health} of ${player.maxHealth} feathers`);
      const identity = document.createElement('strong'); identity.textContent = `${player.seat.toUpperCase()} ${seatMarker(player.seat)} · ${character.name}`;
      const device = document.createElement('span'); device.textContent = player.participation === 'device-lost' ? 'Waiting to reclaim' : player.device;
      const health = document.createElement('span'); health.textContent = `${player.health} / ${player.maxHealth} feathers · ${player.statistics.distance} tiles`;
      const power = document.createElement('span'); power.textContent = `${player.power.name} · ${player.powerReady ? 'Ready' : `${player.powerRemaining} tiles`}`;
      const wallet = document.createElement('span'); wallet.textContent = `${player.run.wallet} coins · ${player.run.cards.length} cards`;
      const revive = document.createElement('span'); revive.className = 'session-future'; revive.textContent = 'Revive —';
      const item = document.createElement('span'); item.className = 'session-future'; item.textContent = 'Item —';
      tile.append(identity, device, health, power, wallet, revive, item);
      tile.addEventListener('click', () => { hudSelected = player.seat; updateHud(); });
      return tile;
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
    sessionPaused = false; game.resume(); accumulator = 0; activateNativeKeyboard(); updateHud(); return;
  }
  if (game.state === 'dead') reset();
  if (game.state === 'paused') game.resume(); else game.start();
  updateHud();
}
const allSeats = ['p1', 'p2', 'p3', 'p4'] as const;
function seatMarker(seat: SeatId): string { return ({ p1: '▲', p2: '●', p3: '◆', p4: '■' })[seat]; }
const markerDevice = (device: GamepadDevice): DeviceId => device.deviceId;
const deviceLabel = (device: GamepadDevice): string => `Controller ${device.index + 1}: ${device.id}`;
const nextUnusedCharacter = (seats: readonly SessionSetupSeat[]): string | null => CHARACTERS.find(character => !seats.some(seat => seat.characterId === character.id))?.id ?? null;
function nextOpenSeat(seats: readonly SessionSetupSeat[]): SeatId | undefined { return allSeats.find(seat => !seats.some(candidate => candidate.seat === seat)); }
function renderSetup(message = ''): void { sessionBoard?.render(message); }
function addKeyboardSeat(): void {
  if (!localStage || setupDraft.length >= localStage.session.config.capacity) return;
  const seat = nextOpenSeat(setupDraft), characterId = nextUnusedCharacter(setupDraft);
  const device = (['keyboard-a', 'keyboard-b'] as const).find(candidate => !setupDraft.some(seat => seat.device === candidate));
  if (!seat || !characterId || !device) return;
  const label = device === 'keyboard-a' ? 'Keyboard A' : 'Keyboard B';
  setupDraft = [...setupDraft, { seat, device, deviceLabel: label, characterId }];
  renderSetup(`${seat.toUpperCase()} ready — ${characterById(characterId).name} on ${label}.`);
}
function chooseSetupCharacter(seat: SeatId, characterId: string): void {
  if (!localStage || setupDraft.some(other => other.seat !== seat && other.characterId === characterId)) return;
  setupDraft = setupDraft.map(candidate => candidate.seat === seat ? { ...candidate, characterId } : candidate);
  renderSetup(`${seat.toUpperCase()} chose ${characterById(characterId).name}.`);
}
function leaveSetupSeat(seat: SeatId): void {
  if (!localStage || seat === 'p1') return;
  router.release(seat);
  setupDraft = setupDraft.filter(candidate => candidate.seat !== seat);
  renderSetup(`${seat.toUpperCase()} left Local Play.`);
}
/** Setup freezes the existing loop without advancing it; roster edits remain UI-only drafts. */
function openLocalPlay(joining?: GamepadDevice): void {
  if (!frameAvailable() || localStage || localSession || game.state === 'dead' || !el('drawer').hidden || hand.isOpen() || game.run.isOpen || game.run.pendingPack) return;
  try { localStage = LocalSession.stage(game, { roster: [] }); }
  catch { notify('Local Play needs a safe second starting spot on this course.'); return; }
  const primaryDevice: DeviceId = soloGamepad ? markerDevice(soloGamepad) : 'keyboard-a';
  setupDraft = [{ seat: 'p1', device: primaryDevice, deviceLabel: soloGamepad ? deviceLabel(soloGamepad) : 'Keyboard A', characterId: game.characterId }];
  if (joining) {
    const characterId = nextUnusedCharacter(setupDraft);
    if (characterId) {
      setupDraft.push({ seat: 'p2', device: markerDevice(joining), deviceLabel: deviceLabel(joining), characterId });
      router.assign(joining, 'p2');
    }
  } else addKeyboardSeat();
  accumulator = 0; pointer = null; audio.stop();
  const setup = el<HTMLDivElement>('local-session-setup');
  setup.hidden = false; setup.setAttribute('role', 'dialog'); setup.setAttribute('aria-modal', 'true'); setup.setAttribute('aria-label', 'Local Play');
  sessionKeyboardEditor.close(); renderSetup(joining ? 'Controller joined an open seat. Its joining press was consumed.' : 'Choose a traveler and controller for every player.');
  updateHud(); sessionBoard?.focusStart();
}
/** Back to solo cancels the empty stage; no draft ever changed the adopted owner. */
function backToSolo(): void {
  if (!localStage) return;
  for (const seat of setupDraft) if (seat.device?.startsWith('gamepad-')) router.release(seat.seat);
  const restoreController = soloGamepad;
  game = localStage.cancel(); localStage = undefined; setupDraft = [];
  if (restoreController) router.assign(restoreController, 'p1');
  accumulator = 0;
  sessionKeyboardEditor.close();
  el<HTMLDivElement>('local-session-setup').hidden = true;
  updateHud();
  el(game.state === 'playing' ? 'scene' : 'local-play').focus({ preventScroll: true });
}
function startLocalPlay(): void {
  if (!localStage || !frameAvailable()) return;
  const valid = setupDraft.filter(seat => !!seat.device && !!seat.characterId && !seat.disconnected);
  if (valid.length < 2 || valid.length !== setupDraft.length || new Set(valid.map(seat => seat.characterId)).size !== valid.length || new Set(valid.map(seat => seat.device)).size !== valid.length) { renderSetup('Choose two ready players with different travelers and devices.'); return; }
  const primary = valid.find(seat => seat.seat === 'p1');
  if (!primary?.characterId || !primary.device) { renderSetup('P1 needs a traveler and device.'); return; }
  const roster = valid.filter((seat): seat is SessionSetupSeat & { characterId: string; device: DeviceId } => seat.seat !== 'p1' && !!seat.characterId && !!seat.device)
    .map(seat => ({ seat: seat.seat as Exclude<SeatId, 'p1'>, device: seat.device, characterId: seat.characterId })) satisfies readonly SessionSeatSpec[];
  const emptyStage = localStage;
  const originalCharacter = game.characterId;
  const originalDevice = emptyStage.session.players.find(player => player.seat === 'p1')!.device;
  let candidate: ReturnType<typeof LocalSession.stage>;
  try {
    game.setCharacter(primary.characterId);
    emptyStage.session.players.find(player => player.seat === 'p1')!.device = primary.device;
    candidate = LocalSession.stage(game, { roster, config: emptyStage.session.config, onLifecycle: record => notify(`${record.seat.toUpperCase()} ${record.type.replace('-', ' ')}.`) });
  } catch {
    game.setCharacter(originalCharacter);
    emptyStage.session.players.find(player => player.seat === 'p1')!.device = originalDevice;
    renderSetup('Local Play could not safely place that roster on this course.'); return;
  }
  emptyStage.cancel();
  localSession = candidate.commit(); localStage = undefined; setupDraft = [];
  // The active router lease changes from setup to session in this transaction.
  // Seed the last complete shell snapshot so the next deliberate edge is not
  // swallowed as a context change.
  router.seedAll();
  game.resume(); sessionPaused = false; accumulator = 0;
  sessionKeyboardEditor.close();
  el<HTMLDivElement>('local-session-setup').hidden = true;
  activateNativeKeyboard(); audio.unlock(); updateHud(); el('scene').focus({ preventScroll: true });
}
function requestControllerSeat(device: GamepadDevice): void {
  if (!localSession && !localStage) {
    if (!soloGamepad) return;
    openLocalPlay(device); return;
  }
  if (!localStage || setupDraft.length >= localStage.session.config.capacity || setupDraft.some(seat => seat.device === markerDevice(device))) return;
  const seat = nextOpenSeat(setupDraft), characterId = nextUnusedCharacter(setupDraft);
  if (!seat || !characterId) return;
  setupDraft = [...setupDraft, { seat, device: markerDevice(device), deviceLabel: deviceLabel(device), characterId }];
  router.assign(device, seat); renderSetup(`${seat.toUpperCase()} ready — ${characterById(characterId).name} on ${deviceLabel(device)}.`);
}
function reclaimControllerSeat(device: GamepadDevice, seat: SeatId): void {
  if (localStage) {
    const draft = setupDraft.find(candidate => candidate.seat === seat);
    if (!draft) return;
    setupDraft = setupDraft.map(candidate => candidate.seat === seat ? { ...candidate, device: markerDevice(device), deviceLabel: deviceLabel(device), disconnected: false } : candidate);
    router.reclaim(device); renderSetup(`Controller ready to reclaim ${seat.toUpperCase()}.`); return;
  }
  if (!localSession && seat === 'p1') { soloGamepad = device; router.reclaim(device); notify('Controller reclaimed solo play.'); return; }
  if (!localSession?.offerReclaim(seat, markerDevice(device)) || !localSession.reclaim(seat, markerDevice(device))) return;
  router.reclaim(device); notify(`Controller reclaimed ${seat.toUpperCase()}.`); updateHud();
}
function handleControllerLifecycle(event: GamepadLifecycle): void {
  if (event.type === 'seen') {
    controllerDevices.set(event.device.index, event.device);
  }
  if (event.type === 'disconnected') controllerDevices.delete(event.device.index);
  controllerConnected = controllerDevices.size > 0; el('gamepad-help').hidden = !controllerConnected;
  if (event.type === 'disconnected' && event.seat) {
    if (localStage) {
      setupDraft = setupDraft.map(seat => seat.seat === event.seat ? { ...seat, disconnected: true } : seat);
      renderSetup(`Reconnect or press a controller button to reclaim ${event.seat.toUpperCase()}.`);
    } else if (localSession?.running) {
      localSession.deviceLost(event.seat); notify(`${event.seat.toUpperCase()} controller disconnected.`); updateHud();
    } else if (event.seat === 'p1') { soloGamepad = undefined; suspendPlay(); }
  }
  if (event.type === 'reclaim-offered' && event.seat) {
    if (localSession?.running) localSession.offerReclaim(event.seat, markerDevice(event.device));
    if (localStage) renderSetup(`Controller ready to reclaim ${event.seat.toUpperCase()}.`);
  }
  previousState = ''; updateCallControl();
}
function moveLocal(seat: SeatId, direction: Direction): void {
  if (!frameAvailable()) return;
  if (!localSession?.running || localStage || hand.isOpen() || hand.containsFocus() || game.run.isOpen || !el('drawer').hidden || displayedRunState() !== 'playing') { move(direction); return; }
  audio.unlock(); if (localSession.dispatch({ seat, direction })) audio.play('hop'); updateHud();
}
function localSetupKeydown(event: KeyboardEvent): void {
  if (!localStage || disposed || event.key !== 'Tab') return;
  const buttons = [...el('local-session-setup').querySelectorAll<HTMLElement>('button:not([hidden]):not(:disabled)')].filter(button => !button.closest('[hidden]'));
  if (!buttons.length) return;
  const current = buttons.indexOf(document.activeElement as HTMLElement);
  event.preventDefault();
  buttons[(current + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]!.focus({ preventScroll: true });
}
document.addEventListener('keydown', localSetupKeydown, true);
function isNativeKeyboardTarget(target: EventTarget | null): boolean {
  return !(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement || target instanceof HTMLButtonElement);
}
function nativeKeyboardKeydown(event: KeyboardEvent): void {
  if (!nativeKeyboardActive || !isNativeKeyboardTarget(event.target)) return;
  observedNativeKeys.add(event.key);
  if (keyboardInput?.keydown(event.key)) { event.preventDefault(); event.stopPropagation(); }
}
function nativeKeyboardKeyup(event: KeyboardEvent): void {
  observedNativeKeys.delete(event.key);
  if (!nativeKeyboardActive || !isNativeKeyboardTarget(event.target)) return;
  if (keyboardInput?.keyup(event.key)) { event.preventDefault(); event.stopPropagation(); }
}
document.addEventListener('keydown', nativeKeyboardKeydown);
document.addEventListener('keyup', nativeKeyboardKeyup);
function move(direction: Direction): void {
  if (!frameAvailable()) return;
  if (localStage) {
    const buttons = [...el('local-session-setup').querySelectorAll<HTMLButtonElement>('button')]
      .filter(button => !button.disabled && !button.hidden && button.getClientRects().length > 0);
    if (!buttons.length) return;
    const current = buttons.indexOf(document.activeElement as HTMLElement);
    const delta = direction === 'left' || direction === 'back' ? -1 : 1;
    buttons[(current + delta + buttons.length) % buttons.length]!.focus({ preventScroll: true }); return;
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
    const focused = document.activeElement;
    if (focused instanceof HTMLButtonElement && el('local-session-setup').contains(focused) && !focused.disabled) focused.click();
    else sessionBoard?.focusStart();
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
function suspendPlay(): void { releaseNativeKeyboard(); if (localSession) sessionPaused = true; pointer = null; audio.stop(); handPausedPlay = false; hand.close(); game.closeMarket(false); game.pause(); restoreAfterDrawer = false; restoreModalFocus = false; updateHud(); restoreModalFocus = true; }
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
el('local-play').addEventListener('click', () => openLocalPlay());
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
  gamepad.update(now); router.update(now);
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
  keyboardStore = createKeyboardBindingStore(runtimeHasDomain('storage') ? storage : undefined);
  replaceKeyboardInput(await keyboardStore.load());
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
  if (runtimeHasDomain('keys')) await Promise.all(shellShortcutDefinitions.map(registerShellShortcut));
}
window.addEventListener('pagehide', () => { if (disposed) return; disposed = true; deactivateNativeKeyboard(); localSession?.stop(); localStage?.cancel(); localStage = undefined; document.removeEventListener('keydown', localSetupKeydown, true); document.removeEventListener('keydown', nativeKeyboardKeydown); document.removeEventListener('keyup', nativeKeyboardKeyup); sessionKeyboardEditor.dispose(); if (import.meta.env.DEV) devTools?.dispose(); game.closeMarket(false); gamepad.close(); router.close(); market.dispose(); pauseUI.dispose(); runMenuUI.dispose(); collectionUI.dispose(); hand.dispose(); seedUI.dispose(); sounds.dispose(); cancelAnimationFrame(raf); observer.disconnect(); bindings.forEach(b => b.close()); for (const lease of shellShortcutLeases.values()) lease.close(); shellShortcutLeases.clear(); });
void boot();
