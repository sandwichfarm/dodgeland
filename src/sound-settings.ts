import { BUILTIN_PACKS, SOUND_CUES } from './audio.js';
import type { GameAudio, SoundCue } from './audio.js';
import type { Progress } from './game.js';
import { loadSoundPack } from './sound-loader.js';
import type { LoadedSoundPack } from './sound-loader.js';
import { runtimeHasDomain } from './domain-availability.js';

/** UI and asynchronous pack selection; gameplay only knows semantic sound cues. */
type SoundPreference = 'soundPack' | 'soundAddress' | 'muted' | 'musicVolume' | 'ambienceVolume' | 'effectsVolume';
export function createSoundSettings(audio: GameAudio, read: () => Progress, changed: (fields: SoundPreference[], save?: boolean) => void): { sync: () => void; dispose: () => void } {
  const element = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
  const select = element<HTMLSelectElement>('sound-pack');
  const muted = element<HTMLInputElement>('sound-muted');
  const toggle = element<HTMLButtonElement>('sound-toggle');
  const address = element<HTMLInputElement>('sound-address');
  const load = element<HTMLButtonElement>('sound-load');
  const status = element<HTMLElement>('sound-status');
  const previewCue = element<HTMLSelectElement>('sound-preview-cue');
  // The shell's document capture excludes text inputs but currently captures
  // range arrows as game actions. Let these native controls keep their keys.
  const nativeRangeKeys = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLInputElement && event.target.type === 'range' &&
      element('sound-panel').contains(event.target) && !event.ctrlKey && !event.altKey && !event.metaKey &&
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) event.stopPropagation();
  };
  window.addEventListener('keydown', nativeRangeKeys, true);
  const cueNames: Record<SoundCue, string> = {
    hop: 'Hop', coin: 'Coin', crash: 'Classic impact', splash: 'Classic splash', train: 'Crossing bell', idle: 'Wave warning',
    'call.duck': 'Butter’s quack', 'call.chicken': 'Sunny’s cluck', 'call.frog': 'Pip’s croak', 'call.axolotl': 'Petal’s bubbles', 'call.robot': 'Beep’s call', 'call.fox': 'Rust’s yip', 'call.penguin': 'Pebble’s peep',
    music: 'Music', 'ambience.wind': 'Wind', 'ambience.water': 'River ambience', 'ambience.birds': 'Birdsong',
    'traffic.pass': 'Passing traffic', 'traffic.honk': 'Car horn', 'train.pass': 'Passing train',
    'death.traffic': 'Traffic impact', 'death.train': 'Train impact', 'death.water': 'Open-water splash', 'death.wave': 'Caught by the wave', 'death.swept': 'Swept off the river', 'death.trail': 'Lost trail', 'death.mob': 'Caught by a mob',
    'mob.spawn': 'Mob appears', 'mob.attack': 'Mob attacks',
    'hurt.rear': 'Rear bumper bump', 'hurt.side': 'Car-side scrape', 'health.restore': 'Pluck restored',
    'spill.coin': 'Dropped coin clink', 'spill.fabric': 'Dropped clothes', 'spill.trinket': 'Dropped accessory',
  };
  for (const cue of SOUND_CUES) previewCue.add(new Option(cueNames[cue], cue));
  previewCue.value = 'coin';
  let remote: LoadedSoundPack | undefined, pending: AbortController | undefined, generation = 0, disposed = false;
  for (const pack of BUILTIN_PACKS) select.add(new Option(pack.name, pack.id));
  function mixControls(): void {
    const p = read();
    audio.setMix({ music: p.musicVolume, ambience: p.ambienceVolume, effects: p.effectsVolume });
    for (const [name, key] of [['music', 'musicVolume'], ['ambience', 'ambienceVolume'], ['effects', 'effectsVolume']] as const) {
      const value = Math.round(p[key] * 100);
      element<HTMLInputElement>(`${name}-volume`).value = String(value);
      element(`${name}-volume-value`).textContent = `${value}%`;
    }
  }
  for (const [name, key] of [['music', 'musicVolume'], ['ambience', 'ambienceVolume'], ['effects', 'effectsVolume']] as const) {
    const slider = element<HTMLInputElement>(`${name}-volume`);
    slider.addEventListener('input', () => { read()[key] = Number(slider.value) / 100; mixControls(); changed([key], false); });
    slider.addEventListener('change', () => changed([key]));
  }
  function muteControls(): void {
    const value = read().muted;
    audio.setMuted(value); muted.checked = value;
    toggle.textContent = value ? '♪̸' : '♪';
    toggle.title = value ? 'Unmute sounds' : 'Mute sounds';
    toggle.setAttribute('aria-label', toggle.title); toggle.setAttribute('aria-pressed', String(value));
    element<HTMLButtonElement>('sound-preview').disabled = value;
  }
  function cancel(): void { generation++; pending?.abort(); pending = undefined; load.disabled = !available; load.textContent = 'Load pack'; }
  const available = runtimeHasDomain('outbox') && runtimeHasDomain('resource');
  address.disabled = load.disabled = !available;
  element('sound-availability').hidden = available;
  async function importPack(value: string, remember: boolean): Promise<void> {
    cancel(); const request = generation; const controller = new AbortController(); pending = controller;
    const timeout = setTimeout(() => controller.abort(), 30_000);
    load.disabled = true; load.textContent = 'Loading…'; status.textContent = 'Loading sound pack…';
    try {
      const pack = await loadSoundPack(value, audio, controller.signal);
      if (disposed || request !== generation) return;
      remote = pack; audio.setClips(pack.clips, 'pond');
      select.querySelector('option[value="custom"]')?.remove(); select.add(new Option(pack.name, 'custom')); select.value = 'custom';
      read().soundPack = 'custom'; read().soundAddress = pack.address;
      status.textContent = `${pack.name} selected · ${pack.loaded}/${SOUND_CUES.length} sounds, Pond fills the rest.`;
      if (remember) changed(['soundPack', 'soundAddress']);
    } catch (error) {
      if (disposed || request !== generation) return;
      status.textContent = controller.signal.aborted ? 'Loading timed out. Your current sounds are still available.' : error instanceof Error ? error.message : 'Could not load this pack. Try again.';
    } finally {
      clearTimeout(timeout);
      if (request === generation && !disposed) { pending = undefined; load.disabled = !available; load.textContent = 'Load pack'; }
    }
  }
  select.addEventListener('change', () => {
    cancel(); read().soundPack = select.value;
    if (select.value === 'custom') {
      if (remote) { audio.setClips(remote.clips, 'pond'); status.textContent = `${remote.name} selected.`; }
      else if (available && read().soundAddress) void importPack(read().soundAddress, false);
    }
    else { audio.setBuiltin(select.value); status.textContent = BUILTIN_PACKS.find(p => p.id === select.value)?.description ?? ''; }
    audio.unlock(); changed(['soundPack']);
  });
  const setMute = (value: boolean): void => { read().muted = value; muteControls(); if (!value) audio.unlock(); changed(['muted']); };
  muted.addEventListener('change', () => setMute(muted.checked));
  toggle.addEventListener('click', () => setMute(!read().muted));
  element('sound-preview').addEventListener('click', () => { audio.stop(); audio.unlock(); audio.play(previewCue.value as SoundCue); });
  const requestPack = (): void => {
    if (!available || pending) return;
    if (!address.value.trim()) { status.textContent = 'Paste a sound-pack address first.'; return; }
    changed(['soundPack', 'soundAddress']);
    audio.unlock(); void importPack(address.value.trim(), true);
  };
  // allow-scripts napplets have no allow-forms authority, even for canceled submits.
  load.addEventListener('click', requestPack);
  address.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); requestPack(); } });
  return {
    sync(): void {
      if (disposed) return;
      muteControls(); mixControls();
      // A player selection started during storage hydration wins over the saved pack.
      if (pending) return;
      address.value = read().soundAddress;
      if (read().soundPack === 'custom' && read().soundAddress) {
        if (remote?.address === read().soundAddress) { select.value = 'custom'; audio.setClips(remote.clips, 'pond'); }
        else {
          audio.setBuiltin('pond');
          if (!select.querySelector('option[value="custom"]')) select.add(new Option('Saved pack · Pond fallback', 'custom'));
          select.value = 'custom';
          if (available) void importPack(read().soundAddress, false);
        }
      } else { select.value = read().soundPack; audio.setBuiltin(read().soundPack); }
    },
    dispose(): void { disposed = true; cancel(); window.removeEventListener('keydown', nativeRangeKeys, true); audio.dispose(); },
  };
}
