import { characterById } from './content.js';
import { validateRelaySetup } from './relay.js';
import type { RelayCoordinator, RelaySeat } from './relay.js';
import type { SessionSetupSeat } from './session-ui.js';
import type { SeatId } from './session.js';

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
    try { validateRelaySetup(proposal()); error.textContent = ''; start.disabled = false; input.removeAttribute('aria-invalid'); }
    catch (reason) { error.textContent = reason instanceof Error ? reason.message : 'Choose ready players.'; start.disabled = true; input.setAttribute('aria-invalid', 'true'); }
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
        const identity = document.createElement('span'); identity.textContent = `${index + 1}. ${seat.seat.toUpperCase()} · ${seat.characterId ? characterById(seat.characterId).name : 'Choose traveler'}`;
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
  const title = document.createElement('h2'); title.id = 'relay-handoff-title'; title.textContent = `Leg ${snapshot.leg} complete`;
  const status = document.createElement('p'); status.textContent = `${snapshot.activeSeat.toUpperCase()} carried the baton ${snapshot.tilesPerLeg} tiles.`;
  const incoming = snapshot.roster.find(seat => seat.seat === snapshot.incomingSeat)!;
  const identity = document.createElement('p'); identity.textContent = `Up next · ${incoming.seat.toUpperCase()} · ${characterById(incoming.characterId).name}`;
  const start = document.createElement('button'); start.type = 'button'; start.textContent = `Start ${incoming.seat.toUpperCase()}'s leg`; start.onclick = confirm;
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
  view.onclick = () => { summary.hidden = !summary.hidden; board.dataset.summary = String(!summary.hidden); view.textContent = summary.hidden ? 'View relay' : 'Back to handoff'; if (!summary.hidden) renderSummary(); };
  board.append(title, status, identity, start, hint, summary, view); root.append(board); start.focus({ preventScroll: true });
  board.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const buttons = [...board.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')].filter(button => button.getClientRects().length);
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    event.preventDefault(); buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus({ preventScroll: true });
  });
  return board;
}
