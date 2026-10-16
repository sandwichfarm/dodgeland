import { validateRaceSetup } from './race.js';
import './race-ui.css';
import type { RaceProposal, RaceResult, RaceCoordinator } from './race.js';
import type { SessionSetupSeat } from './session-ui.js';

export function renderRaceHud(root: HTMLElement, race: RaceCoordinator): void {
  let cue = root.querySelector<HTMLElement>('.race-distance');
  if (!cue) { cue = document.createElement('p'); cue.className = 'race-distance'; root.prepend(cue); }
  cue.textContent = `Finish ${race.descriptor.settings.finishTiles} · ${Math.max(0, Math.ceil(race.descriptor.settings.activeSeconds-race.elapsed))}s`;
  const statuses=race.session.players.map(p=>race.status(p.seat));
  let notice=root.querySelector<HTMLElement>('.race-lifecycle');
  if(!notice){notice=document.createElement('p');notice.className='race-lifecycle';notice.setAttribute('role','status');root.append(notice);}
  notice.textContent=race.result?'Race complete.':race.waiting?'Waiting for a player to reclaim. A reserved seat can resume this race.':statuses.includes('recovery-offered')&&!statuses.includes('active')?'Everyone is down. Personal offers and the race clock continue.':statuses.filter(s=>s==='active').length===1?'Last racer: keep racing toward the finish.':'Race clock is live.';
  for (const player of race.session.players){
    const tile=root.querySelector<HTMLElement>(`[data-seat="${player.seat}"]`)!;
    const state=race.status(player.seat),name=player.seat.toUpperCase();
    tile.querySelector<HTMLElement>('[data-session-hud="lifecycle"]')!.textContent=state==='disconnected-grace'?`${name} disconnected · reclaim ${Math.ceil(race.graceRemaining(player.seat))}s`:state==='forfeited'?`${name} forfeited.`:state==='departed'?`${name} departed · DNF`:state==='finished'?'FINISHED':state==='recovery-offered'?'Personal revival offered':state==='eliminated'?'Eliminated · DNF':'Racing';
    const leave=tile.querySelector<HTMLButtonElement>('[data-session-hud="item"]')!;leave.textContent='Leave Race';leave.disabled=player.deviceLostAt!==null||['finished','forfeited','departed'].includes(state);
    const revive=tile.querySelector<HTMLButtonElement>('[data-session-hud="revive"]')!;revive.disabled=state!=='recovery-offered';
    let decline=tile.querySelector<HTMLButtonElement>('[data-race-decline]');
    if(!decline){decline=document.createElement('button');decline.type='button';decline.className='session-future';decline.dataset.raceDecline='true';decline.textContent='Continue without revive';decline.onclick=()=>{if(race.status(player.seat)==='recovery-offered')race.session.declineRecovery(player.seat);};revive.after(decline);}
    decline.hidden=state!=='recovery-offered';
  }
}

/** Uses the existing roster editor and its binding leases. */
export function createRaceSetup(options: { root: HTMLElement; seats(): readonly SessionSetupSeat[]; active(): boolean; choose(): void }) {
  let page: 'settings' | 'roster' = 'settings';
  const panel = document.createElement('section'); panel.id = 'race-configuration';
  const choice = document.createElement('button'); choice.id = 'race-play'; choice.type = 'button'; choice.textContent = 'Race setup'; choice.onclick = options.choose;
  const fields = document.createElement('div'); fields.className = 'race-settings';
  const finish = document.createElement('input'), seconds = document.createElement('input');
  for (const [input, id, copy, initial] of [[finish, 'race-finish', 'Finish tiles', '500'], [seconds, 'race-time', 'Race time', '180']] as const) {
    const label = document.createElement('label'); label.htmlFor = id; label.textContent = copy;
    input.id = id; input.type = 'text'; input.inputMode = 'numeric'; input.value = initial;
    input.setAttribute('aria-describedby', 'race-setup-error'); input.oninput = validate;
    label.append(input); fields.append(label);
  }
  const error = document.createElement('p'); error.id = 'race-setup-error'; error.setAttribute('role', 'alert');
  const nav = document.createElement('nav'); nav.setAttribute('aria-label', 'Race setup pages');
  for (const key of ['settings', 'roster'] as const) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = key === 'settings' ? 'Settings' : 'Roster';
    button.onclick = () => { page = key; render(true); button.focus({ preventScroll: true }); }; nav.append(button);
  }
  const hint = document.createElement('p'); hint.id = 'race-setup-lock'; hint.textContent = 'Roster locks when the race starts.';
  panel.append(choice, nav, fields, hint, error);
  const proposal = (): RaceProposal => ({ seats: options.seats().map(p => ({ seat: p.seat, device: p.device!, characterId: p.characterId!, disconnected: p.disconnected })), finishTiles: finish.value, activeSeconds: seconds.value });
  function validate() {
    if (!options.active()) return;
    const start = options.root.querySelector<HTMLButtonElement>('#local-session-start')!;
    try { validateRaceSetup(proposal()); error.textContent = ''; start.disabled = false; finish.removeAttribute('aria-invalid'); seconds.removeAttribute('aria-invalid'); }
    catch (reason) { error.textContent = (reason as Error).message; start.disabled = true; (error.textContent.includes('seconds') ? seconds : finish).setAttribute('aria-invalid', 'true'); }
  }
  function render(available: boolean) {
    const currentBoard = options.root.querySelector<HTMLElement>('#session-board');
    if (!available) { panel.remove(); if (currentBoard) delete currentBoard.dataset.racePage; return; }
    const board = options.root.querySelector('#session-board')!;
    (options.active() ? board : board.querySelector('#relay-configuration') ?? board).append(panel);
    const active = options.active(); choice.hidden = active; nav.hidden = hint.hidden = !active; fields.hidden = error.hidden = !active || page !== 'settings';
    if (currentBoard) currentBoard.dataset.racePage = active ? page : '';
    [...nav.children].forEach((button, index) => button.setAttribute('aria-pressed', String(index === (page === 'settings' ? 0 : 1))));
    if (active) { options.root.querySelector('#local-session-heading')!.textContent = 'Race setup'; const start = options.root.querySelector('#local-session-start')!; start.textContent = 'Start Race'; start.setAttribute('aria-describedby', hint.id); validate(); }
    else options.root.querySelector('#local-session-start')!.removeAttribute('aria-describedby');
  }
  return { proposal, reset() { finish.value = '500'; seconds.value = '180'; page = 'settings'; }, render };
}

/** Initial short-race result projection; consumes only the frozen record. */
export function createRaceResultsBoard(root: HTMLElement, again: () => void) {
  let shown: RaceResult | undefined;
  return {
    show(result: RaceResult) {
      if (shown === result) return;
      shown = result; root.replaceChildren(); root.hidden = false; root.dataset.initialRace = 'true'; root.setAttribute('aria-labelledby', 'race-results-heading');
      const sheet = document.createElement('div'); sheet.className = 'survive-results-sheet';
      const title = document.createElement('h2'); title.id = 'race-results-heading'; title.textContent = result.outcome === 'time' ? 'Race time ended.' : 'Race complete.';
      const summary = document.createElement('p'); summary.textContent = `Finish ${result.descriptor.settings.finishTiles} · ${result.elapsed.toFixed(2)}s`;
      const winner = document.createElement('p'); winner.textContent = result.outcome==='eliminated'?'No eligible racers remain.':`Winner ${result.winners.map(s => s.toUpperCase()).join(' / ')}`;
      const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Race again'; button.onclick = again;
      sheet.append(title, summary, winner, button); root.append(sheet);
      document.querySelector<HTMLElement>('.game-surface')!.inert = true;
      button.focus({ preventScroll: true });
    },
    hide() { if (!shown) return; shown = undefined; root.hidden = true; root.replaceChildren(); delete root.dataset.initialRace; root.setAttribute('aria-labelledby', 'survive-results-heading'); document.querySelector<HTMLElement>('.game-surface')!.inert = false; },
  };
}
