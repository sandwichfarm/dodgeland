import { characterById } from './content.js';
import { validateRelaySetup } from './relay.js';
import type { RelayCoordinator, RelaySeat } from './relay.js';
import type { SessionSetupSeat } from './session-ui.js';
import type { SeatId } from './session.js';

/** Configuration decorates the shipped roster editor; no second binding/catalog tree. */
export function createRelaySetup(options: { root: HTMLElement; seats(): readonly SessionSetupSeat[]; active(): boolean; choose(): void; reorder(seat: SeatId, offset: number): void }) {
  let value = '50';
  const panel = document.createElement('section'); panel.id = 'relay-configuration';
  const choice = document.createElement('button'); choice.id = 'relay-play'; choice.type = 'button'; choice.textContent = 'Relay'; choice.onclick = options.choose;
  const label = document.createElement('label'); label.htmlFor = 'relay-tiles'; label.textContent = 'Tiles per leg';
  const input = document.createElement('input'); input.id = 'relay-tiles'; input.type = 'text'; input.inputMode = 'numeric'; input.value = value; input.maxLength = 4;
  const order = document.createElement('div'); order.className = 'relay-order';
  const error = document.createElement('p'); error.id = 'relay-setup-error'; error.setAttribute('role', 'alert'); input.setAttribute('aria-describedby', error.id);
  const proposal = () => ({ seats: options.seats() as readonly RelaySeat[], tilesPerLeg: value });
  const validate = () => {
    const start = options.root.querySelector<HTMLButtonElement>('#local-session-start')!;
    if (!options.active()) return;
    try { validateRelaySetup(proposal()); error.textContent = ''; start.disabled = false; input.removeAttribute('aria-invalid'); }
    catch (reason) { error.textContent = reason instanceof Error ? reason.message : 'Choose ready players.'; start.disabled = true; input.setAttribute('aria-invalid', 'true'); }
  };
  input.oninput = () => { value = input.value; validate(); };
  panel.append(choice, label, input, order, error);
  return {
    proposal,
    reset() { value = '50'; input.value = value; },
    render(available: boolean) {
      if (!available) { panel.remove(); return; }
      options.root.querySelector('#session-board')?.append(panel);
      const active = options.active(); panel.dataset.active = String(active); choice.hidden = active; label.hidden = input.hidden = order.hidden = error.hidden = !active;
      if (!active) return;
      order.replaceChildren(...options.seats().map((seat, index, all) => {
        const row = document.createElement('div');
        const identity = document.createElement('span'); identity.textContent = `${index + 1}. ${seat.seat.toUpperCase()} · ${seat.characterId ? characterById(seat.characterId).name : 'Choose traveler'}`;
        row.append(identity);
        for (const [offset, text] of [[-1, 'Move earlier'], [1, 'Move later']] as const) {
          const button = document.createElement('button'); button.type = 'button'; button.textContent = text; button.disabled = index + offset < 0 || index + offset >= all.length;
          button.setAttribute('aria-label', `${text}: ${seat.seat.toUpperCase()}, position ${index + 1}`); button.onclick = () => options.reorder(seat.seat, offset); row.append(button);
        }
        return row;
      }));
      options.root.querySelector('#local-session-heading')!.textContent = 'Relay setup';
      options.root.querySelector('#local-session-start')!.textContent = 'Start Relay'; validate();
    },
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
  board.append(title, status, identity, start, hint); root.append(board); start.focus({ preventScroll: true });
  board.addEventListener('keydown', event => { if (event.key === 'Tab') { event.preventDefault(); start.focus({ preventScroll: true }); } });
  return board;
}
