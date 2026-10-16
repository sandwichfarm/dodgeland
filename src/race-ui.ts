import { characterById } from './content.js';
import { modelThumbnail } from './render.js';
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

/** Presentation reads only a frozen result, including on resize and page changes. */
export function createRaceResultsBoard(root: HTMLElement, again: () => void) {
  let shown: RaceResult | undefined, page=0, previousPageSize=20, previousPodium=1;
  const previews=new Map<string,string>();
  const metrics = (p:RaceResult['players'][number]):readonly (readonly [string,string|number])[] => [
    ['Earned tiles',p.distance],['Finish / end',`${(p.finishTime??p.terminalTime).toFixed(2)}s`],
    ['Deaths',p.deaths],['Personal revives',p.selfRevives],['Innate powers',p.innateUses],['Fog attempted',p.fogAttempted],
    ['Fog landed',p.fogLanded],['Fog seconds',p.fogSeconds.toFixed(2)],['Mud collected',p.mudCollected],['Mud used',p.mudUsed],
    ['Mud received',p.mudReceived],['Lantern collected',p.lanternCollected],['Lantern used',p.lanternUsed],['Pickups',p.pickups],
    ['Coins earned',p.coins],['Market interactions',p.marketInteractions],['Purchases',p.marketPurchases],['Coins spent',p.coinsSpent],
    ['Disconnected',`${p.ghostSeconds.toFixed(2)}s`],['Lifecycle',p.status],
  ];
  function render(focus?:string, resizing=false) {
    if(!shown)return;
    const result=shown,short=innerHeight<420,small=short||innerWidth<480,wide=!short&&innerWidth>=900;
    const ranked=[...result.players].sort((a,b)=>(a.rank??Infinity)-(b.rank??Infinity)||a.seat.localeCompare(b.seat));
    const tiersByRank=new Map<string,typeof ranked>();
    for(const p of ranked){const key=p.dnf?`DNF · ${p.dnf}`:p.rankLabel;const tier=tiersByRank.get(key)??[];tier.push(p);tiersByRank.set(key,tier);}
    const rankedTiers=[...tiersByRank];
    const perPage=short?2:innerWidth<480?8:innerWidth<1200?10:20,groups=Math.ceil(20/perPage),podiumPages=short?rankedTiers.length:1,total=podiumPages+result.players.length*groups;
    if(resizing&&page>=previousPodium){const oldGroups=Math.ceil(20/previousPageSize),selected=Math.floor((page-previousPodium)/oldGroups),metric=((page-previousPodium)%oldGroups)*previousPageSize;page=podiumPages+selected*groups+Math.floor(metric/perPage);}
    else if(resizing)page=Math.min(page,podiumPages-1);
    previousPageSize=perPage;previousPodium=podiumPages;
    page=Math.min(page,total-1);root.dataset.raceResultPage=String(page);
    root.replaceChildren();
    const notice=document.createElement('p');notice.className='survive-results-tiny';notice.textContent='Needs 240×240 to play — enlarge this pane.';
    const sheet=document.createElement('div');sheet.className='survive-results-sheet race-results-sheet';
    const title=document.createElement('h2');title.id='race-results-heading';title.textContent='Race results';
    const body=document.createElement('div');body.className='race-results-body';body.dataset.wide=String(wide&&page>0);
    function podium() {
      const node=document.createElement('section');node.className='race-podium';
      const outcome=document.createElement('h3');outcome.textContent=result.outcome==='time'?'Race time ended.':'Race complete.';
      const summary=document.createElement('p');summary.textContent=`Finish ${result.descriptor.settings.finishTiles} · ${result.elapsed.toFixed(2)}s`;
      const winner=document.createElement('p');winner.className='race-winner';winner.textContent=result.winners.length?`Winner ${result.winners.map(s=>s.toUpperCase()).join(' / ')}`:'No eligible racers remain.';
      node.append(outcome,summary,winner);
      const tiers=document.createElement('div');tiers.className='race-result-tiers';
      const visible=short?rankedTiers.slice(Math.min(page,podiumPages-1),Math.min(page,podiumPages-1)+1):rankedTiers;
      for(const [rank,members] of visible){
        const tier=document.createElement('section');tier.dataset.raceTier=rank;tier.dataset.rank=members[0]!.rankLabel;
        const label=document.createElement('strong');label.textContent=rank;
        const group=document.createElement('div');group.className='race-tier-members';
        for(const p of members){
          const row=document.createElement('p');row.dataset.raceMember=p.participantId;row.textContent=`${p.marker} · ${characterById(p.characterId).name}`;
          if(!short){const image=document.createElement('img');image.alt='';image.className='race-podium-character';if(!previews.has(p.characterId))previews.set(p.characterId,modelThumbnail(characterById(p.characterId).model,240));image.src=previews.get(p.characterId)!;row.prepend(image);}
          group.append(row);
        }
        if(short)outcome.textContent=`${rank} · ${result.outcome==='time'?'Race time ended.':'Race complete.'}`;
        else tier.append(label);
        tier.append(group);tiers.append(tier);
      }
      node.append(tiers);return node;
    }
    if(page<podiumPages)body.append(podium());
    else {
      if(wide)body.append(podium());
      const index=Math.floor((page-podiumPages)/groups),group=(page-podiumPages)%groups,p=result.players[index]!;
      const panel=document.createElement('section');panel.className='race-result-participant';panel.dataset.participant=p.participantId;
      const heading=document.createElement('h3');heading.textContent=`${p.marker} · ${characterById(p.characterId).name} · ${p.rankLabel}${p.dnf?` · ${p.dnf}`:''}`;
      if(!small){const image=document.createElement('img');image.alt='';image.className='race-result-character';if(!previews.has(p.characterId))previews.set(p.characterId,modelThumbnail(characterById(p.characterId).model,240));image.src=previews.get(p.characterId)!;panel.append(image);}
      const stats=document.createElement('dl');stats.className='race-result-statistics';
      for(const [label,value]of metrics(p).slice(group*perPage,(group+1)*perPage)){const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=String(value);row.append(dt,dd);stats.append(row);}
      panel.append(heading,stats);body.append(panel);
    }
    const nav=document.createElement('nav');nav.className='race-results-nav';nav.setAttribute('aria-label','Race result pages');
    for(const [delta,label]of [[-1,'Previous results'],[1,'Next results']] as const){const b=document.createElement('button');b.type='button';b.textContent=delta<0?'←':'→';b.setAttribute('aria-label',label);b.dataset.raceResultAction=delta<0?'previous':'next';b.disabled=delta<0?page===0:page===total-1;b.onclick=()=>{page+=delta;render(b.dataset.raceResultAction);};nav.append(b);}
    const position=document.createElement('span');position.setAttribute('aria-live','polite');position.textContent=`${page+1} / ${total}`;nav.insertBefore(position,nav.lastChild);
    const button=document.createElement('button');button.type='button';button.textContent='Race again';button.className='survive-results-again';button.dataset.raceResultAction='again';button.onclick=again;
    sheet.append(title,body,nav,button);root.append(notice,sheet);
    if(focus&&innerWidth>=240&&innerHeight>=240)(root.querySelector<HTMLButtonElement>(`[data-race-result-action="${focus}"]:not(:disabled)`)??button).focus({preventScroll:true});
  }
  addEventListener('resize',()=>{if(shown&&!root.hidden)render((document.activeElement as HTMLElement)?.dataset.raceResultAction??'again',true);});
  return {
    show(result: RaceResult) {
      if(shown===result&&!root.hidden)return;
      shown=result;page=0;root.hidden=false;root.dataset.initialRace='true';root.setAttribute('aria-labelledby','race-results-heading');
      document.querySelector<HTMLElement>('.game-surface')!.inert=true;render('again');
    },
    hide(){if(!shown)return;shown=undefined;root.hidden=true;root.replaceChildren();delete root.dataset.initialRace;delete root.dataset.raceResultPage;root.setAttribute('aria-labelledby','survive-results-heading');document.querySelector<HTMLElement>('.game-surface')!.inert=false;},
  };
}
