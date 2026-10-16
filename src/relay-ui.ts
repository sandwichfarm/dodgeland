import './relay-ui.css';
import { characterById } from './content.js';
import { validateRelaySetup } from './relay.js';
import type { RelayCoordinator, RelaySeat, RelayActionToken } from './relay.js';
import type { SessionSetupSeat } from './session-ui.js';
import type { SeatId } from './session.js';

const marker = (seat: SeatId) => ['▲', '●', '◆', '■'][Number(seat.slice(1)) - 1];
const relayIdentity = (seat: SeatId, characterId: string) => `${marker(seat)} ${seat.toUpperCase()} · ${characterById(characterId).name}`;
const setCopy = (node: Element, copy: string) => { if (node.textContent !== copy) node.textContent = copy; };
function announce(copy: string): void {
  let region = document.getElementById('relay-announcement');
  if (!region) { region = document.createElement('p'); region.id = 'relay-announcement'; region.className = 'relay-announcement'; region.setAttribute('role', 'status'); region.setAttribute('aria-live', 'polite'); document.getElementById('app')!.append(region); }
  setCopy(region, copy);
}

/** Presentation over the shared HUD; it owns no player or progress state. */
export function renderRelayHud(root: HTMLElement, relay: RelayCoordinator): void {
  const state = relay.snapshot(); root.dataset.relayHud = 'true'; root.setAttribute('aria-live', 'off');
  const announcement = `${relay.session.id}:${state.activeSeat}:${JSON.stringify(state.connections)}`;
  if (state.phase === 'running' && root.dataset.relayAnnouncement !== announcement) {
    const disconnected = state.roster.filter(seat => !state.connections[seat.seat]).map(seat => `${seat.seat.toUpperCase()} disconnected — their slot is saved.`);
    announce(disconnected.join(' ') || `${state.activeSeat.toUpperCase()} is running.`); root.dataset.relayAnnouncement = announcement;
  }
  let distance = root.querySelector<HTMLElement>('.relay-distance');
  if (!distance) { distance = document.createElement('p'); distance.className = 'relay-distance'; root.prepend(distance); }
  setCopy(distance, `Relay distance ${relay.session.world.frontier}`);
  for (const player of relay.session.players) {
    const tile = root.querySelector<HTMLElement>(`[data-seat="${player.seat}"]`)!;
    const active = player.seat === state.activeSeat;
    tile.dataset.relayActive = String(active);
    const status = player.participation === 'departed' ? 'departed' : !state.connections[player.seat] ? 'disconnected' : player.participation === 'dead' ? 'down' : active ? 'RUNNING' : player.seat === state.incomingSeat ? 'NEXT' : 'waiting';
    setCopy(tile.querySelector('[data-session-hud="identity"]')!, innerWidth <= 479 || innerHeight <= 419 ? `${player.seat.toUpperCase()} ${marker(player.seat)}` : relayIdentity(player.seat, player.characterId));
    setCopy(tile.querySelector('.session-hud-summary')!, `${characterById(player.characterId).name} · ${player.health}/${player.maxHealth} · ${status}`);
    setCopy(tile.querySelector('[data-session-hud="device"]')!, status);
    setCopy(tile.querySelector('[data-session-hud="power"]')!, `Power · ${100 - player.powerRemaining}/100 tiles`);
    const recovery = player.recovery;
    if (!recovery?.offer) setCopy(tile.querySelector('[data-session-hud="revive"]')!, `Personal revive · ${recovery?.charge === 'available' ? 250 : Math.min(250, Math.max(0, 250 - ((recovery?.nextRecharge ?? 250) - (recovery?.personalHighWater ?? 0))))}/250 tiles`);
  }
}

/** Configuration decorates the shipped roster editor; no second binding/catalog tree. */
export function createRelaySetup(options: { root: HTMLElement; seats(): readonly SessionSetupSeat[]; active(): boolean; choose(): void; reorder(seat: SeatId, offset: number): void }) {
  let value = '50';
  let page: 'length' | 'order' | 'players' = 'length';
  let selected: SeatId = 'p1';
  const panel = document.createElement('section'); panel.id = 'relay-configuration';
  const choice = document.createElement('button'); choice.id = 'relay-play'; choice.type = 'button'; choice.textContent = 'Relay'; choice.onclick = options.choose;
  const label = document.createElement('label'); label.htmlFor = 'relay-tiles'; label.textContent = 'Tiles per leg';
  const input = document.createElement('input'); input.id = 'relay-tiles'; input.type = 'text'; input.inputMode = 'numeric'; input.value = value; input.maxLength = 4;
  const order = document.createElement('div'); order.className = 'relay-order';
  const nav = document.createElement('nav'); nav.className = 'relay-setup-nav'; nav.setAttribute('aria-label', 'Relay setup pages');
  for (const [key, text] of [['length', 'Length'], ['order', 'Order'], ['players', 'Roster']] as const) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = text;
    button.onclick = () => { page = key; render(true); }; nav.append(button);
  }
  const error = document.createElement('p'); error.id = 'relay-setup-error'; error.setAttribute('role', 'alert'); input.setAttribute('aria-describedby', error.id);
  const proposal = () => ({ seats: options.seats() as readonly RelaySeat[], tilesPerLeg: value });
  const validate = () => {
    const start = options.root.querySelector<HTMLButtonElement>('#local-session-start')!;
    if (!options.active()) return;
    try { validateRelaySetup(proposal()); setCopy(error, ''); start.disabled = false; input.removeAttribute('aria-invalid'); }
    catch (reason) { setCopy(error, reason instanceof Error ? reason.message : 'Choose ready players.'); start.disabled = true; input.setAttribute('aria-invalid', 'true'); }
  };
  input.oninput = () => { value = input.value; validate(); };
  panel.append(choice, nav, label, input, order, error);
  function render(available: boolean) {
      const board = options.root.querySelector<HTMLElement>('#session-board');
      if (!available) { panel.remove(); if (board) delete board.dataset.relayPage; return; }
      board?.append(panel);
      const active = options.active(); panel.dataset.active = String(active); choice.hidden = active; nav.hidden = !active;
      if (board) board.dataset.relayPage = active ? page : '';
      label.hidden = input.hidden = error.hidden = !active || page !== 'length'; order.hidden = !active || page !== 'order';
      if (!active) return;
      [...nav.children].forEach((button, index) => button.setAttribute('aria-pressed', String(['length', 'order', 'players'][index] === page)));
      const all = options.seats(); if (!all.some(seat => seat.seat === selected)) selected = all[0]?.seat ?? 'p1';
      order.replaceChildren(...all.filter(seat => seat.seat === selected).map(seat => {
        const index = all.indexOf(seat);
        const row = document.createElement('div');
        const identity = document.createElement('span'); identity.textContent = `${index + 1}. ${marker(seat.seat)} ${seat.seat.toUpperCase()} · ${seat.characterId ? characterById(seat.characterId).name : 'Choose traveler'}`;
        const pager = document.createElement('div'); pager.className = 'relay-order-pager';
        const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = '‹'; previous.setAttribute('aria-label', 'Previous runner'); previous.disabled = index === 0; previous.onclick = () => { selected = all[index - 1]!.seat; render(true); };
        const next = document.createElement('button'); next.type = 'button'; next.textContent = '›'; next.setAttribute('aria-label', 'Next runner'); next.disabled = index === all.length - 1; next.onclick = () => { selected = all[index + 1]!.seat; render(true); };
        pager.append(previous, identity, next); row.append(pager);
        for (const [offset, text] of [[-1, 'Move earlier'], [1, 'Move later']] as const) {
          const button = document.createElement('button'); button.type = 'button'; button.textContent = text; button.disabled = index + offset < 0 || index + offset >= all.length;
          button.id = `relay-order-${offset}`; button.setAttribute('aria-label', `${text}: ${seat.seat.toUpperCase()}, position ${index + 1}`); button.onclick = () => { options.reorder(seat.seat, offset); order.querySelector<HTMLButtonElement>(`[id="${button.id}"]`)?.focus({ preventScroll: true }); }; row.append(button);
        }
        return row;
      }));
      options.root.querySelector('#local-session-heading')!.textContent = 'Relay setup';
      options.root.querySelector('#local-session-start')!.textContent = 'Start Relay'; validate();
    }
  return {
    proposal,
    reset() { value = '50'; input.value = value; page = 'length'; selected = 'p1'; },
    render,
  };
}

export function createRelayHandoff(root: HTMLElement, relay: RelayCoordinator, confirm: () => void): HTMLElement {
  const snapshot = relay.snapshot();
  const board = document.createElement('section'); board.id = 'relay-handoff'; board.className = 'relay-handoff'; board.setAttribute('role', 'dialog'); board.setAttribute('aria-modal', 'true'); board.setAttribute('aria-labelledby', 'relay-handoff-title');
  const title = document.createElement('h2'); title.id = 'relay-handoff-title'; title.textContent = snapshot.readyReason ? `${snapshot.incomingSeat.toUpperCase()}'s turn` : `Leg ${snapshot.leg} complete`;
  const status = document.createElement('p'); status.textContent = snapshot.readyReason ? 'The next runner starts when ready.' : `${snapshot.activeSeat.toUpperCase()} carried the baton ${snapshot.tilesPerLeg} tiles.`;
  const incoming = snapshot.roster.find(seat => seat.seat === snapshot.incomingSeat)!;
  board.dataset.actor = incoming.seat;
  const identity = document.createElement('p'); identity.textContent = `Up next · ${relayIdentity(incoming.seat, incoming.characterId)}`;
  const start = document.createElement('button'); start.type = 'button'; start.textContent = `Start ${incoming.seat.toUpperCase()}'s leg`; start.onclick = confirm;
  start.dataset.relayAction = 'start';
  const hint = document.createElement('p'); hint.textContent = `${incoming.seat.toUpperCase()}: press forward or confirm when ready.`;
  const view = document.createElement('button'); view.type = 'button'; view.textContent = 'View relay';
  const summary = document.createElement('div'); summary.className = 'relay-summary'; summary.hidden = true;
  let selected = 0;
  const renderSummary = () => {
    const seat = snapshot.roster[selected]!;
    const copy = document.createElement('p'); copy.textContent = `${selected + 1}/${snapshot.roster.length} · ${seat.seat.toUpperCase()} · ${characterById(seat.characterId).name}`;
    summary.replaceChildren(copy);
    for (const [offset, text] of [[-1, 'Previous'], [1, 'Next']] as const) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = text; button.disabled = selected + offset < 0 || selected + offset >= snapshot.roster.length;
      button.onclick = () => { selected += offset; renderSummary(); view.focus({ preventScroll: true }); }; summary.append(button);
    }
  };
  view.onclick = () => { summary.hidden = !summary.hidden; board.dataset.summary = String(!summary.hidden); view.textContent = summary.hidden ? 'View relay' : 'Back to handoff'; if (!summary.hidden) renderSummary(); else start.focus({ preventScroll: true }); };
  board.append(title, status, identity, start, hint, summary, view); root.append(board); start.focus({ preventScroll: true });
  announce(`${title.textContent}. ${identity.textContent}`);
  board.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const buttons = [...board.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')].filter(button => button.getClientRects().length);
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    event.preventDefault(); buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus({ preventScroll: true });
  });
  return board;
}

export function createRelayLifecycle(root: HTMLElement, relay: RelayCoordinator, action: (kind: string, actor: SeatId, token: RelayActionToken) => void): HTMLElement {
  const state = relay.snapshot(), runner = relay.session.players.find(p => p.seat === state.activeSeat)!;
  const actor = state.actionActor ?? (state.phase === 'recovery' ? state.activeSeat : relay.session.players.find(p => state.connections[p.seat] && p.participation === 'active' && p.state === 'playing')?.seat) ?? state.activeSeat;
  const board = document.createElement('section'); board.id = 'relay-handoff'; board.className = 'relay-handoff relay-lifecycle';
  board.dataset.phase = state.phase; board.dataset.actor = actor;
  board.setAttribute('role', 'dialog'); board.setAttribute('aria-modal', 'true'); board.setAttribute('aria-labelledby', 'relay-handoff-title');
  const title = document.createElement('h2'); title.id = 'relay-handoff-title';
  const body = document.createElement('p');
  const identity = document.createElement('p'); identity.className = 'relay-lifecycle-identity'; identity.textContent = relayIdentity(state.activeSeat, runner.characterId);
  board.append(title, body, identity);
  const button = (text: string, kind: string, seat = actor) => { const control = document.createElement('button'); control.type = 'button'; control.textContent = text; control.dataset.relayAction = kind; control.dataset.actor = seat; const token = relay.actionToken(seat); control.onclick = () => action(kind, seat, token); board.append(control); };
  if (state.phase === 'confirm-skip') {
    title.textContent = `Skip ${state.activeSeat.toUpperCase()} this turn?`; body.textContent = 'Their seat stays reserved for reclaim.';
    button('Back', 'cancel'); button(`Skip ${state.activeSeat.toUpperCase()}`, 'confirm');
  } else if (state.phase === 'confirm-leave') {
    title.textContent = `Leave Relay as ${actor.toUpperCase()}?`; body.textContent = 'Your leg record stays in the results. This is not a death.';
    button('Keep playing', 'cancel'); button('Leave Relay', 'confirm');
  } else if (state.phase === 'disconnected') {
    title.textContent = `${state.activeSeat.toUpperCase()} controller disconnected.`; body.textContent = `Reclaim ${state.activeSeat.toUpperCase()} or choose the next runner.`;
    if (runner.recovery?.offer) body.textContent = `Reclaim ${state.activeSeat.toUpperCase()} to resolve their personal revival.`;
    else button(`Skip ${state.activeSeat.toUpperCase()}`, 'skip');
    button(`Leave as ${actor.toUpperCase()}`, 'leave');
  } else if (state.phase === 'waiting-for-reclaim') {
    title.textContent = 'Waiting for a player to reclaim.'; body.textContent = 'No runner is ready. Reserved seats can return.';
    identity.textContent = relay.session.players.filter(player => player.participation !== 'departed' && !state.connections[player.seat]).map(player => `${player.seat.toUpperCase()} · ${characterById(player.characterId).name}`).join(' / ');
  } else if (state.phase === 'recovery') {
    title.textContent = `${state.activeSeat.toUpperCase()} can return`; body.textContent = 'Use your personal revive or continue without it.';
    button(`Revive ${state.activeSeat.toUpperCase()}`, 'revive', state.activeSeat); button('Continue without revive', 'decline', state.activeSeat);
    button('Leave Relay', 'leave', state.activeSeat);
  } else {
    title.textContent = 'No runner remains.'; body.textContent = 'Your relay has ended.'; button('Hop again', 'restart');
  }
  root.append(board); (board.querySelector('button') ?? title).setAttribute('tabindex', '0'); (board.querySelector<HTMLButtonElement>('button') ?? title).focus({ preventScroll: true });
  announce(`${title.textContent} ${identity.textContent}`);
  board.addEventListener('keydown', event => { if (event.key !== 'Tab') return; const controls = [...board.querySelectorAll<HTMLButtonElement>('button')]; event.preventDefault(); if (!controls.length) return; const index = controls.indexOf(document.activeElement as HTMLButtonElement); controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]!.focus({ preventScroll: true }); });
  return board;
}

/** A view over a completed record: navigation never reads a mutable session. */
export function createRelayResults(root: HTMLElement, result: import('./relay-results.js').RelayResult, again: () => void) {
  const board = document.createElement('section');
  board.id = 'relay-handoff'; board.className = 'relay-handoff relay-results'; board.dataset.phase = 'ended';
  board.setAttribute('role', 'dialog'); board.setAttribute('aria-modal', 'true'); board.setAttribute('aria-labelledby', 'relay-results-title');
  const title = document.createElement('h2'); title.id = 'relay-results-title'; title.textContent = 'Relay results';
  const body = document.createElement('div'); body.className = 'relay-results-body';
  const nav = document.createElement('nav'); nav.className = 'relay-results-nav'; nav.setAttribute('aria-label', 'Result pages');
  const previous = document.createElement('button'), section = document.createElement('button'), next = document.createElement('button'), restart = document.createElement('button');
  for (const button of [previous, section, next, restart]) button.type = 'button';
  previous.textContent = '‹'; previous.setAttribute('aria-label', 'Previous result page'); next.textContent = '›'; next.setAttribute('aria-label', 'Next result page');
  restart.textContent = 'Hop again'; restart.onclick = again;
  const content = document.createElement('div'); content.className = 'relay-results-content';
  const podium = document.createElement('aside'); podium.className = 'relay-results-podium'; podium.setAttribute('aria-label', 'Contribution podium');
  content.append(podium, body);
  nav.append(previous, section, next); board.append(title, content, nav, restart);
  type Page = { title: string; fields: readonly (readonly [string, string])[] };
  let view = 0, page = 0;
  const marker = (seat: SeatId) => ['▲', '●', '◆', '■'][Number(seat.slice(1)) - 1];
  const identity = (row: {seat: SeatId; characterId: string}) => `${marker(row.seat)} ${row.seat.toUpperCase()} · ${characterById(row.characterId).name}`;
  const duration = (seconds: number) => `${seconds.toFixed(1)}s`;
  const outcome = { complete: 'Handed off', dead: 'Dead', skipped: 'Skipped', left: 'Left', ended: 'Ended' };
  const terminal = result.outcome === 'no-eligible-runner' ? 'No runner remains.' : result.outcome === 'complete' ? 'Relay complete.' : result.outcome;
  const shared = document.createElement('h3'); shared.textContent = `Relay distance ${result.distance} hops.`;
  const sharedOutcome = document.createElement('p'); sharedOutcome.textContent = `${terminal} ${duration(result.elapsedSeconds)}`;
  podium.append(shared, sharedOutcome);
  for (const tier of result.podium) {
    const group = document.createElement('section'); group.className = 'relay-podium-tier';
    const rank = document.createElement('strong'); rank.textContent = tier.label; rank.setAttribute('aria-label', `Rank ${tier.label}`); group.append(rank);
    for (const id of tier.participants) { const row = result.contributions.find(row => row.participantId === id)!; const member = document.createElement('p'); member.textContent = `${identity(row)} · ${row.distance} hops`; group.append(member); }
    podium.append(group);
  }
  function pages(): Page[] {
    const short = root.clientHeight < 480 || root.clientWidth < 300;
    const all: Page[] = view === 0 ? [
      {title: `Relay distance ${result.distance} hops.`, fields: [['Outcome', terminal], ['Relay time', duration(result.elapsedSeconds)]]},
      ...result.podium.map(tier => ({ title: `Rank ${tier.label}`, fields: tier.participants.map(id => { const row = result.contributions.find(row => row.participantId === id)!; return [identity(row), `${row.distance} hops`] as const; }) })),
    ] : view === 1 ? result.contributions.map(row => ({title: identity(row), fields: [
      ['Rank', row.rankLabel], ['Lifecycle', row.lifecycle === 'departed' ? 'Left' : !row.connected ? 'Disconnected' : row.lifecycle === 'dead' ? 'Dead' : 'Active'],
      ['Distance', `${row.distance} hops`], ['Legs', String(row.legs)], ['Active time', duration(row.duration)], ['Coins', String(row.coins)], ['Pickups', String(row.pickups)], ['Self revives', String(row.selfRevives)], ['Deaths', String(row.deaths)], ['Skips', String(row.skips)],
    ]})) : result.legs.map(row => ({title: `Leg ${row.leg} · ${identity(row)}`, fields: [
      ['Outcome', outcome[row.outcome]], ['Frontier', `${row.startFrontier} → ${row.endFrontier}`], ['Distance', `${row.distance} hops`], ['Active time', duration(row.duration)], ['Coins', String(row.coins)], ['Pickups', String(row.pickups)], ['Self revives', String(row.selfRevives)], ['Deaths', String(row.deaths)],
    ]}));
    if (!all.length) return [{title: 'No legs opened', fields: []}];
    return short ? all.flatMap(row => row.fields.length ? row.fields.map(field => ({title: row.title, fields: [field]})) : [row]) : all;
  }
  function render() {
    const all = pages(); page = Math.min(page, all.length - 1); const item = all[page]!;
    const heading = document.createElement('h3'); heading.textContent = item.title;
    const fields = document.createElement('dl');
    for (const [label, value] of item.fields) { const pair = document.createElement('div'), term = document.createElement('dt'), detail = document.createElement('dd'); term.textContent = label; detail.textContent = value; pair.append(term, detail); fields.append(pair); }
    const copy = `${item.title}. ${item.fields.map(([label, value]) => `${label}: ${value}`).join('. ')}`;
    if (body.dataset.announcement !== copy) { announce(copy); body.dataset.announcement = copy; }
    body.replaceChildren(heading, fields); board.dataset.resultView = ['podium', 'players', 'legs'][view];
    previous.disabled = page === 0; next.disabled = page === all.length - 1;
    section.textContent = ['Players', 'Leg ledger', 'Podium'][view]!; section.setAttribute('aria-label', `${['Podium', 'Players', 'Leg ledger'][view]}, page ${page + 1} of ${all.length}. Show ${section.textContent}`);
    body.setAttribute('aria-label', `Page ${page + 1} of ${all.length}`);
  }
  previous.onclick = () => { page--; render(); if (previous.disabled) section.focus(); };
  next.onclick = () => { page++; render(); if (next.disabled) section.focus(); };
  section.onclick = () => { view = (view + 1) % 3; page = 0; render(); };
  const siblings = [...root.children].filter((node): node is HTMLElement => node instanceof HTMLElement && node.id !== 'relay-announcement').map(node => ({node, inert: node.inert}));
  for (const {node} of siblings) node.inert = true;
  root.append(board); render(); section.focus({preventScroll: true}); window.addEventListener('resize', render);
  board.addEventListener('keydown', event => { if (event.key !== 'Tab') return; const controls = [previous, section, next, restart].filter(control => !control.disabled); const index = controls.indexOf(document.activeElement as HTMLButtonElement); event.preventDefault(); controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]!.focus({preventScroll: true}); });
  return { element: board, dispose() { window.removeEventListener('resize', render); for (const {node, inert} of siblings) node.inert = inert; board.remove(); } };
}
