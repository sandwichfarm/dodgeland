import type { GameAudio, PlayOptions, SoundCue } from './audio.js';
import { spillPose } from './death-spill.js';
import type { DeathSpill, SpillDrop } from './death-spill.js';

interface SpillImpact extends PlayOptions { at: number; cue: SoundCue }
interface Contact { at: number; cue: SoundCue; amount: number; energy: number; pan: number; rate: number }

const CONTACT_WINDOW = .1;
const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value));

function material(drop: SpillDrop): SoundCue {
  if (drop.kind === 'coin') return 'spill.coin';
  const style = drop.item?.appearance.style;
  return style === 'hat' || style === 'shirt' ? 'spill.fabric' : 'spill.trinket';
}

/** Cluster nearby contacts, retaining their material and exact wallet value.
 * Large piles add density and weight, never one voice for every visible coin. */
export function spillImpacts(spill: DeathSpill, reduced = false): SpillImpact[] {
  const groups = new Map<string, Contact[]>();
  for (const drop of spill.drops) {
    const cue = material(drop);
    const times = reduced ? [0] : [drop.landing, drop.landing + drop.firstBounce,
      ...(cue === 'spill.fabric' ? [] : [drop.landing + drop.firstBounce + drop.secondBounce])];
    times.forEach((at, bounce) => {
      const pose = spillPose(drop, at, reduced);
      const contact: Contact = {
        at, cue, amount: drop.kind === 'coin' ? drop.amount : 1,
        energy: [1, .38, .14][bounce],
        pan: clamp(((pose.x - drop.originX) + (pose.y - drop.originY) * .3) / 3.4, -.85, .85),
        rate: 1 + Math.sin(drop.yaw + bounce) * .065,
      };
      const key = `${cue}:${Math.floor(at / CONTACT_WINDOW)}`;
      const group = groups.get(key);
      if (group) group.push(contact); else groups.set(key, [contact]);
    });
  }
  return [...groups.values()].map(contacts => {
    const amount = contacts.reduce((sum, contact) => sum + contact.amount, 0);
    const average = (key: 'energy' | 'pan' | 'rate'): number =>
      contacts.reduce((sum, contact) => sum + contact[key] * contact.amount / amount, 0);
    return {
      at: Math.min(...contacts.map(contact => contact.at)), cue: contacts[0].cue,
      gain: Math.min(.84, Math.min(.84, .36 + Math.log2(amount + 1) * .075) * average('energy')),
      pan: average('pan'), rate: average('rate'),
      variant: amount >= 16 ? 'heavy' : amount >= 4 ? 'mid' : 'light',
    };
  }).sort((a, b) => a.at - b.at);
}

/** Follow the same visible clock as the debris; no wall-clock timers or backlog. */
export class DeathSpillAudio {
  private spill: DeathSpill | null = null;
  private impacts: SpillImpact[] = [];
  private cursor = 0;
  private reduced = false;

  constructor(private readonly audio: Pick<GameAudio, 'play'>) {}

  reset(): void { this.spill = null; this.impacts = []; this.cursor = 0; }

  update(spill: DeathSpill | null, enabled: boolean, reduced = false): void {
    if (spill !== this.spill) {
      this.spill = spill; this.cursor = 0; this.reduced = reduced;
      this.impacts = spill ? spillImpacts(spill, reduced) : [];
    } else if (reduced !== this.reduced) {
      // Changing motion preferences mid-spill must not replay settled belongings.
      this.reduced = reduced; this.cursor = this.impacts.length;
    }
    if (!spill) return;
    while (this.cursor < this.impacts.length && this.impacts[this.cursor].at <= spill.age) {
      const impact = this.impacts[this.cursor++];
      // Muted/menu contacts are consumed. A suspended/late frame cannot flush
      // a whole pile into the mixer when playback becomes available again.
      if (enabled && spill.age - impact.at <= .075) {
        const { at: _, cue, ...options } = impact;
        this.audio.play(cue, options);
      }
    }
  }
}
