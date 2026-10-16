import './styles.css';
import './game-ui.css';
import './session-ui.css';
import './survive-results-ui.css';
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
import type { CoOpMarketContext } from './co-op-market.js';
import type { MarketResult } from './market/types.js';
import { createSurviveTogetherDefinition } from './survive-together.js';
import { createSurviveResultsBoard } from './survive-results-ui.js';
import type { SurviveTogetherResult } from './survive-results.js';
import { createKeyboardInput, DEFAULT_KEYBOARD_BINDINGS } from './keyboard-input.js';
import { createKeyboardBindingStore } from './keyboard-input.js';
import type { BindingValidation, KeyboardBindings, KeyboardBindingStore, KeyboardInput } from './keyboard-input.js';
import { createLocalSessionBoard, createSessionKeyboardEditor } from './session-ui.js';
import type { LocalSessionBoard, SessionSetupSeat } from './session-ui.js';
import { createRelaySession, RELAY_LOCKED } from './relay.js';
import { createRaceSession, validateRaceSetup } from './race.js';
import type { RaceCoordinator } from './race.js';
import { createRaceSetup, createRaceResultsBoard, renderRaceHud, racePresentation, renderRaceEdges, raceFogLabel, pageRaceTargets } from './race-ui.js';
import type { RelayCoordinator, RelayConfirmation, RelayActionToken } from './relay.js';
import { createRelaySetup, createRelayHandoff, createRelayLifecycle, createRelayResults, renderRelayHud } from './relay-ui.js';
import { GameAudio } from './audio.js';
import { Soundscape } from './soundscape.js';
import { createSoundSettings } from './sound-settings.js';
import { mobDefinition } from './mobs.js';
import type { Mob, MobKind } from './mobs.js';
import { createGamepadControls } from './gamepad.js';
import { GamepadRouter } from './session-input.js';
import type { GamepadDevice, GamepadLifecycle, GamepadReclaimInput } from './session-input.js';
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
let stagingSurviveTogether = false;
let stagingRelay = false;
let stagingRace = false;
let race: RaceCoordinator | undefined;
let raceInputGeneration = '';
let closedRosterMessage = 'The roster is locked for this run.';
let relay: RelayCoordinator | undefined;
let relayHandoff: HTMLElement | undefined;
let disposeRelayResults: (() => void) | undefined;
let relayBoardKey = '';
let relayRenderedOwner: SeatId | undefined;
let stagedLiveJoin: GamepadDevice | undefined;
let sessionBoard: LocalSessionBoard | undefined;
let soloGamepad: GamepadDevice | undefined;
let hudSelected: SeatId = 'p1';
let hudDetailsOpen = false;
let hudInspectWasPlaying = false;
let hudDetailsPage = 0;
let coOpMarketContext: CoOpMarketContext | undefined;
let coOpMarketActionId = 0;
function selectedSessionOwner() { return localSession?.players.find(player => player.seat === hudSelected); }
function selectedOwnerRun() { return selectedSessionOwner()?.run ?? game.run; }
function selectedOwnerCharacter() { return characterById(selectedSessionOwner()?.characterId ?? progress.selected); }
function selectedOwnerKey(): string { const owner = selectedSessionOwner(); return owner && localSession ? `${localSession.id}:${owner.seat}` : 'solo'; }
function selectedOwnerLabel(): string | undefined {
  const owner = sharedOwner(); return owner ? relay || race ? `Viewing ${owner.seat.toUpperCase()} · ${owner.character.name}` : `Viewing ${owner.seat.toUpperCase()} ${owner.marker} · ${owner.character.name}` : undefined;
}
function sharedOwner() {
  const owner = selectedSessionOwner();
  return owner ? { key: selectedOwnerKey(), seat: owner.seat, marker: seatMarker(owner.seat), character: characterById(owner.characterId) } : undefined;
}
function sharedOwners() {
  const session = localSession;
  return session?.players.map(player => ({ key: `${session.id}:${player.seat}`, seat: player.seat, marker: seatMarker(player.seat), character: characterById(player.characterId) })) ?? [];
}
function ownerMutationsAvailable(): boolean {
  if (localSession && !localSession.canTransact(hudSelected)) return false;
  const owner = selectedSessionOwner();
  return !localSession?.running || !!owner && owner.participation === 'active' && owner.state !== 'dead' && owner.run.alive;
}
function ownerMutationReason(): string {
  if (relay && !relay.canTransact(hudSelected)) return 'Only the active runner can use the relay hand.';
  const owner = selectedSessionOwner();
  if (owner?.participation === 'device-lost') return `${owner.seat.toUpperCase()} must reclaim their controller first.`;
  if (owner?.participation === 'dead') return `${owner.seat.toUpperCase()} cannot use market actions while recovering.`;
  if (owner?.participation === 'departed') return `${owner.seat.toUpperCase()} left this run.`;
  return 'This market action is unavailable.';
}
function coOpMarketTransaction(request: { kind: 'open' | 'close' | 'buy' | 'buy-consumable' | 'sell' | 'claim-pack' | 'skip-pack' | 'equip'; offerId?: string; itemId?: string; cardId?: string; ids?: readonly string[]; discardIds?: readonly string[] }): MarketResult {
  const session = localSession, owner = selectedSessionOwner();
  if (!session?.running || !owner) return { ok: false, message: 'That market interaction is unavailable.' };
  // A direct shelf sale is valid outside a market window, but still starts one
  // fresh owner interaction. Existing contexts are never replaced to rescue a
  // delayed action after an owner/lifecycle change.
  // Opening the table is a new deliberate interaction and captures a fresh
  // owner/run snapshot. Other actions never refresh a stale authorization.
  if (request.kind === 'open' || (!coOpMarketContext && request.kind === 'sell')) coOpMarketContext = session.openCoOpMarket({ seat: owner.seat, device: owner.device, participantId: owner.participantId });
  const context = coOpMarketContext;
  if (!context || context.seat !== owner.seat || context.participantId !== owner.participantId) return { ok: false, message: 'That market interaction is no longer current.' };
  const result = session.actCoOpMarket({ actionId: `ui-market-${++coOpMarketActionId}`, seat: context.seat, device: owner.device, participantId: context.participantId,
    expectedOwnerGeneration: context.ownerGeneration, expectedInventoryGeneration: context.inventoryGeneration, expectedRunRevision: context.runRevision, expectedContextGeneration: context.contextGeneration,
    kind: request.kind, offerId: request.offerId, itemId: request.itemId, cardId: request.cardId, ids: request.ids, discardIds: request.discardIds });
  // A rejected delayed action must stay rejected. Only a committed operation
  // advances the captured snapshot for a following action in that same view.
  if (result.ok) coOpMarketContext = result.context;
  return { ok: result.ok, message: result.message };
}
function selectHudOwner(seat: SeatId): void {
  if (hudSelected === seat) return;
  if(raceItemContext)closeLifecycleBoard();
  // Both shared surfaces retain ephemeral UI state. Invalidate that state while
  // the old inventory is still resolvable, before a new seat becomes current.
  const marketWasOpen = market.invalidateOwner(); hand.invalidateOwner(); coOpMarketContext = undefined; router.seedAll(); hudSelected = seat;
  // The incoming owner keeps its own inventory and may expose an empty
  // inspection surface, but never inherits a previous interaction context.
  hudDetailsPage = 0;
  if (marketWasOpen && localSession?.running) market.openForSelected();
  market.update(); market.focusSelectedOwner(); updateHud();
}
function selectNextHudOwner(): void {
  if (!localSession?.running) return;
  const seats = localSession.players.map(player => player.seat);
  const next = seats[(seats.indexOf(hudSelected) + 1) % seats.length];
  if (next) selectHudOwner(next);
}
function closeHudInspection(resume = true): void {
  const shouldResume = resume && hudInspectWasPlaying && frameAvailable();
  hudDetailsOpen = false; hudInspectWasPlaying = false; hudDetailsPage = 0;
  if (shouldResume) { sessionPaused = false; game.resume(); activateNativeKeyboard(); }
}
function itemCharge(seat: SeatId) { return localSession?.consumableSnapshot()?.charges.find(charge => charge.seat === seat); }
function personalProgress(player: NonNullable<ReturnType<typeof selectedSessionOwner>>): string {
  const recovery = player.recovery;
  if (!recovery) return 'Personal revive: —';
  if (recovery.charge === 'available') return 'Personal revive: Ready';
  return `Personal revive: ${Math.min(250, Math.max(0, 250 - Math.max(0, recovery.nextRecharge - recovery.personalHighWater)))} / 250 tiles`;
}
function lifecycleLabel(player: NonNullable<ReturnType<typeof selectedSessionOwner>>): string {
  if ((player.recovery?.protectionUntil ?? 0) > (localSession?.world.time ?? Infinity)) return 'Protected';
  if (player.participation === 'device-lost') return 'Ghost · reclaim-ready';
  if (player.participation === 'departed') return 'Left run';
  if (player.participation === 'dead') return player.recovery?.offer ? 'Recovery pending' : 'Down';
  return player.state === 'paused' ? 'Active · paused' : 'Active';
}
let recoveryReturnFocus: HTMLElement | undefined;
let recoveryInertSiblings = new Map<HTMLElement, boolean>();
function setRecoveryModalInert(board: HTMLElement): void {
  recoveryReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
  recoveryInertSiblings = new Map([...el('app').children]
    .filter((child): child is HTMLElement => child instanceof HTMLElement && child !== board && !child.classList.contains('too-small'))
    .map(child => [child, child.inert]));
  for (const sibling of recoveryInertSiblings.keys()) sibling.inert = true;
}
function clearRecoveryModalInert(): void {
  for (const [sibling, inert] of recoveryInertSiblings) sibling.inert = inert;
  recoveryInertSiblings.clear();
}
function discardRecoveryBoard(message?: string): void {
  const priorFocus = recoveryReturnFocus; recoveryReturnFocus = undefined;
  recoveryBoard?.remove(); recoveryBoard = undefined; recoveryBoardOwner = undefined; clearRecoveryModalInert();
  if (message) notify(message);
  queueMicrotask(() => (priorFocus?.isConnected ? priorFocus : el<HTMLButtonElement>('pause')).focus({ preventScroll: true }));
}
function closeRecoveryBoard(resume = false): void {
  discardRecoveryBoard();
  if (resume && localSession?.running && frameAvailable()) { sessionPaused = false; game.resume(); activateNativeKeyboard(); }
  updateHud();
}
function closeLifecycleBoard(): void {
  raceItemContext=undefined;
  if(race?.confirmingLeave)race.command(race.actionToken(race.confirmingLeave),'cancel');
  const priorFocus = recoveryReturnFocus, resume = lifecycleWasPlaying; recoveryReturnFocus = undefined; lifecycleWasPlaying = false;
  lifecycleBoard?.remove(); lifecycleBoard = undefined; pendingReclaim = undefined; clearRecoveryModalInert();
  if (resume && localSession?.running && frameAvailable()) { sessionPaused = false; game.resume(); activateNativeKeyboard(); }
  updateHud();
  queueMicrotask(() => (priorFocus?.isConnected ? priorFocus : el<HTMLButtonElement>('pause')).focus({ preventScroll: true }));
}
function openLifecycleBoard(ownerSeat: SeatId, titleCopy: string, detailCopy: string, cancelCopy: string, confirmCopy: string, destructive: boolean, focusConfirm: boolean, confirm: () => boolean): void {
  if (recoveryBoard) discardRecoveryBoard();
  if (lifecycleBoard) closeLifecycleBoard();
  lifecycleWasPlaying = displayedRunState() === 'playing';
  if (lifecycleWasPlaying) { sessionPaused = true; game.pause(); accumulator = 0; audio.stop(); }
  const board = document.createElement('section'); board.id = 'survive-lifecycle-board'; board.className = 'survive-recovery-board'; board.dataset.lifecycleOwner = ownerSeat; board.setAttribute('role', 'dialog'); board.setAttribute('aria-modal', 'true'); board.setAttribute('aria-labelledby', 'survive-lifecycle-title');
  const title = document.createElement('h2'); title.id = 'survive-lifecycle-title'; title.textContent = titleCopy;
  const detail = document.createElement('p'); detail.className = 'survive-recovery-status'; detail.textContent = detailCopy;
  const actions = document.createElement('div'); actions.className = 'survive-recovery-actions';
  const notNow = document.createElement('button'); notNow.type = 'button'; notNow.textContent = cancelCopy; notNow.addEventListener('click', closeLifecycleBoard);
  const apply = document.createElement('button'); apply.type = 'button'; apply.className = destructive ? 'danger' : 'primary'; apply.textContent = confirmCopy;
  apply.addEventListener('click', () => { if (!confirm()) return; closeLifecycleBoard(); });
  actions.append(notNow, apply); board.append(title, detail, actions); el('app').append(board); lifecycleBoard = board; setRecoveryModalInert(board);
  board.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = visibleModalControls(board), first = controls[0], last = controls.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  queueMicrotask(() => (focusConfirm ? apply : notNow).focus({ preventScroll: true }));
}
let raceItemContext: {race:RaceCoordinator;owner:SeatId;generation:string;inventory:number}|undefined;
function openRaceItem(id:string):void {
  const current=race,owner=selectedSessionOwner();if(!current||!owner||!ownerMutationsAvailable()||(id!=='mud-splash'&&id!=='fog-lantern'))return;
  if(market.isOpen())market.close(false);
  const candidates=current.session.players.filter(p=>p!==owner&&current.items.plan(owner.seat,id,p.seat).ok);
  const context={race:current,owner:owner.seat,generation:current.generation,inventory:itemCharge(owner.seat)?.inventoryGeneration??-1};
  let target=id==='fog-lantern'?owner:candidates[0];
  let plan=current.items.plan(owner.seat,id,target?.seat);
  openLifecycleBoard(owner.seat,`Viewing ${owner.seat.toUpperCase()} · ${characterById(owner.characterId).name}`,id==='mud-splash'?(target?'Target a racer within 16 tiles':'No racer is in range.'):current.fogState(owner.seat).protectionUntil>current.elapsed?'Fog Lantern is already lit.':'Fog safe for 3 seconds','Back',id==='fog-lantern'?'Light lantern':`Use on ${target?.seat.toUpperCase()??'—'}`,false,true,()=>{
    if(raceItemContext!==context||race!==current||hudSelected!==owner.seat||!current.items.commit(plan)){const detail=lifecycleBoard?.querySelector<HTMLElement>('.survive-recovery-status');if(detail)detail.textContent=id==='mud-splash'?'Mud Splash needs an active racer within 16 tiles.':current.fogState(owner.seat).protectionUntil>current.elapsed?'Fog Lantern is already lit.':`${owner.seat.toUpperCase()} is protected.`;return false;}
    notify(id==='mud-splash'?`Mud Splash hit ${target!.seat.toUpperCase()}.`:'Fog Lantern · 3s');return true;
  });
  const board=lifecycleBoard!;board.dataset.raceTarget=id;board.setAttribute('aria-label',`Viewing ${owner.seat.toUpperCase()} · ${characterById(owner.characterId).name}`);
  const apply=board.querySelector<HTMLButtonElement>('.primary')!;apply.disabled=!plan.ok;
  if(id==='mud-splash'){
    const choices=document.createElement('div');choices.className='race-target-choices';choices.setAttribute('role','group');choices.setAttribute('aria-label','Target');
    for(const p of candidates){const b=document.createElement('button');b.type='button';b.textContent=`${p.marker} ${p.seat.toUpperCase()} · ${characterById(p.characterId).name} · ${p.groundY-owner.groundY>=0?'+':''}${(p.groundY-owner.groundY).toFixed(1)} tiles · ${p.health}/${p.maxHealth} feathers · ${raceFogLabel(current,p.seat)}`;b.setAttribute('aria-pressed',String(p===target));b.onclick=()=>{target=p;plan=current.items.plan(owner.seat,id,p.seat);for(const c of choices.children)c.setAttribute('aria-pressed',String(c===b));apply.textContent=`Use on ${p.seat.toUpperCase()}`;apply.disabled=!plan.ok;clearRelayInput();};choices.append(b);}
    board.insertBefore(choices,board.querySelector('.survive-recovery-actions'));queueMicrotask(()=>choices.querySelector('button')?.focus());
  }
  pageRaceTargets(board);raceItemContext=context;clearRelayInput();
}
function openDepartureBoard(seat: SeatId): void {
  if (relay) { relayAction('leave', seat); return; }
  if(race){
    if(!race.command(race.actionToken(seat),'leave'))return;
    const token=race.actionToken(seat);
    openLifecycleBoard(seat,`Leave Race as ${seat.toUpperCase()}?`,'Your race record stays in the results. This is not a death.','Keep racing','Leave Race',true,false,()=>{
      if(!race?.command(token,'confirm'))return false;
      router.release(seat);clearRelayInput();return true;
    });return;
  }
  const player = localSession?.players.find(candidate => candidate.seat === seat);
  if (!player || player.participation !== 'active') return;
  openLifecycleBoard(seat, `Leave as ${seat.toUpperCase()}?`, 'Your run ends, but this is not a death.', 'Keep playing', 'Leave run', true, false, () => {
    if (!localSession?.depart(seat)) return false;
    router.release(seat); notify(`${seat.toUpperCase()} left the run. A new controller can join the open seat.`); return true;
  });
}
function openRecoveryBoard(ownerSeat: SeatId, itemId?: 'revival' | 'flare'): void {
  const session = localSession, owner = session?.players.find(player => player.seat === ownerSeat);
  if (!session || !owner || owner.participation !== 'active') return;
  if (displayedRunState() === 'playing') { sessionPaused = true; game.pause(); accumulator = 0; audio.stop(); }
  if (recoveryBoard) discardRecoveryBoard();
  const initialCharge = itemCharge(ownerSeat);
  if (!initialCharge) return;
  const ownerContext = Object.freeze({ participantId: owner.participantId, ownerGeneration: initialCharge.ownerGeneration, inventoryGeneration: initialCharge.inventoryGeneration });
  const board = document.createElement('section'); board.id = 'survive-recovery-board'; board.className = 'survive-recovery-board'; board.setAttribute('role', 'dialog'); board.setAttribute('aria-modal', 'true'); board.setAttribute('aria-labelledby', 'survive-recovery-title');
  const title = document.createElement('h2'); title.id = 'survive-recovery-title';
  const prefix = document.createElement('span'); prefix.className = 'recovery-heading-prefix'; prefix.textContent = 'Viewing ';
  title.append(prefix, `${ownerSeat.toUpperCase()} · ${characterById(owner.characterId).name}`);
  const subjects = document.createElement('div'); subjects.className = 'survive-recovery-subjects';
  const subjectCard = (player: typeof owner, label: string): HTMLElement => {
    const card = document.createElement('div'); card.className = 'survive-recovery-subject';
    const image = document.createElement('img'); image.alt = ''; image.src = modelThumbnail(characterById(player.characterId).model);
    const copy = document.createElement('span'); copy.textContent = `${label} · ${player.seat.toUpperCase()} ${characterById(player.characterId).name}`;
    card.append(image, copy); return card;
  };
  subjects.append(subjectCard(owner, 'Owner'));
  const status = document.createElement('p'); status.className = 'survive-recovery-status'; status.setAttribute('aria-live', 'polite');
  const actions = document.createElement('div'); actions.className = 'survive-recovery-actions';
  const compactPager = document.createElement('div'); compactPager.className = 'survive-recovery-pager'; compactPager.setAttribute('aria-label', 'Recovery board pages');
  const back = document.createElement('button'); back.type = 'button'; back.textContent = 'Back to paused run'; back.dataset.compactLabel = 'Back'; back.setAttribute('aria-label', back.textContent); back.addEventListener('click', () => closeRecoveryBoard(false));
  const resume = document.createElement('button'); resume.type = 'button'; resume.className = 'recovery-resume'; resume.textContent = 'Resume run'; resume.addEventListener('click', () => closeRecoveryBoard(true));
  const choose = (kind: 'revival' | 'flare') => {
    actions.replaceChildren();
    const dead = session.players.filter(player => player.participation === 'dead' && player.state === 'dead');
    subjects.replaceChildren(subjectCard(owner, 'Owner'), ...dead.map(player => subjectCard(player, kind === 'revival' ? 'Target' : 'Returning')));
    [...subjects.children].forEach((subject, index) => subject.setAttribute('data-recovery-subject', String(index)));
    const heading = document.createElement('h3'); heading.textContent = kind === 'revival' ? 'Choose a teammate' : 'Bring the flock together?'; actions.append(heading);
    board.dataset.recoveryPage = kind;
    if (!dead.length) { status.textContent = kind === 'revival' ? 'No teammate can be revived right now.' : 'No teammate needs a flare right now.'; actions.append(back, resume); queueMicrotask(() => back.focus({ preventScroll: true })); return; }
    let target = dead[0]!;
    let targetDeathGeneration = target.recovery?.deathGeneration;
    let targetParticipantId = target.participantId;
    board.dataset.recoveryTarget = target.seat;
    let compactView: 'people' | 'actions' = 'actions';
    let compactSubject = 0;
    const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = '←'; previous.setAttribute('aria-label', 'Previous teammate');
    const page = document.createElement('button'); page.type = 'button';
    const next = document.createElement('button'); next.type = 'button'; next.textContent = '→'; next.setAttribute('aria-label', 'Next teammate');
    const syncCompact = () => {
      board.dataset.recoveryCompactView = compactView;
      board.dataset.recoveryCompactSubject = String(compactSubject);
      page.textContent = compactView === 'people' ? 'Actions' : 'People';
      previous.disabled = compactView === 'people' ? subjects.children.length < 2 : kind !== 'revival' || dead.length < 2;
      next.disabled = previous.disabled;
    };
    const selectTarget = (player: typeof target) => {
      target = player; targetDeathGeneration = player.recovery?.deathGeneration; targetParticipantId = player.participantId; board.dataset.recoveryTarget = player.seat;
      delete board.dataset.recoveryError; status.textContent = '';
      const apply = actions.querySelector<HTMLButtonElement>('.primary'); if (apply) apply.dataset.compactLabel = `Revive ${player.seat.toUpperCase()}`;
      for (const control of actions.querySelectorAll<HTMLButtonElement>('[data-target]')) control.setAttribute('aria-pressed', String(control.dataset.target === player.seat));
    };
    previous.addEventListener('click', () => {
      if (compactView === 'people') compactSubject = (compactSubject + subjects.children.length - 1) % subjects.children.length;
      else if (kind === 'revival') { const index = dead.indexOf(target); selectTarget(dead[(index + dead.length - 1) % dead.length]!); }
      syncCompact();
    });
    next.addEventListener('click', () => {
      if (compactView === 'people') compactSubject = (compactSubject + 1) % subjects.children.length;
      else if (kind === 'revival') { const index = dead.indexOf(target); selectTarget(dead[(index + 1) % dead.length]!); }
      syncCompact();
    });
    page.addEventListener('click', () => { compactView = compactView === 'people' ? 'actions' : 'people'; syncCompact(); });
    compactPager.replaceChildren(previous, page, next); syncCompact();
    if (kind === 'revival') for (const player of dead) {
      const option = document.createElement('button'); option.type = 'button'; option.textContent = `${player.seat.toUpperCase()} · ${characterById(player.characterId).name}`; option.setAttribute('aria-label', `Revive ${player.seat.toUpperCase()}`); option.dataset.target = player.seat; option.setAttribute('aria-pressed', String(player === target));
      option.addEventListener('click', () => selectTarget(player)); actions.append(option);
    } else { const affected = document.createElement('p'); affected.textContent = `Return ${dead.map(player => player.seat.toUpperCase()).join(', ')} and regroup the flock safely.`; actions.append(affected); }
    const commit = document.createElement('button'); commit.type = 'button'; commit.className = 'primary'; commit.textContent = kind === 'revival' ? 'Use Revival' : 'Use Flare';
    if (kind === 'revival') { commit.dataset.compactLabel = `Revive ${target.seat.toUpperCase()}`; commit.setAttribute('aria-label', commit.textContent); }
    commit.addEventListener('click', () => {
      const currentOwner = session.players.find(player => player.seat === ownerSeat), currentCharge = itemCharge(ownerSeat), currentTarget = session.players.find(player => player.seat === target.seat);
      if (!currentOwner || currentOwner.participantId !== ownerContext.participantId || !currentCharge || currentCharge.ownerGeneration !== ownerContext.ownerGeneration || currentCharge.inventoryGeneration !== ownerContext.inventoryGeneration || (kind === 'revival' && (currentTarget?.participantId !== targetParticipantId || currentTarget.participation !== 'dead' || currentTarget.recovery?.deathGeneration !== targetDeathGeneration))) { board.dataset.recoveryError = 'true'; status.textContent = kind === 'revival' ? `${target.seat.toUpperCase()} can’t return safely yet. Revival kept.` : 'The flock can’t regroup safely yet. Flare kept.'; return; }
      const ok = session.useConsumable({ actionId: `ui-recovery-${++recoveryActionId}`, ownerSeat, itemId: kind, targetSeat: kind === 'revival' ? target.seat : undefined, expectedInventoryGeneration: ownerContext.inventoryGeneration, expectedOwnerGeneration: ownerContext.ownerGeneration, expectedTargetDeathGeneration: kind === 'revival' ? targetDeathGeneration : undefined, expectedTargetParticipantId: kind === 'revival' ? targetParticipantId : undefined });
      status.textContent = ok ? kind === 'revival' ? `${ownerSeat.toUpperCase()} revived ${target.seat.toUpperCase()}.` : `${ownerSeat.toUpperCase()} used Flare — the flock regrouped.` : kind === 'revival' ? `${target.seat.toUpperCase()} can’t return safely yet. Revival kept.` : 'The flock can’t regroup safely yet. Flare kept.';
      if (ok) { notify(status.textContent); closeRecoveryBoard(false); } else { board.dataset.recoveryError = 'true'; updateHud(); }
    });
    actions.append(back, resume, commit); queueMicrotask(() => (kind === 'revival' ? actions.querySelector<HTMLButtonElement>('[data-target]') : back)?.focus({ preventScroll: true }));
  };
  if (itemId) choose(itemId); else {
    const revival = document.createElement('button'); revival.type = 'button'; revival.textContent = `Use Revival ×${initialCharge.revival}`; revival.disabled = !initialCharge.revival; revival.addEventListener('click', () => choose('revival'));
    const flare = document.createElement('button'); flare.type = 'button'; flare.textContent = `Use Flare ×${initialCharge.flare}`; flare.disabled = !initialCharge.flare; flare.addEventListener('click', () => choose('flare'));
    const leave = document.createElement('button'); leave.type = 'button'; leave.textContent = `Leave ${ownerSeat.toUpperCase()} run`; leave.addEventListener('click', () => openDepartureBoard(ownerSeat));
    board.dataset.recoveryPage = 'items'; actions.append(revival, flare, back, resume, leave); queueMicrotask(() => visibleModalControls(board)[0]?.focus({ preventScroll: true }));
  }
  board.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = visibleModalControls(board);
    if (!controls.length) return;
    const first = controls[0]!, last = controls.at(-1)!;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  board.append(title, subjects, status, actions, compactPager); el('app').append(board); recoveryBoard = board; recoveryBoardOwner = { seat: ownerSeat, ...ownerContext }; setRecoveryModalInert(board); updateHud();
}
function usePersonalRevive(seat: SeatId): void {
  const session = localSession; if (!session) return;
  const ok = session.recover({ kind: 'personal', ownerSeat: seat });
  notify(ok ? `${seat.toUpperCase()} returned Protected.` : `${seat.toUpperCase()}'s revive offer ended.`); updateHud();
}
let sessionHudRoster = '';
const controllerDevices = new Map<number, GamepadDevice>();
let sessionPaused = false;
let recoveryBoard: HTMLElement | undefined;
let lifecycleBoard: HTMLElement | undefined;
let lifecycleWasPlaying = false;
let pendingReclaim: { readonly device: GamepadDevice; readonly seat: SeatId } | undefined;
let recoveryActionId = 0;
let recoveryBoardOwner: { seat: SeatId; participantId: string; ownerGeneration: number; inventoryGeneration: number } | undefined;
let pointer: { x: number; y: number; id: number } | null = null;
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
const heardConsumableUses = new WeakSet<object>();
const spillAudio = new DeathSpillAudio(audio);
const sounds = createSoundSettings(audio, () => progress, (fields, save = true) => { fields.forEach(key => changedPreferences.add(key)); updateCallControl(); if (save) persist(); });
let lastCall = -Infinity, callShortcut = '', marketShortcut = '', controllerConnected = false, localFocus = true, restoreModalFocus = true;
let tinyReturnFocus: HTMLElement | undefined;
// Responsive CSS can blur a hidden control before ResizeObserver runs.
// Keep its identity from focusin so the supported frame can restore it.
let lastAppFocus: HTMLElement | undefined;
el('app').addEventListener('focusin', event => {
  if (event.target instanceof HTMLElement && event.target !== el('app')) lastAppFocus = event.target;
});
let tinyReturnMarket = false;
let wasTiny = false;
function canRestoreTinyFocus(candidate: HTMLElement | undefined): candidate is HTMLElement {
  if (!candidate?.isConnected || !candidate.getClientRects().length) return false;
  for (let node: HTMLElement | null = candidate; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (node.inert || node.hidden || style.display === 'none' || style.visibility === 'hidden') return false;
  }
  return true;
}
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
  getGear:()=>race?race.items.catalogue.map(item=>({id:item.id,name:item.name,quantity:itemCharge(hudSelected)?.[item.id]??0})):undefined,
  openGear:()=>market.openForSelected(),
  onUseGear:id=>openRaceItem(id),
  getRun: selectedOwnerRun,
  getOwnerKey: selectedOwnerKey,
  getOwnerLabel: selectedOwnerLabel,
  selectNextOwner: selectNextHudOwner,
  canSell: () => ownerMutationsAvailable() && selectedOwnerRun().alive && !disposed && !document.hidden && localFocus,
  unavailableReason: ownerMutationReason,
  sell: cardId => localSession?.running ? coOpMarketTransaction({ kind: 'sell', cardId }) : selectedOwnerRun().sell(cardId),
  getItems: () => {
    const charge = itemCharge(hudSelected);
    return charge ? { revival: charge.revival, flare: charge.flare } : relay ? { revival: 0, flare: 0 } : undefined;
  },
  canUseItems: () => ownerMutationsAvailable() && !disposed && !document.hidden && localFocus,
  itemUnavailableReason: ownerMutationReason,
  onUseItem: itemId => openRecoveryBoard(hudSelected, itemId),
  onOpenChange: open => {
    // A hand opened outside an already-visible market starts a separate
    // transaction. A hand sale within an open pack keeps that pack context.
    if (open && localSession?.running && !market.isOpen()) {
      const owner = selectedSessionOwner();
      coOpMarketContext = owner ? localSession.openCoOpMarket({ seat: owner.seat, device: owner.device, participantId: owner.participantId }) : undefined;
    }
    if (open && game.state === 'playing') { handPausedPlay = true; audio.stop(); game.pause(); }
    else if (!open) {
      const resume = handPausedPlay && !disposed && !document.hidden && localFocus && innerWidth >= 240 && innerHeight >= 240 && el('drawer').hidden && !market.isOpen() && !selectedOwnerRun().pendingPack;
      handPausedPlay = false;
      if (resume) {
        game.resume();
        queueMicrotask(() => {
          if (!disposed && game.state === 'playing' && !hand.isOpen() && el('drawer').hidden && !market.isOpen()) el('scene').focus({ preventScroll: true });
        });
      }
    }
    updateHud();
  },
  onSell: result => { if (result.ok) game.syncEffects(); updateHud(); },
});
const pauseUI = createPauseUI();
const runMenuUI = createRunMenuUI();
const surviveResultsRoot = document.createElement('section'); surviveResultsRoot.id = 'survive-results-root'; el('app').append(surviveResultsRoot);
const surviveResults = createSurviveResultsBoard(surviveResultsRoot, { onAgain: () => reset() });
const raceEdges=document.createElement('aside');raceEdges.id='race-edge-markers';raceEdges.setAttribute('aria-label','Offscreen racers');el('app').append(raceEdges);
const raceResults = createRaceResultsBoard(surviveResultsRoot, () => reset());
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
  getGear:()=>race?race.items.catalogue.map(item=>({id:item.id,name:item.name,icon:item.id==='mud-splash'?'●':'◈',color:item.appearance?.color??'#e8b75b',description:item.id==='mud-splash'?'Target a racer within 16 tiles':'Fog safe for 3 seconds'})):undefined,
  getRun: selectedOwnerRun,
  getCharacter: selectedOwnerCharacter,
  getOwner: sharedOwner,
  getOwnerLabel: selectedOwnerLabel,
  getOwners: sharedOwners,
  getOwnerKey: selectedOwnerKey,
  selectOwner: selectHudOwner,
  selectNextOwner: selectNextHudOwner,
  canMutate: ownerMutationsAvailable,
  unavailableReason: ownerMutationReason,
  getCoOpContext: () => coOpMarketContext,
  transaction: request => {
    if (localSession?.running) return coOpMarketTransaction(request);
    const run = selectedOwnerRun();
    if (request.kind === 'buy') return run.buy(request.offerId ?? '');
    if (request.kind === 'sell') return run.sell(request.cardId ?? '');
    if (request.kind === 'claim-pack') return run.claimPack(request.ids ?? [], request.discardIds ?? []);
    if (request.kind === 'skip-pack') return run.skipPack();
    if (request.kind === 'equip') return run.equipCosmetic(request.itemId ?? '');
    return { ok: false, message: 'That market action is unavailable.' };
  },
  canOpen: () => !relayHandoff && !localStage && !disposed && !(import.meta.env.DEV && devTools?.isOpen) && !document.hidden && localFocus && innerWidth >= 240 && innerHeight >= 240 && el('drawer').hidden && (localSession?.running || game.state === 'playing' || (game.state === 'paused' && !!selectedOwnerRun().pendingPack)) && (localSession?.running || !!selectedOwnerRun().market),
  open: () => {
    if (localSession?.running) {
      coOpMarketTransaction({ kind: 'open' });
      // A lost-controller owner still has a read-only table. This presentation
      // deliberately has no transaction context, so every mutation remains
      // rejected until that seat explicitly reclaims its controller.
      sessionPaused = true; game.pause(); handPausedPlay = false; hand.close(); audio.stop(); return true;
    }
    if (!game.openMarket()) return false; handPausedPlay = false; hand.close(); audio.stop(); return true;
  },
  close: resume => {
    const allowed = resume && !disposed && !document.hidden && localFocus && innerWidth >= 240 && innerHeight >= 240;
    if (localSession?.running) {
      const resumeUnavailableOwner = !selectedOwnerRun().alive && !disposed && !document.hidden && localFocus && innerWidth >= 240 && innerHeight >= 240;
      coOpMarketTransaction({ kind: 'close' }); if (allowed || resumeUnavailableOwner) { sessionPaused = false; game.resume(); audio.unlock(); }
      return;
    }
    game.closeMarket(allowed); if (allowed) audio.unlock();
  },
  canRestoreFocus: () => restoreModalFocus && !disposed && !document.hidden && localFocus && innerWidth >= 240 && innerHeight >= 240,
  shortcut: () => controllerConnected ? 'LB' : marketShortcut || 'tap',
  getReducedMotion: () => progress.reduced || mediaQuery.matches,
  changed: updateHud,
});
const router: GamepadRouter = new GamepadRouter({
  context: () => `${race?.generation ?? 0}:${relay ? `relay:${relay.snapshot().phase}:${relay.snapshot().revision}:` : ''}${recoveryBoard ? `recovery:${recoveryBoardOwner?.seat ?? ''}:${recoveryBoard.dataset.recoveryPage ?? ''}` : lifecycleBoard ? `lifecycle:${lifecycleBoard.dataset.lifecycleOwner ?? ''}` : hudDetailsOpen ? `hud:${hudSelected}:${el('session-seats').querySelector<HTMLElement>(`[data-seat="${hudSelected}"]`)?.dataset.sessionHudPage ?? ''}` : !surviveResultsRoot.hidden ? 'survive-results' : localStage ? 'setup' : localSession ? sessionPaused ? 'session-paused' : 'session' : 'solo'}:${game.state}:${hand.isOpen() ? 'hand' : market.isOpen() ? 'market' : el('drawer').hidden ? `run:${el('app').dataset.runMenuPage ?? el('app').dataset.pausePage ?? ''}` : `collection:${el('drawer').dataset.collectionTab}:${el('drawer').dataset.collectionView}`}`,
  dispatch: ({ seat, direction }) => {
    if (relayHandoff) { relayDirection(seat, direction); return true; }
    if (localSession && !(market.isOpen() || hand.isOpen() || hand.containsFocus() ? localSession.canTransact(seat) : localSession.canAct(seat))) return false;
    if (recoveryBoard) {
      if (seat !== recoveryBoardOwner?.seat) return false;
      navigateModalControls(recoveryBoard, direction); return true;
    }
    if (lifecycleBoard) {
      if (seat !== lifecycleBoard.dataset.lifecycleOwner) return false;
      navigateModalControls(lifecycleBoard, direction); return true;
    }
    if (hudDetailsOpen) {
      if (seat !== hudSelected) return false;
      const tile = el('session-seats').querySelector<HTMLElement>(`[data-seat="${hudSelected}"]`);
      if (tile) navigateModalControls(tile, direction);
      return true;
    }
    if (!surviveResultsRoot.hidden) { navigateModalControls(surviveResultsRoot, direction); return true; }
    if (hand.isOpen() || hand.containsFocus()) {
      if (seat !== hudSelected) return false;
      hand.navigate(direction); return true;
    }
    if (market.isOpen()) {
      if (seat !== hudSelected) return false;
      market.navigate(direction); return true;
    }
    if (localSession?.running) { moveSessionCharacter(seat, direction); return true; }
    if (seat === 'p1') { move(direction); return true; }
    return false;
  },
  action: (seat, action) => {
    if (relayHandoff) { if (action === 'confirm') relayConfirmControl(seat); else if (action === 'back') relayAction('cancel', seat); return; }
    if (relay && action === 'menu') { relayAction('leave', seat); return; }
    if (race && action === 'menu' && !lifecycleBoard) { openDepartureBoard(seat); return; }
    if (localSession && !(market.isOpen() || hand.isOpen() || hand.containsFocus() ? localSession.canTransact(seat) : localSession.canAct(seat))) return;
    if (recoveryBoard) {
      if (seat !== recoveryBoardOwner?.seat) return;
      if (action === 'confirm') confirmModal(recoveryBoard);
      else if (action === 'back') closeRecoveryBoard(false);
      else if (action === 'pause') return;
      return;
    }
    if (lifecycleBoard) {
      if (seat !== lifecycleBoard.dataset.lifecycleOwner) return;
      if (action === 'confirm') confirmModal(lifecycleBoard);
      else if (action === 'back') closeLifecycleBoard();
      return;
    }
    if (hudDetailsOpen) {
      if (seat !== hudSelected) return;
      const tile = el('session-seats').querySelector<HTMLElement>(`[data-seat="${hudSelected}"]`);
      if (action === 'confirm' && tile) confirmModal(tile);
      else if (action === 'back' || action === 'pause') { closeHudInspection(); updateHud(); }
      return;
    }
    if (!surviveResultsRoot.hidden) {
      if (action === 'confirm') confirmModal(surviveResultsRoot);
      else if (action === 'back') navigateModalControls(surviveResultsRoot, 'back');
      return;
    }
    // A shoulder market action intentionally changes the displayed owner; the
    // rest of a visible interaction remains bound to its captured owner.
    if ((hand.isOpen() || hand.containsFocus() || market.isOpen()) && seat !== hudSelected && action !== 'market') return;
    if (action === 'call') { localSession?.running ? callSessionCharacter(seat) : callCharacter(); return; }
    if (action === 'confirm') {
      // Shared Local Play deliberately hides the solo pause panel. A fresh
      // assigned-controller confirm still resumes that paused shared course.
      if (localSession?.running && displayedRunState() === 'paused' && !hand.isOpen() && !market.isOpen() && el('drawer').hidden) { play(); return; }
      if (displayedRunState() !== 'playing' || localStage || hand.isOpen() || market.isOpen() || !el('drawer').hidden) { confirmMenu(); return; }
      if (localSession?.running) moveSessionCharacter(seat, 'forward'); else move('forward');
      return;
    }
    if (action === 'pause') { togglePause(); return; }
    if (action === 'back') { backMenu(); return; }
    if (action === 'menu') { el('drawer').hidden ? openDrawer() : closeDrawer(); return; }
    if (action === 'market') {
      if (localSession?.running) { selectHudOwner(seat); updateHud(); return; }
      market.toggle();
    }
  },
  acceptsDevice: () => !localSession || localStage !== undefined || setupDraft.length < 4,
  replacementSeat: () => race?.session.players.find(p=>race!.status(p.seat)==='disconnected-grace')?.seat,
  requestFirstPlayer: (device): boolean => {
    if (soloGamepad || localStage || localSession || game.state === 'dead') return false;
    soloGamepad = device;
    return router.assign(device, 'p1', true);
  },
  requestLocalPlay: device => requestControllerSeat(device),
  requestReclaim: (device, seat, input) => reclaimControllerSeat(device, seat, input),
  lifecycle: event => handleControllerLifecycle(event),
  onFrameSafetyLost: suspendPlay,
});
let gamepad: ReturnType<typeof createGamepadControls>;
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
  if (localStage || (localSession && sessionPaused) || disposed || !localFocus || document.hidden || market.isOpen() || !el('drawer').hidden || progress.muted || innerWidth < 240 || innerHeight < 240 || (game.state !== 'ready' && game.state !== 'playing')) return;
  const now = performance.now(); if (now - lastCall < 450) return;
  audio.unlock(); audio.play(characterById(progress.selected).call); lastCall = now;
}
/** Session calls deliberately resolve the assigned seat, never saved solo choice. */
function callSessionCharacter(seat: SeatId): void {
  if (localSession && !(market.isOpen() || hand.isOpen() || hand.containsFocus() ? localSession.canTransact(seat) : localSession.canAct(seat))) return;
  if (import.meta.env.DEV && devTools?.isOpen) return;
  if (!localSession?.running || localStage || sessionPaused || disposed || !localFocus || document.hidden || market.isOpen() || !el('drawer').hidden || progress.muted || innerWidth < 240 || innerHeight < 240 || displayedRunState() !== 'playing') return;
  const player = localSession.players.find(candidate => candidate.seat === seat);
  if (!player || player.state !== 'playing') return;
  const now = performance.now(), last = sessionCalls.get(seat) ?? -Infinity;
  if (now - last < 450) return;
  audio.unlock(); audio.play(characterById(player.characterId).call); sessionCalls.set(seat, now);
}
function moveSessionCharacter(seat: SeatId, direction: Direction): void {
  if (relayHandoff) { relayDirection(seat, direction); return; }
  if (localSession && !(market.isOpen() || hand.isOpen() || hand.containsFocus() ? localSession.canTransact(seat) : localSession.canAct(seat))) return;
  if (recoveryBoard) { if (seat === recoveryBoardOwner?.seat) navigateModalControls(recoveryBoard, direction); return; }
  if (lifecycleBoard) { if (seat === lifecycleBoard.dataset.lifecycleOwner) navigateModalControls(lifecycleBoard, direction); return; }
  if (!surviveResultsRoot.hidden) { navigateModalControls(surviveResultsRoot, direction); return; }
  if (hand.isOpen() || hand.containsFocus()) { if (seat === hudSelected) hand.navigate(direction); return; }
  if (market.isOpen()) { if (seat === hudSelected) market.navigate(direction); return; }
  if (!frameAvailable() || !localSession?.running || localStage || hand.isOpen() || hand.containsFocus() || market.isOpen() || !el('drawer').hidden || displayedRunState() !== 'playing') return;
  audio.unlock(); if (localSession.dispatch({ seat, direction })) audio.play('hop'); updateHud();
}
function visibleModalControls(root: HTMLElement): HTMLButtonElement[] {
  return [...root.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')].filter(button => button.getClientRects().length > 0);
}
function navigateModalControls(root: HTMLElement, direction: Direction): void {
  const controls = visibleModalControls(root);
  if (!controls.length) return;
  const current = controls.indexOf(document.activeElement as HTMLButtonElement);
  const delta = direction === 'left' || direction === 'back' ? -1 : 1;
  controls[(current + delta + controls.length) % controls.length]!.focus({ preventScroll: true });
}
function confirmModal(root: HTMLElement): void {
  const controls = visibleModalControls(root);
  const focused = document.activeElement;
  if (focused instanceof HTMLButtonElement && root.contains(focused) && !focused.disabled) focused.click();
  else controls[0]?.focus({ preventScroll: true });
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
  onRendered: () => renderModeChoices(),
});
const relaySetup = createRelaySetup({ root: el('local-session-setup'), seats: () => setupDraft, active: () => stagingRelay,
  choose: () => { stagingRelay = true; stagingRace = false; renderSetup(); router.seedAll(); },
  reorder: (seat, offset) => { const index = setupDraft.findIndex(candidate => candidate.seat === seat), next = index + offset; if (index < 0 || next < 0 || next >= setupDraft.length) return; [setupDraft[index], setupDraft[next]] = [setupDraft[next]!, setupDraft[index]!]; renderSetup(); },
});
const raceSetup = createRaceSetup({ root: el('local-session-setup'), seats: () => setupDraft, active: () => stagingRace,
  choose: () => { stagingRace = true; stagingRelay = false; renderSetup(); router.seedAll(); },
});
function renderModeChoices(): void {
  const available = !stagingSurviveTogether && !stagedLiveJoin && game.state === 'ready';
  relaySetup.render(available && !stagingRace);
  raceSetup.render(available && !stagingRelay);
}
function clearRelayInput(): void { router.seedAll(); keyboardInput?.suspend(); keyboardInput?.resume([...observedNativeKeys]); pointer = null; accumulator = 0; }
function confirmRelay(seat: SeatId, captured?: RelayConfirmation): void {
  if (!relayHandoff || !relay || !frameAvailable()) return;
  const player = relay.session.players.find(candidate => candidate.seat === seat);
  if (!player || !relay.confirm({ ...(captured ?? relay.confirmation()), seat, device: player.device })) return;
  sessionPaused = false;
  relayHandoff.remove(); relayHandoff = undefined; document.querySelector<HTMLElement>('.game-surface')!.inert = false; selectHudOwner(seat); clearRelayInput(); updateHud(); el('scene').focus({ preventScroll: true });
}
function relayAction(kind: string, actor: SeatId, captured?: RelayActionToken): void {
  if (!relay || !frameAvailable()) return;
  const token = relay.actionToken(actor);
  if (captured && (captured.participantId !== token.participantId || captured.generation !== token.generation || captured.lifecycleGeneration !== token.lifecycleGeneration)) return;
  if (kind === 'restart') { reset(); return; }
  if (kind === 'leave' && hudDetailsOpen) closeHudInspection();
  if (kind === 'revive') relay.session.recover({ kind: 'personal', ownerSeat: actor });
  else if (kind === 'decline') relay.session.declineRecovery(actor);
  else if (kind === 'skip' || kind === 'leave' || kind === 'cancel' || kind === 'confirm') relay.command({ ...(captured ?? relay.actionToken(actor)), kind });
  syncRelayHandoff(); updateHud();
}
function relayConfirmControl(seat: SeatId): void {
  if (!relay || !relayHandoff || !frameAvailable()) return;
  const focused = document.activeElement;
  const control = focused instanceof HTMLButtonElement && relayHandoff.contains(focused) ? focused : relayHandoff.querySelector<HTMLButtonElement>('button');
  if (!control) return;
  if (relay.snapshot().phase === 'handoff') {
    const state = relay.snapshot();
    if (!state.connections[seat]) return;
    // Start keeps the rendered confirmation ticket; read-only controls never
    // become an implicit transfer merely because a participant confirms them.
    if (control.dataset.relayAction !== 'start' || seat === state.incomingSeat) control.click();
    return;
  }
  if (relay.snapshot().phase === 'ended') { control.click(); return; }
  const kind = control.dataset.relayAction;
  if (kind === 'skip' || kind === 'leave') relayAction(kind, seat);
  else if (control.dataset.actor === seat && kind) relayAction(kind, seat);
}
function relayDirection(seat: SeatId, direction: Direction): void {
  if (!relay || !relayHandoff) return;
  if (relay.snapshot().phase === 'handoff') {
    if (!frameAvailable()) return;
    if (direction === 'forward') confirmRelay(seat);
    else if (relay.snapshot().connections[seat]) navigateModalControls(relayHandoff, direction);
    return;
  }
  if (direction === 'forward') relayConfirmControl(seat);
  else if (relay.snapshot().phase === 'ended' || relayHandoff.dataset.actor === seat || relay.snapshot().activeSeat === seat) navigateModalControls(relayHandoff, direction);
}
function syncRelayHandoff(): void {
  if (!relay || lifecycleBoard) return;
  // A paused primary facade can change the prospective next eligible seat.
  // Only a real handoff owns that identity; opening an owner modal is not a turn change.
  const state = relay.snapshot(), key = `${state.phase}:${state.revision}:${state.phase === 'handoff' ? state.incomingSeat : ''}:${relay.session.lifecycle.length}`;
  if (key === relayBoardKey) return;
  const marketWasOpen = market.invalidateOwner(); const handWasOpen = hand.isOpen(); hand.invalidateOwner(); coOpMarketContext = undefined;
  tinyReturnFocus = undefined; lastAppFocus = undefined;
  if (marketWasOpen || handWasOpen) { sessionPaused = false; handPausedPlay = false; game.resume(); }
  if (relayRenderedOwner !== state.activeSeat) { relayRenderedOwner = state.activeSeat; selectHudOwner(state.activeSeat); }
  relayBoardKey = key; disposeRelayResults?.(); disposeRelayResults = undefined; relayHandoff?.remove(); relayHandoff = undefined;
  document.querySelector<HTMLElement>('.game-surface')!.inert = state.phase !== 'running';
  clearRelayInput();
  if (state.phase === 'running') { el('scene').focus({ preventScroll: true }); return; }
  if (state.phase === 'handoff') {
    const confirmation = relay.confirmation();
    relayHandoff = createRelayHandoff(el('app'), relay, () => confirmRelay(confirmation.seat, confirmation));
  } else if (state.phase === 'ended' && relay.result) {
    const view = createRelayResults(el('app'), relay.result, reset); relayHandoff = view.element; disposeRelayResults = view.dispose;
  } else relayHandoff = createRelayLifecycle(el('app'), relay, relayAction);
}
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
  raceResults.hide(); race = undefined; stagingRace = false;
  surviveResults.hide();
  deactivateNativeKeyboard(); sessionCalls.clear();
  const restoreController = soloGamepad;
  for (const player of localSession?.players ?? []) router.release(player.seat);
  for (const seat of setupDraft) if (seat.device?.startsWith('gamepad-')) router.release(seat.seat);
  localSession?.stop(); localSession = undefined; localStage?.cancel(); localStage = undefined; setupDraft = []; sessionPaused = false;
  disposeRelayResults?.(); disposeRelayResults = undefined;
  relay = undefined; relayBoardKey = ''; relayRenderedOwner = undefined; stagingRelay = false; relayHandoff?.remove(); relayHandoff = undefined;
  document.querySelector<HTMLElement>('.game-surface')!.inert = false; document.getElementById('relay-announcement')?.remove();
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
    audio.stop(); audio.play(game.deathCause === 'fog' ? 'death.trail' : `death.${game.deathCause ?? 'traffic'}`);
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
  if (localSession.result) return 'dead';
  if (sessionPaused || game.state === 'paused') return 'paused';
  return localSession.players.some(player => player.state === 'playing') ? 'playing' : 'dead';
}
function hasPendingRecoveryOffer(): boolean {
  return !!localSession?.players.some(player => player.participation === 'dead' && player.state === 'dead' && !!player.recovery?.offer);
}
function updateHud(): void {
  if(raceItemContext&&(race!==raceItemContext.race||hudSelected!==raceItemContext.owner||race.generation!==raceItemContext.generation||itemCharge(raceItemContext.owner)?.inventoryGeneration!==raceItemContext.inventory)){closeLifecycleBoard();}
  const raceGeneration=race?.generation??'';
  if(raceGeneration!==raceInputGeneration){raceInputGeneration=raceGeneration;clearRelayInput();}
  const terminalResult = localSession?.result;
  if (race?.result) raceResults.show(race.result);
  else if (terminalResult?.mode === 'survive-together') surviveResults.show(terminalResult as SurviveTogetherResult, game.seedCode);
  else surviveResults.hide();
  if (recoveryBoardOwner) {
    const owner = localSession?.players.find(player => player.seat === recoveryBoardOwner!.seat), charge = owner && itemCharge(owner.seat);
    if (!owner || owner.participation !== 'active' || owner.participantId !== recoveryBoardOwner.participantId || !charge || charge.ownerGeneration !== recoveryBoardOwner.ownerGeneration || charge.inventoryGeneration !== recoveryBoardOwner.inventoryGeneration) {
      const page = recoveryBoard?.dataset.recoveryPage, target = recoveryBoard?.dataset.recoveryTarget;
      discardRecoveryBoard(page === 'revival' && target ? `${target.toUpperCase()} can’t return safely yet. Revival kept.` : page === 'flare' ? 'The flock can’t regroup safely yet. Flare kept.' : 'Recovery choice changed. Choose again.');
    }
  }
  const seats = el('session-seats');
  seats.hidden = !localSession?.running || terminalResult?.mode === 'survive-together';
  if (localSession?.running) {
    const roster = localSession.players.map(player => `${player.seat}:${player.characterId}:${player.device}`).join('|');
    if (roster !== sessionHudRoster) {
      const focusSeat = document.activeElement instanceof HTMLElement && seats.contains(document.activeElement) ? document.activeElement.closest<HTMLElement>('[data-seat]')?.dataset.seat : undefined;
      sessionHudRoster = roster;
      seats.replaceChildren(...localSession.players.map(player => {
        const tile = document.createElement('article'); tile.className = 'session-hud-tile'; tile.dataset.seat = player.seat;
        const identity = document.createElement('button'); identity.type = 'button'; identity.className = 'session-hud-identity'; identity.dataset.sessionHud = 'identity';
        identity.addEventListener('click', () => {
          if (innerHeight <= 319 && hudSelected === player.seat) {
            if (hudDetailsOpen) closeHudInspection();
            else { hudInspectWasPlaying = displayedRunState() === 'playing'; hudDetailsOpen = true; hudDetailsPage = 0; if (hudInspectWasPlaying) { sessionPaused = true; game.pause(); } }
          } else { if (hudDetailsOpen) closeHudInspection(); selectHudOwner(player.seat); }
          updateHud();
        });
        const details = document.createElement('div'); details.className = 'session-hud-details';
        for (const field of ['device', 'health', 'power', 'wallet', 'revive', 'item', 'lifecycle'] as const) {
          const value = field === 'revive' || field === 'item' ? document.createElement('button') : document.createElement('span');
          value.dataset.sessionHud = field; if (value instanceof HTMLButtonElement) { value.type = 'button'; value.className = 'session-future'; }
          if (field === 'revive') value.addEventListener('click', () => usePersonalRevive(player.seat));
          if (field === 'item') value.addEventListener('click', () => relay || race ? openDepartureBoard(player.seat) : openRecoveryBoard(player.seat));
          details.append(value);
        }
        const pager = document.createElement('div'); pager.className = 'session-hud-pager'; pager.dataset.sessionHudPager = 'true';
        const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = 'Previous details'; previous.setAttribute('aria-label', 'Previous details'); previous.addEventListener('click', () => { hudDetailsPage = (hudDetailsPage + 3) % 4; updateHud(); });
        const label = document.createElement('span'); label.dataset.sessionHudPageLabel = 'true';
        const next = document.createElement('button'); next.type = 'button'; next.textContent = 'Next details'; next.setAttribute('aria-label', 'Next details'); next.addEventListener('click', () => { hudDetailsPage = (hudDetailsPage + 1) % 4; updateHud(); });
        pager.append(previous, label, next);
        const close = document.createElement('button'); close.type = 'button'; close.className = 'session-hud-close'; close.dataset.sessionHudClose = 'true'; close.textContent = 'Close details'; close.addEventListener('click', () => { closeHudInspection(); updateHud(); queueMicrotask(() => identity.focus({ preventScroll: true })); }); details.append(pager, close);
        tile.append(identity, details); return tile;
      }));
      if (focusSeat) queueMicrotask(() => seats.querySelector<HTMLButtonElement>(`[data-seat="${focusSeat}"] .session-hud-identity`)?.focus({ preventScroll: true }));
    }
    for (const player of localSession.players) {
      const character = characterById(player.characterId), tile = seats.querySelector<HTMLElement>(`[data-seat="${player.seat}"]`)!;
      tile.classList.toggle('session-hud-selected', hudSelected === player.seat);
      tile.dataset.sessionHudPage = String(hudDetailsPage);
      const identity = tile.querySelector<HTMLButtonElement>('[data-session-hud="identity"]')!;
      const compactHud = innerWidth <= 479 || innerHeight <= 419;
      identity.textContent = compactHud ? `${player.seat.toUpperCase()} ${seatMarker(player.seat)}` : `${player.seat.toUpperCase()} ${seatMarker(player.seat)} · ${character.name}`;
      identity.setAttribute('aria-label', `${player.seat.toUpperCase()} ${seatMarker(player.seat)} ${character.name}, ${player.device}, ${player.health} of ${player.maxHealth} feathers`);
      const inspectable = innerHeight <= 319 && hudSelected === player.seat;
      identity.setAttribute('aria-pressed', String(inspectable && hudDetailsOpen));
      identity.title = inspectable && hudDetailsOpen ? `Close ${player.seat.toUpperCase()} details` : `Show ${player.seat.toUpperCase()} details`;
      const compactDevice = player.device.replace(/^gamepad-(\d+)$/, (_match, index: string) => `Pad ${Number(index) + 1}`);
      tile.querySelector<HTMLElement>('[data-session-hud="device"]')!.textContent = player.participation === 'device-lost' ? 'Waiting to reclaim' : compactHud ? `${character.name} · ${compactDevice}` : player.device;
      tile.querySelector<HTMLElement>('[data-session-hud="health"]')!.textContent = compactHud ? `${player.health}/${player.maxHealth} feathers · ${player.statistics.distance} tiles` : `${player.health} / ${player.maxHealth} feathers · ${player.statistics.distance} tiles`;
      tile.querySelector<HTMLElement>('[data-session-hud="power"]')!.textContent = `Power: ${player.power.name} · ${player.powerReady ? 'Ready' : `${player.powerRemaining} / 100 tiles`}`;
      tile.querySelector<HTMLElement>('[data-session-hud="wallet"]')!.textContent = `${player.run.wallet} coins · ${player.run.cards.length} cards`;
      const revival = tile.querySelector<HTMLButtonElement>('[data-session-hud="revive"]')!;
      const seconds = Math.max(0, Math.ceil(((player.recovery?.offer?.deadline ?? localSession.world.time) - localSession.world.time) / localSession.world.rules.simulation.worldTimeScale));
      revival.textContent = player.participation === 'dead' && player.recovery?.offer ? `Use personal revive · ${seconds}s` : personalProgress(player);
      revival.disabled = !(player.participation === 'dead' && player.recovery?.offer);
      const charge = itemCharge(player.seat), items = tile.querySelector<HTMLButtonElement>('[data-session-hud="item"]')!;
      items.textContent = `Items: ${charge && (charge.revival || charge.flare) ? `${charge.revival ? `Revival ×${charge.revival}` : ''}${charge.revival && charge.flare ? ' · ' : ''}${charge.flare ? `Flare ×${charge.flare}` : ''}` : '—'}`;
      if (relay) items.textContent = 'Leave Relay';
      items.disabled = player.participation !== 'active';
      tile.querySelector<HTMLElement>('[data-session-hud="lifecycle"]')!.textContent = lifecycleLabel(player);
      tile.querySelector<HTMLElement>('[data-session-hud-page-label]')!.textContent = `${hudDetailsPage === 0 ? 'Status' : hudDetailsPage === 1 ? 'Run' : hudDetailsPage === 2 ? 'Recovery' : 'Items'} ${hudDetailsPage + 1} of 4`;
    }
    seats.dataset.sessionHudInspect = String(hudDetailsOpen);
    if (relay) renderRelayHud(seats, relay);
    else { delete seats.dataset.relayHud; seats.removeAttribute('aria-live'); seats.querySelector('.relay-distance')?.remove(); }
    if (race) renderRaceHud(seats, race);
    else seats.querySelectorAll('.race-distance, .race-lifecycle').forEach(node=>node.remove());
  } else if (sessionHudRoster) { sessionHudRoster = ''; seats.replaceChildren(); }
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
  const ownerRun = selectedOwnerRun();
  const ownerCharge = itemCharge(hudSelected);
  hand.update({ visible: !terminalResult && !localStage && ownerRun.alive && (state === 'playing' || state === 'paused') && (!!relay || !!race || ownerRun.cards.length > 0 || ownerRun.isOpen || Boolean(ownerCharge?.revival || ownerCharge?.flare)) && !(import.meta.env.DEV && devTools?.isOpen), reduced: progress.reduced || mediaQuery.matches });
  seedUI.update(state === 'dead' && !presentingDeathSpill() ? game.seedCode : null);
  el<HTMLButtonElement>('character-call').disabled = progress.muted || (state !== 'ready' && state !== 'playing');
  const viewState = `${state}:${Boolean(selectedOwnerRun().pendingPack)}:${Boolean(localStage)}:${Boolean(localSession)}`;
  if (viewState !== previousState) {
    if (state === 'paused') audio.stop();
    previousState = viewState;
    el('app').dataset.runState = state;
    el('run-panel').hidden = state === 'playing';
    el('ready-content').hidden = state !== 'ready'; el('result-content').hidden = state !== 'dead'; el('pause-content').hidden = state !== 'paused' || !!localStage;
    el('play').innerHTML = `${state === 'dead' ? 'Hop again' : state === 'paused' ? selectedOwnerRun().pendingPack ? 'Choose cards' : 'Keep hopping' : 'Let’s hop'} <span aria-hidden="true">↗</span>`;
    el('play').hidden = !!localStage; el('choose').hidden = !!localStage;
    el('local-play').hidden = !!localStage || !!localSession || state === 'dead';
    el('mode').hidden = state === 'paused' || !!localSession; el('goal').hidden = state !== 'ready';
    el<HTMLButtonElement>('collection').disabled = !!localStage;
    const pause = el<HTMLButtonElement>('pause'); pause.textContent = state === 'paused' ? '▷' : 'Ⅱ'; pause.setAttribute('aria-label', state === 'paused' ? 'Resume game' : 'Pause game'); pause.title = state === 'paused' ? 'Resume game' : 'Pause game'; pause.disabled = state === 'ready' || (state === 'dead' && !hasPendingRecoveryOffer());
    el('hint').textContent = state === 'playing' ? controllerConnected ? 'Stick / D-pad · A hop · X call · Start pause' : 'Tap ↑ · Swipe to dodge' : state === 'paused' ? 'Paused · take your time' : state === 'dead' ? 'Every run is a new path' : 'Tap anywhere to begin';
  }
  // HUD inspection is its own modal: do not leave the normal paused board in
  // the accessibility tree behind the compact details sheet.
  // A shared session owns the visible scene/HUD through a board pause. Do not
  // cover those owner-attributed controls with the solo pause panel after a
  // tiny-frame resize or a controller board action.
  el('run-panel').hidden = hudDetailsOpen || (!localStage && !!localSession?.running) || state === 'playing' || presentingDeathSpill() || market.isOpen() || !el('drawer').hidden || (hand.isOpen() && handPausedPlay);
  el('app').dataset.modalOpen = String((hudDetailsOpen || !el('run-panel').hidden || !el('drawer').hidden || hand.isOpen()) && !(import.meta.env.DEV && devTools?.isOpen));
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
  if (localStage || !el('drawer').hidden || market.isOpen() || !frameAvailable()) return;
  if (!localSession?.running && presentingDeathSpill()) return;
  if (selectedOwnerRun().pendingPack) { market.toggle(); return; }
  audio.unlock();
  if (localSession?.running && (localSession.players.some(player => player.state === 'playing' || player.state === 'paused') || hasPendingRecoveryOffer())) {
    sessionPaused = false; game.resume(); accumulator = 0; activateNativeKeyboard(); updateHud(); return;
  }
  if (presentingDeathSpill()) return;
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
function renderSetup(message = ''): void {
  sessionBoard?.render(message);
  const together = stagingSurviveTogether || !!stagedLiveJoin;
  const heading = document.querySelector<HTMLElement>('#local-session-heading');
  const subtitle = document.querySelector<HTMLElement>('#session-board .session-subtitle');
  const start = el<HTMLButtonElement>('local-session-start');
  const back = el<HTMLButtonElement>('local-session-back');
  if (heading) heading.textContent = stagedLiveJoin ? 'Join this run' : together ? 'Play together?' : 'Local Play';
  if (subtitle) subtitle.textContent = together ? 'Choose a free traveler. This run will keep its course and progress.' : 'Pick a traveler and a controller for every player.';
  const joiningSeat = setupDraft.find(seat => seat.device === (stagedLiveJoin ? markerDevice(stagedLiveJoin) : ''))?.seat;
  start.textContent = stagedLiveJoin ? `Join as ${(joiningSeat ?? 'p2').toUpperCase()}` : together ? 'Start together' : 'Start Local Play';
  back.textContent = stagedLiveJoin ? 'Not now' : together ? 'Keep playing solo' : 'Back to solo';
  renderModeChoices();
}
function addKeyboardSeat(): void {
  if (!localStage || stagedLiveJoin || setupDraft.length >= localStage.session.config.capacity) return;
  const seat = nextOpenSeat(setupDraft), characterId = nextUnusedCharacter(setupDraft);
  const device = (['keyboard-a', 'keyboard-b'] as const).find(candidate => !setupDraft.some(seat => seat.device === candidate));
  if (!seat || !characterId || !device) return;
  const label = device === 'keyboard-a' ? 'Keyboard A' : 'Keyboard B';
  setupDraft = [...setupDraft, { seat, device, deviceLabel: label, characterId }];
  renderSetup(`${seat.toUpperCase()} ready — ${characterById(characterId).name} on ${label}.`);
}
function chooseSetupCharacter(seat: SeatId, characterId: string): void {
  if (!localStage || ((stagingSurviveTogether || stagedLiveJoin) && !!localSession?.players.some(player => player.seat === seat)) || setupDraft.some(other => other.seat !== seat && other.characterId === characterId)) return;
  setupDraft = setupDraft.map(candidate => candidate.seat === seat ? { ...candidate, characterId } : candidate);
  renderSetup(`${seat.toUpperCase()} chose ${characterById(characterId).name}.`);
}
function leaveSetupSeat(seat: SeatId): void {
  if (!localStage || seat === 'p1' || (stagedLiveJoin && localSession?.players.some(player => player.seat === seat))) return;
  router.release(seat);
  setupDraft = setupDraft.filter(candidate => candidate.seat !== seat);
  renderSetup(`${seat.toUpperCase()} left Local Play.`);
}
/** Setup freezes the existing loop without advancing it; roster edits remain UI-only drafts. */
function openLocalPlay(joining?: GamepadDevice): void {
  if (!frameAvailable() || localStage || localSession || game.state === 'dead' || !el('drawer').hidden || hand.isOpen() || market.isOpen() || selectedOwnerRun().pendingPack) return;
  // The visible Local Play action lives on the paused board, so that board
  // is a paused live run rather than a fresh setup whenever it was opened
  // from active play.  The stage keeps the exact course frozen until commit.
  stagingSurviveTogether = game.state === 'playing' || game.state === 'paused';
  stagingRelay = false; relaySetup.reset();
  stagingRace = false; raceSetup.reset();
  try { localStage = LocalSession.stage(game, { roster: [], mode: stagingSurviveTogether ? createSurviveTogetherDefinition(game.definition) : undefined }); }
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
  sessionKeyboardEditor.close(); renderSetup(joining ? stagingSurviveTogether ? 'A controller wants to join. Its joining press was consumed.' : 'Controller joined an open seat. Its joining press was consumed.' : 'Choose a traveler and controller for every player.');
  updateHud();
  if (stagingSurviveTogether || stagedLiveJoin) el<HTMLButtonElement>('local-session-back').focus({ preventScroll: true });
  else sessionBoard?.focusStart();
}
/** Back to solo cancels the empty stage; no draft ever changed the adopted owner. */
function backToSolo(): void {
  if (!localStage) return;
  stagingRelay = false;
  stagingRace = false;
  if (stagedLiveJoin) {
    const joiningSeat = setupDraft.find(seat => seat.device === markerDevice(stagedLiveJoin!))?.seat;
    if (joiningSeat) router.release(joiningSeat); localStage.cancel(); localStage = undefined; setupDraft = []; stagedLiveJoin = undefined;
    sessionKeyboardEditor.close(); el<HTMLDivElement>('local-session-setup').hidden = true; updateHud(); el('scene').focus({ preventScroll: true }); return;
  }
  for (const seat of setupDraft) if (seat.device?.startsWith('gamepad-')) router.release(seat.seat);
  const restoreController = soloGamepad;
  game = localStage.cancel(); localStage = undefined; setupDraft = []; stagingSurviveTogether = false;
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
  if (stagingRace) {
    const proposal = raceSetup.proposal();
    try { validateRaceSetup(proposal); }
    catch (reason) { renderSetup((reason as Error).message); return; }
    emptyStage.cancel();
    try { race = createRaceSession(game, proposal); }
    catch (reason) { localStage = LocalSession.stage(game, { roster: [] }); renderSetup((reason as Error).message); return; }
    localSession = race.session; closedRosterMessage = 'Race roster is locked for this run.'; localStage = undefined; setupDraft = []; stagingRace = false;
    sessionPaused = false; sessionKeyboardEditor.close(); el<HTMLDivElement>('local-session-setup').hidden = true;
    selectHudOwner('p1'); activateNativeKeyboard(); clearRelayInput(); updateHud(); el('scene').focus({ preventScroll: true }); return;
  }
  if (stagingRelay) {
    emptyStage.cancel();
    try { relay = createRelaySession(game, relaySetup.proposal()); }
    catch (reason) { renderSetup(reason instanceof Error ? reason.message : 'Relay could not start.'); return; }
    localSession = relay.session; localStage = undefined; setupDraft = []; stagingRelay = false;
    sessionPaused = false; sessionKeyboardEditor.close(); el<HTMLDivElement>('local-session-setup').hidden = true;
    selectHudOwner(relay.activeSeat); activateNativeKeyboard(); clearRelayInput(); updateHud(); el('scene').focus({ preventScroll: true }); return;
  }
  if (stagedLiveJoin) {
    const joining = stagedLiveJoin;
    const candidate = setupDraft.find(seat => seat.device === markerDevice(joining));
    const session = localSession;
    if (!session || !candidate?.device || !candidate.characterId || !session.admit({ seat: candidate.seat, device: candidate.device, characterId: candidate.characterId })) { renderSetup(`Couldn’t place ${candidate?.seat.toUpperCase() ?? 'player'} safely. Try again.`); return; }
    localStage.cancel(); localStage = undefined; setupDraft = []; const joiningDevice = stagedLiveJoin; stagedLiveJoin = undefined;
    const player = session.players.find(candidate => candidate.device === markerDevice(joiningDevice));
    if (player) router.assign(joiningDevice, player.seat);
    router.seedAll(); sessionKeyboardEditor.close(); el<HTMLDivElement>('local-session-setup').hidden = true;
    updateHud(); el('scene').focus({ preventScroll: true }); return;
  }
  if (stagingSurviveTogether) {
    let candidate: ReturnType<typeof LocalSession.stage>;
    const originalCharacter = game.characterId;
    try {
      game.setCharacter(primary.characterId);
      candidate = LocalSession.stage(game, { roster, primaryDevice: primary.device, config: emptyStage.session.config, mode: emptyStage.session.mode, onLifecycle: record => notify(`${record.seat.toUpperCase()} ${record.type.replace('-', ' ')}.`) });
    } catch {
      game.setCharacter(originalCharacter);
      renderSetup('Couldn’t place the selected players safely. Try again.'); return;
    }
    emptyStage.cancel();
    const session = candidate.commit();
    localSession = session; localStage = undefined; setupDraft = []; stagingSurviveTogether = false;
    router.seedAll(); game.resume(); sessionPaused = false; accumulator = 0;
    sessionKeyboardEditor.close(); el<HTMLDivElement>('local-session-setup').hidden = true;
    activateNativeKeyboard(); audio.unlock(); updateHud(); el('scene').focus({ preventScroll: true });
    return;
  }
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
  localSession = candidate.commit(); localStage = undefined; setupDraft = []; stagingSurviveTogether = false;
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
  if (relay) { notify(RELAY_LOCKED); return; }
  if (localSession?.mode?.handlers.canAdmit?.() === false) { notify(closedRosterMessage); return; }
  if (localSession?.running) {
    if (localStage || localSession.players.length >= localSession.config.capacity) { notify('Game full — four players are already in this run.'); return; }
    const activeSeats = localSession.players.map(player => ({ seat: player.seat, device: player.device, deviceLabel: '', characterId: player.characterId }));
    const characterId = nextUnusedCharacter(activeSeats);
    if (!characterId) { notify('Game full — four players are already in this run.'); return; }
    const seat = nextOpenSeat(activeSeats);
    if (!seat) { notify('Game full — four players are already in this run.'); return; }
    try { localStage = LocalSession.stage(game, { roster: [], mode: localSession.mode }); }
    catch { notify('Couldn’t place a player safely. Try again.'); return; }
    stagedLiveJoin = device;
    setupDraft = [...activeSeats.map(active => ({ ...active, deviceLabel: `Current ${active.seat.toUpperCase()}` })), { seat, device: markerDevice(device), deviceLabel: deviceLabel(device), characterId }];
    const setup = el<HTMLDivElement>('local-session-setup'); setup.hidden = false; setup.setAttribute('role', 'dialog'); setup.setAttribute('aria-modal', 'true'); setup.setAttribute('aria-label', 'Join this run');
    accumulator = 0; pointer = null; sessionKeyboardEditor.close(); renderSetup('Joining… The controller press was consumed.'); updateHud();
    el<HTMLButtonElement>('local-session-back').focus({ preventScroll: true }); return;
  }
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
function sameReclaimDevice(left: GamepadDevice, right: GamepadDevice): boolean {
  return left.index === right.index && left.id === right.id && left.epoch === right.epoch;
}
function reclaimControllerSeat(device: GamepadDevice, seat: SeatId, input: GamepadReclaimInput): void {
  if (localStage) {
    const draft = setupDraft.find(candidate => candidate.seat === seat);
    if (!draft) return;
    setupDraft = setupDraft.map(candidate => candidate.seat === seat ? { ...candidate, device: markerDevice(device), deviceLabel: deviceLabel(device), disconnected: false } : candidate);
    router.reclaim(device); renderSetup(`Controller ready to reclaim ${seat.toUpperCase()}.`); return;
  }
  if (!localSession && seat === 'p1') {
    soloGamepad = device; router.reclaim(device); notify('Controller reclaimed solo play.');
    // A deliberate reconnect edge restores a safety-paused solo run, but is
    // consumed by reclaim so it never also hops the newly reclaimed player.
    if (game.state === 'paused' && frameAvailable()) play();
    return;
  }
  const player = localSession?.players.find(candidate => candidate.seat === seat);
  if (!player || (player.participation !== 'device-lost' && !((relay || race) && player.participation === 'dead'))) return;
  if (lifecycleBoard && pendingReclaim && pendingReclaim.seat === seat && sameReclaimDevice(pendingReclaim.device, device)) {
    if (input.actions.includes('back')) { closeLifecycleBoard(); return; }
    if (input.actions.includes('confirm')) { confirmModal(lifecycleBoard); return; }
    if (input.direction) navigateModalControls(lifecycleBoard, input.direction);
    return;
  }
  const raceToken=race?.reclaimToken(seat);
  openLifecycleBoard(seat, relay || race ? `Continue as ${characterById(player.characterId).name}` : `Reclaim ${seat.toUpperCase()}`, race ? 'Your race state is still here.' : relay ? 'Your relay seat and items are still here.' : `Continue as ${characterById(player.characterId).name}. Your items are still here.`, 'Not now', `Reclaim ${seat.toUpperCase()}`, false, true, () => {
    if(race){
      if(!pendingReclaim||!sameReclaimDevice(pendingReclaim.device,device)||!router.canReclaim(device,seat)||!race.reclaim(raceToken,markerDevice(device)))return false;
      router.reclaim(device);clearRelayInput();return true;
    }
    if (relay) {
      if (!pendingReclaim || pendingReclaim.seat !== seat || !sameReclaimDevice(pendingReclaim.device, device) || !router.canReclaim(device, seat) || !relay.reclaim(seat, markerDevice(device))) return false;
      router.reclaim(device); clearRelayInput(); return true;
    }
    if (!pendingReclaim || pendingReclaim.seat !== seat || !sameReclaimDevice(pendingReclaim.device, device) || !router.reclaim(device)) return false;
    if (!localSession?.offerReclaim(seat, markerDevice(device)) || !localSession.reclaim(seat, markerDevice(device))) { router.release(seat); return false; }
    notify(`Controller reclaimed ${seat.toUpperCase()}.`); return true;
  });
  pendingReclaim = Object.freeze({ device, seat });
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
      if (!localSession.deviceLost(event.seat)) relay?.disconnect(event.seat); syncRelayHandoff(); notify(`${event.seat.toUpperCase()} controller disconnected.`); updateHud();
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
  if (!localSession?.running || localStage || hand.isOpen() || hand.containsFocus() || market.isOpen() || !el('drawer').hidden || displayedRunState() !== 'playing') { move(direction); return; }
  audio.unlock(); if (localSession.dispatch({ seat, direction })) audio.play('hop'); updateHud();
}
function localSetupKeydown(event: KeyboardEvent): void {
  if (!localStage || disposed || event.key !== 'Tab') return;
  const setup = el('local-session-setup');
  const actionButtons = ['local-session-start', 'local-session-back']
    .map(id => document.getElementById(id))
    .filter((button): button is HTMLElement => button instanceof HTMLElement && !button.hidden && !button.matches(':disabled') && button.getClientRects().length > 0);
  const visibleButtons = [...setup.querySelectorAll<HTMLElement>('button:not([hidden]):not(:disabled)')]
    .filter(button => !button.closest('[hidden]') && button.getClientRects().length > 0);
  // Keep the dialog's Start/Back action row a closed Tab loop. Board controls
  // are still reachable by their own focus/controller navigation, without
  // sending a keyboard user into CSS-hidden compact-page tabs.
  const buttons = actionButtons.includes(document.activeElement as HTMLElement) ? actionButtons : visibleButtons;
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
  if (relayHandoff && !lifecycleBoard && nativeKeyboardActive) {
    const held = observedNativeKeys.has(event.key);
    observedNativeKeys.add(event.key);
    if (event.key === 'Enter' || event.key === ' ') {
      if (!held && !event.repeat) {
        const state = relay?.snapshot();
        const preferred = localSession?.players.find(p => p.seat === relayHandoff?.dataset.actor && p.device.startsWith('keyboard-'));
        const actor = preferred ?? ((state?.phase === 'ended' || state?.phase === 'handoff') ? localSession?.players.find(p => p.device.startsWith('keyboard-') && (state.phase === 'ended' || state.connections[p.seat])) : undefined);
        if (actor) relayConfirmControl(actor.seat);
      }
      event.preventDefault(); event.stopPropagation(); return;
    }
    if (keyboardInput?.keydown(event.key)) { event.preventDefault(); event.stopPropagation(); }
    return;
  }
  const menuButton = event.target instanceof HTMLButtonElement && (hand.isOpen() || hand.containsFocus() || market.isOpen());
  if (!nativeKeyboardActive || (!isNativeKeyboardTarget(event.target) && !menuButton)) return;
  observedNativeKeys.add(event.key);
  if (keyboardInput?.keydown(event.key)) { event.preventDefault(); event.stopPropagation(); }
}
function nativeKeyboardKeyup(event: KeyboardEvent): void {
  observedNativeKeys.delete(event.key);
  const menuButton = event.target instanceof HTMLButtonElement && (hand.isOpen() || hand.containsFocus() || market.isOpen());
  if (!nativeKeyboardActive) return;
  // A pause or other native button can own focus when a held profile key is
  // released. Always clear that internal held edge; only consume it when the
  // target is a surface that accepts profile controls.
  const released = keyboardInput?.keyup(event.key) ?? false;
  if ((!isNativeKeyboardTarget(event.target) && !menuButton) || !released) return;
  event.preventDefault(); event.stopPropagation();
}
document.addEventListener('keydown', nativeKeyboardKeydown);
document.addEventListener('keyup', nativeKeyboardKeyup);
function move(direction: Direction): void {
  if (!frameAvailable()) return;
  if (recoveryBoard || lifecycleBoard || !surviveResultsRoot.hidden) { navigateModalControls(recoveryBoard ?? lifecycleBoard ?? surviveResultsRoot, direction); return; }
  if (localStage) {
    const buttons = [...el('local-session-setup').querySelectorAll<HTMLButtonElement>('button')]
      .filter(button => !button.disabled && !button.hidden && button.getClientRects().length > 0);
    if (!buttons.length) return;
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const delta = direction === 'left' || direction === 'back' ? -1 : 1;
    buttons[(current + delta + buttons.length) % buttons.length]!.focus({ preventScroll: true }); return;
  }
  if (hand.isOpen() || (game.state === 'playing' && hand.containsFocus())) { hand.navigate(direction); return; }
  if (market.isOpen()) { market.navigate(direction); return; }
  if (!el('drawer').hidden) { collectionUI.navigate(direction); return; }
  if (innerWidth < 240 || innerHeight < 240) return;
  const state = displayedRunState();
  if (state === 'dead' || state === 'ready') { runMenuUI.navigate(direction); return; }
  if (state === 'paused') { pauseUI.navigate(direction); return; }
  audio.unlock(); if (localSession?.running ? localSession.dispatch({ seat: 'p1', direction }) : game.move(direction)) audio.play('hop'); updateHud();
}
function confirmMenu(): void {
  if (!frameAvailable()) return;
  if (recoveryBoard || lifecycleBoard || !surviveResultsRoot.hidden) { confirmModal(recoveryBoard ?? lifecycleBoard ?? surviveResultsRoot); return; }
  if (hudDetailsOpen) { closeHudInspection(); updateHud(); return; }
  if (localStage) {
    const focused = document.activeElement;
    if (focused instanceof HTMLButtonElement && el('local-session-setup').contains(focused) && !focused.disabled) focused.click();
    else sessionBoard?.focusStart();
    return;
  }
  if (hand.isOpen() || hand.containsFocus()) { hand.confirm(); return; }
  if (market.isOpen()) market.confirm();
  else if (!el('drawer').hidden) collectionUI.confirm();
  else if (displayedRunState() === 'paused') pauseUI.confirm();
  else if (displayedRunState() === 'playing') move('forward'); else runMenuUI.confirm();
}
function togglePause(): void {
  if (!frameAvailable() || localStage) return;
  if (recoveryBoard || lifecycleBoard || !surviveResultsRoot.hidden) return;
  if (hudDetailsOpen) { closeHudInspection(); updateHud(); return; }
  if (hand.close()) return;
  if (market.isOpen()) { market.close(); return; }
  if (!el('drawer').hidden) return;
  if (displayedRunState() === 'paused') play();
  else if (localSession?.running) { sessionPaused = true; accumulator = 0; audio.stop(); }
  else game.pause();
  updateHud();
}
function suspendPlay({ preserveHudInspection = false }: { preserveHudInspection?: boolean } = {}): void {
  if (!preserveHudInspection) closeHudInspection(false);
  // Frozen mode boards already prohibit simulation. Pausing their primary
  // participant would revoke a living actor's pending skip/leave authority.
  const frozenRelayBoard = relayHandoff && relay && !['running', 'recovery'].includes(relay.snapshot().phase);
  releaseNativeKeyboard(); if (localSession && !frozenRelayBoard) sessionPaused = true; pointer = null; audio.stop(); handPausedPlay = false;
  hand.close(); if (market.isOpen()) market.close(false); else game.closeMarket(false); if (!frozenRelayBoard) game.pause();
  restoreAfterDrawer = false; restoreModalFocus = false; updateHud(); restoreModalFocus = true;
}
function openDrawer(): void {
  if (localStage || !frameAvailable()) return;
  const wasPlaying = handPausedPlay || game.state === 'playing'; handPausedPlay = false; hand.close();
  if (market.isOpen()) market.close(false);
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
  if (recoveryBoard) { closeRecoveryBoard(false); return; }
  if (lifecycleBoard) { closeLifecycleBoard(); return; }
  if (!surviveResultsRoot.hidden) { navigateModalControls(surviveResultsRoot, 'back'); return; }
  if (hudDetailsOpen) { closeHudInspection(); updateHud(); return; }
  if (localStage) { backToSolo(); return; }
  if (hand.close()) return;
  if (market.isOpen()) market.close();
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
renderer.canvas.addEventListener('pointerdown', event => { if (!event.isPrimary) return; audio.unlock(); pointer = { x: event.clientX, y: event.clientY, id: event.pointerId }; renderer.canvas.setPointerCapture(event.pointerId); });
renderer.canvas.addEventListener('pointerup', event => { if (!pointer || pointer.id !== event.pointerId) return; const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y; pointer = null; if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) move('forward'); else move(Math.abs(dx) > Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'forward' : 'back'); });
renderer.canvas.addEventListener('pointercancel', () => { pointer = null; });
const observer = new ResizeObserver(() => {
  renderer.resize();
  const tiny = innerWidth < 240 || innerHeight < 240;
  if (tiny) {
    if (!wasTiny) {
      const active = document.activeElement;
      tinyReturnFocus = active instanceof HTMLElement && active !== el('app') && el('app').contains(active) ? active : lastAppFocus;
      tinyReturnMarket = market.isOpen();
    }
    wasTiny = true; suspendPlay({ preserveHudInspection: true }); return;
  }
  if (wasTiny) {
    wasTiny = false;
    const priorFocus = tinyReturnFocus, restoreMarket = tinyReturnMarket;
    tinyReturnFocus = undefined; tinyReturnMarket = false;
    queueMicrotask(() => {
      if (restoreMarket) market.openForSelected();
      if (canRestoreTinyFocus(priorFocus)) priorFocus.focus({ preventScroll: true });
      else if (restoreMarket && market.isOpen()) market.focusSelectedOwner();
      else if (relayHandoff || localStage) {
        const modal = relayHandoff ?? el('session-board');
        (visibleModalControls(modal)[0] ?? modal.querySelector<HTMLElement>('h2'))?.focus({ preventScroll: true });
      }
      else el<HTMLElement>('scene').focus({ preventScroll: true });
    });
  }
  if (hudDetailsOpen && innerHeight > 319) { closeHudInspection(); updateHud(); }
  if (recoveryBoard || lifecycleBoard) queueMicrotask(() => {
    const modal = recoveryBoard ?? lifecycleBoard;
    if (!modal) return;
    const controls = visibleModalControls(modal);
    if (!controls.includes(document.activeElement as HTMLButtonElement)) controls[0]?.focus({ preventScroll: true });
  });
}); observer.observe(el('app'));
document.addEventListener('visibilitychange', () => { if (document.hidden) suspendPlay(); });
window.addEventListener('blur', () => { localFocus = false; suspendPlay(); });
window.addEventListener('focus', () => { localFocus = true; });
let feedbackRace:RaceCoordinator|undefined;
let feedbackResult:RaceCoordinator['result'];
const feedbackStates=new Map<SeatId,{landed:number;fog:boolean;status:string}>();
function syncRaceFeedback():void {
  if(feedbackRace!==race){feedbackRace=race;feedbackStates.clear();feedbackResult=undefined;}
  if(!race)return;
  if(race.result&&feedbackResult!==race.result){feedbackResult=race.result;audio.sessionEvent('rank');notify('Race results ready.');}
  for(const p of race.session.players){
    const state={landed:race.fogState(p.seat).landed,fog:p.groundY<race.fogBoundary,status:race.status(p.seat)},before=feedbackStates.get(p.seat);feedbackStates.set(p.seat,state);if(!before)continue;
    let message='',cue:Parameters<GameAudio['sessionEvent']>[0]|undefined;
    if(state.landed>before.landed){message=`Fog plucked ${state.landed-before.landed} feather from ${p.seat.toUpperCase()}.`;cue='pressure-damage';}
    else if(state.fog&&!before.fog){message=`${p.seat.toUpperCase()} entered fog.`;cue='pressure-warning';}
    if(state.status!==before.status){
      if(state.status==='active'){message=`${p.seat.toUpperCase()} returned${(p.recovery?.protectionUntil??0)>race.session.world.time?' · protected 2s':''}.`;cue='returned';}
      else if(state.status==='finished'){message=`${p.seat.toUpperCase()} finished.`;cue='finished';}
      else if(state.status==='disconnected-grace'){message=`${p.seat.toUpperCase()} disconnected · reclaim 12s`;cue='disconnected';}
      else message=`${p.seat.toUpperCase()} · ${state.status}`;
    }
    if(message)notify(message);if(cue)audio.sessionEvent(cue);
  }
}
let last = performance.now(), accumulator = 0;
function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, .05); last = now;
  gamepad.update(now); router.update(now);
  const sessionUnblocked = frameAvailable() && !localStage && (!relayHandoff || relay?.snapshot().phase === 'recovery') && displayedRunState() !== 'paused' && !hand.isOpen() && el('drawer').hidden && !market.isOpen() && !selectedOwnerRun().pendingPack;
  // A valid personal offer must keep its authoritative world-time deadline
  // moving even when every seat is dead; pausing still freezes it above.
  const sessionAdvancing = sessionUnblocked && (displayedRunState() === 'playing' || localSession?.players.some(player => player.recovery?.offer));
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
  syncRelayHandoff();
  syncRaceFeedback();
  for (const event of localSession?.consumableSnapshot()?.uses ?? []) {
    if (heardConsumableUses.has(event)) continue;
    heardConsumableUses.add(event); if(race)audio.sessionEvent(event.itemId==='mud-splash'?'offensive-item':'defensive-item');else audio.play(event.cue);
  }
  if (!document.hidden && localFocus && innerWidth >= 240 && innerHeight >= 240) {
    if (localSession?.running) { if (sessionUnblocked) localSession.advanceDeathVisuals(dt); }
    else game.advanceDeathVisuals(dt);
  }
  spillAudio.update(game.state === 'dead' ? game.deathSpill : null,
    !progress.muted && !document.hidden && localFocus && !market.isOpen() && el('drawer').hidden && innerWidth >= 240 && innerHeight >= 240,
    progress.reduced || mediaQuery.matches);
  soundscape.update(game, !progress.muted && !document.hidden && !market.isOpen() && el('drawer').hidden && innerWidth >= 240 && innerHeight >= 240);
  renderer.reduced = progress.reduced || mediaQuery.matches;
  if (localSession?.running) renderer.drawSession(localSession.world, localSession.views(), sessionAdvancing ? dt : 0, race ? racePresentation(race) : undefined); else renderer.draw(game, progress.selected, localStage ? 0 : dt);
  if(race)renderRaceEdges(raceEdges,race,renderer);else raceEdges.replaceChildren();
  updateHud(); el('toast').textContent = now < toastUntil && !(game.state === 'playing' && game.warning) ? toastMessage : '';
  if (import.meta.env.DEV) devTools?.update();
  raf = requestAnimationFrame(frame);
}
// A complete injected binding may synchronously deliver its initial unfocused
// snapshot. Construct it only after every safety-pause dependency exists.
gamepad = createGamepadControls({ context: () => 'session-router', enabled: () => !disposed, direction: () => {}, confirm: () => {}, pause: () => {}, call: () => {}, back: () => {}, menu: () => {} }, undefined, undefined, undefined,
  (state, now) => router.receive(state, now));
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
window.addEventListener('pagehide', () => { if (disposed) return; disposed = true; disposeRelayResults?.(); disposeRelayResults = undefined; surviveResults.dispose(); deactivateNativeKeyboard(); localSession?.stop(); localStage?.cancel(); localStage = undefined; document.removeEventListener('keydown', localSetupKeydown, true); document.removeEventListener('keydown', nativeKeyboardKeydown); document.removeEventListener('keyup', nativeKeyboardKeyup); sessionKeyboardEditor.dispose(); if (import.meta.env.DEV) devTools?.dispose(); game.closeMarket(false); gamepad.close(); router.close(); market.dispose(); pauseUI.dispose(); runMenuUI.dispose(); collectionUI.dispose(); hand.dispose(); seedUI.dispose(); sounds.dispose(); cancelAnimationFrame(raf); observer.disconnect(); bindings.forEach(b => b.close()); for (const lease of shellShortcutLeases.values()) lease.close(); shellShortcutLeases.clear(); });
void boot();
