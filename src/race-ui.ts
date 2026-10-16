import { characterById } from './content.js';
import type { SessionPresentation, Renderer } from './render.js';
import { modelThumbnail } from './render.js';
import { validateRaceSetup } from './race.js';
import './race-ui.css';
import type { RaceProposal, RaceResult, RaceCoordinator } from './race.js';
import type { SessionSetupSeat } from './session-ui.js';

/** Pages the existing target choices without changing the captured action authority. */
export function pageRaceTargets(board:HTMLElement):void {
 const choices=board.querySelector<HTMLElement>('.race-target-choices');if(!choices)return;
 const targets=[...choices.querySelectorAll<HTMLButtonElement>('button')];if(!targets.length)return;
 choices.setAttribute('role','radiogroup');for(const target of targets){target.setAttribute('role','radio');target.setAttribute('aria-checked',target.getAttribute('aria-pressed')??'false');}
 const nav=document.createElement('nav');nav.className='race-target-nav';nav.setAttribute('aria-label','Target pages');const label=document.createElement('span');
 const sync=()=>{const selected=targets.findIndex(b=>b.getAttribute('aria-pressed')==='true');label.textContent=`Target ${selected+1} / ${targets.length}`;for(const target of targets)target.setAttribute('aria-checked',target.getAttribute('aria-pressed')??'false');};
 for(const [copy,delta]of [['Previous target',-1],['Next target',1]] as const){const b=document.createElement('button');b.type='button';b.textContent=delta<0?'‹':'›';b.setAttribute('aria-label',copy);b.disabled=targets.length<2;b.onclick=()=>{const index=targets.findIndex(t=>t.getAttribute('aria-pressed')==='true');targets[(index+delta+targets.length)%targets.length]!.click();sync();};nav.append(b);if(delta<0)nav.append(label);}
 choices.addEventListener('click',sync);sync();choices.after(nav);
}

export function racePresentation(race:RaceCoordinator):SessionPresentation {
  return {cameraAnchor:race.leaderFrontier,boundary:race.fogBoundary,markers:race.session.players.map(p=>({seat:p.seat,leader:p.earnedDistance===race.leaderFrontier,status:race.status(p.seat),effect:race.fogState(p.seat).protectionUntil>race.elapsed?'lantern':p.hopCooldown.multiplier>1?'mud':undefined}))};
}
export function raceFogLabel(race:RaceCoordinator,seat:RaceCoordinator['session']['players'][number]['seat']):string {
  const p=race.session.players.find(p=>p.seat===seat)!,fog=race.fogState(seat);
  if((p.recovery?.protectionUntil??0)>race.session.world.time)return 'Protected — items return when the shield clears.';
  if(fog.protectionUntil>race.elapsed)return 'Lantern · fog safe';
  if(p.groundY===race.fogBoundary)return 'Fog line · safe';
  return p.groundY<race.fogBoundary?`Fog — feather in ${Math.max(0,1-fog.exposure).toFixed(1)}s`:'Safe';
}
export function renderRaceEdges(root:HTMLElement,race:RaceCoordinator,renderer:Renderer):void {
  root.hidden=!!race.result;
  const rows=race.session.players.map(p=>{const [x,y]=renderer.project(p.groundX,p.groundY),outside=x<0||x>renderer.width||y<0||y>renderer.height;return {p,outside,arrow:y<0?'↑':y>renderer.height?'↓':x<0?'←':'→'};}).filter(r=>r.outside);
  root.replaceChildren(...rows.map(({p,arrow})=>{const n=document.createElement('p');n.dataset.raceEdge=p.seat;n.textContent=`${arrow} ${p.marker} ${p.seat.toUpperCase()} · ${characterById(p.characterId).name} · ${p.groundY-race.leaderFrontier>=0?'+':''}${(p.groundY-race.leaderFrontier).toFixed(1)} lead / ${(p.groundY-race.fogBoundary)>=0?'+':''}${(p.groundY-race.fogBoundary).toFixed(1)} fog · ${p.health}/${p.maxHealth} · ${race.status(p.seat)}`;return n;}));
}

export function renderRaceHud(root: HTMLElement, race: RaceCoordinator): void {
  let cue = root.querySelector<HTMLElement>('.race-distance');
  if (!cue) { cue = document.createElement('p'); cue.className = 'race-distance'; root.prepend(cue); }
  cue.textContent = `Finish ${race.descriptor.settings.finishTiles} · ${Math.max(0, Math.ceil(race.descriptor.settings.activeSeconds-race.elapsed))}s`;
  cue.dataset.raceLead='true';cue.textContent+=` · Lead ${race.leaderFrontier} · fog ${race.fogBoundary}`;
  let boundary=root.querySelector<HTMLElement>('[data-race-boundary]');if(!boundary){boundary=document.createElement('p');boundary.dataset.raceBoundary='true';boundary.className='race-boundary';root.append(boundary);}boundary.textContent=`Fog begins ${race.fogBoundary} · 1 feather each second behind the line`;
  const statuses=race.session.players.map(p=>race.status(p.seat));
  let notice=root.querySelector<HTMLElement>('.race-lifecycle');
  if(!notice){notice=document.createElement('p');notice.className='race-lifecycle';notice.setAttribute('role','status');root.append(notice);}
  const lifecycleCopy=race.result?'Race complete.':race.waiting?'Waiting for a player to reclaim. A reserved seat can resume this race.':statuses.includes('recovery-offered')&&!statuses.includes('active')?'Everyone is down. Personal offers and the race clock continue.':statuses.filter(s=>s==='active').length===1?'Last racer: keep racing toward the finish.':'Race clock is live.';
  if(notice.textContent!==lifecycleCopy)notice.textContent=lifecycleCopy;
  for (const player of race.session.players){
    const tile=root.querySelector<HTMLElement>(`[data-seat="${player.seat}"]`)!;
    const state=race.status(player.seat),name=player.seat.toUpperCase();
    tile.dataset.raceHud='true';
    tile.querySelectorAll<HTMLButtonElement>('.session-hud-pager button').forEach((b,i)=>b.textContent=i?'›':'‹');
    tile.querySelector<HTMLElement>('[data-session-hud="power"]')!.textContent=`Power · ${player.powerReady?100:100-player.powerRemaining}/100 tiles${player.powerReady?' · Ready':''}`;
    if(!player.recovery?.offer)tile.querySelector<HTMLElement>('[data-session-hud="revive"]')!.textContent=`Personal revive · ${player.recovery?.charge==='available'?250:Math.max(0,250-((player.recovery?.nextRecharge??250)-(player.recovery?.personalHighWater??0)))}/250 tiles`;
    tile.querySelector<HTMLElement>('[data-session-hud="wallet"]')!.textContent=`${player.run.wallet} coins · ${player.earnedDistance===race.leaderFrontier?'Leader · ':''}${player.earnedDistance} tiles`;
    let fog=tile.querySelector<HTMLElement>('[data-race-fog]');if(!fog){fog=document.createElement('span');fog.dataset.raceFog='true';tile.querySelector('.session-hud-details')!.append(fog);}fog.textContent=raceFogLabel(race,player.seat);
    let effect=tile.querySelector<HTMLElement>('[data-race-effect]');if(!effect){effect=document.createElement('span');effect.dataset.raceEffect='true';tile.querySelector('.session-hud-details')!.append(effect);}
    const charge=race.session.consumableSnapshot()?.charges.find(c=>c.seat===player.seat);effect.textContent=race.fogState(player.seat).protectionUntil>race.elapsed?`Fog Lantern · ${(race.fogState(player.seat).protectionUntil-race.elapsed).toFixed(1)}s`:player.hopCooldown.multiplier>1?`Mudded · ${Math.max(0,(player.hopCooldown.until-race.session.world.time)/race.session.world.rules.simulation.worldTimeScale).toFixed(1)}s`:`Mud Splash ×${charge?.['mud-splash']??0} · Fog Lantern ×${charge?.['fog-lantern']??0}`;
    tile.querySelector('[data-session-hud="identity"]')!.setAttribute('aria-label',`${name} ${player.marker} ${characterById(player.characterId).name}, ${player.health}/${player.maxHealth} feathers, ${state}, ${player.earnedDistance===race.leaderFrontier?'Leader, ':''}${fog.textContent}`);

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
  let page: 'settings' | 'roster' | 'rules' = 'settings';
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
  for (const key of ['settings', 'roster', 'rules'] as const) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = key === 'settings' ? 'Settings' : key === 'roster' ? 'Roster' : 'Rules';
    button.onclick = () => { page = key; render(true); button.focus({ preventScroll: true }); }; nav.append(button);
  }
  const hint = document.createElement('p'); hint.id = 'race-setup-lock'; hint.textContent = 'Roster locks when the race starts.';
  const rules = document.createElement('p'); rules.id = 'race-setup-rules'; rules.textContent = 'Fog begins 12 tiles behind the lead and plucks 1 feather each second.';
  panel.append(choice, nav, fields, rules, hint, error);
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
    rules.hidden = !active || page !== 'rules';
    if (currentBoard) currentBoard.dataset.racePage = active ? (page === 'rules' ? 'settings' : page) : '';
    [...nav.children].forEach((button, index) => button.setAttribute('aria-pressed', String(index === (page === 'settings' ? 0 : page === 'roster' ? 1 : 2))));
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
