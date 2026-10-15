import { box, characterById, TRAIN_MODEL } from './content.js';
import type { Model, Voxel } from './content.js';
import { coinPosition, laneActors, laneDirection, platformSupports, platformSurface, random, trainPhase, vehicleBounds } from './game.js';
import type { Game, Lane } from './game.js';
import { crossingSignalAtScale } from './soundscape.js';
import { mobDefinition } from './mobs.js';
import type { Mob } from './mobs.js';
import { mobPose } from './mob-models.js';
import { marketScenery } from './market-scenery.js';
import { dressedModel } from './wearables.js';
import { vehicleModel, vehicleModelWidth } from './vehicle-models.js';
import { cosmeticModel } from './cosmetic-model.js';
import type { CosmeticDefinition } from './market/types.js';
import { spillPose } from './death-spill.js';
import { coinDenomination } from './coin-denominations.js';
import { coinPickupModel } from './coin-models.js';
import type { ConsumableWorldSnapshot, PlayerRender, SharedWorld } from './session.js';
const looseModels = new WeakMap<CosmeticDefinition, Model>();
const spillCoins: Model[] = Array.from({ length: 4 }, (_, pile) => Array.from({ length: pile + 1 }, (_, i) => [
  box(i % 2 * .04, i * .07, 0, .23, .055, .28, '#f1cd64'),
  box(i % 2 * .04, i * .07 - .032, .055, .075, .014, .17, '#fff1a1'),
  box(i % 2 * .04, i * .07 + .032, .055, .075, .014, .17, '#fff1a1'),
]).flat());
function looseModel(item: CosmeticDefinition): Model {
  let model = looseModels.get(item);
  if (!model) {
    const source = cosmeticModel(item);
    const width = Math.max(...source.map(v => v.x + v.w / 2)) - Math.min(...source.map(v => v.x - v.w / 2));
    const scale = .72 / Math.max(width, .1);
    model = source.map(v => ({ ...v, x: v.x * scale, y: v.y * scale, z: v.z * scale, w: v.w * scale, d: v.d * scale, h: v.h * scale }));
    looseModels.set(item, model);
  }
  return model;
}
type Point = [number, number];
type SceneObject = { x: number; y: number; draw: () => void };
type TravelerScene = Pick<Game, 'deathSpill' | 'hop' | 'rules' | 'groundX' | 'groundY' | 'lane' | 'rows' | 'fromY' | 'powerRescue' | 'x' | 'time' | 'mobs' | 'run' | 'hurtRemaining' | 'powerFlash' | 'power' | 'state' | 'caughtByWave'> & Partial<Pick<PlayerRender, 'protectionUntil'>>;
function shade(hex: string, amount: number): string { const n = parseInt(hex.slice(1), 16); return `rgb(${Math.max(0, Math.min(255, (n >> 16) + amount))},${Math.max(0, Math.min(255, (n >> 8 & 255) + amount))},${Math.max(0, Math.min(255, (n & 255) + amount))})`; }
function polygon(ctx: CanvasRenderingContext2D, points: Point[], color: string): void { ctx.fillStyle = color; ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); }
/** A brief whole-body look to the side, using the run clock so pausing freezes it. */
export function characterYaw(game: Pick<Game, 'time'>, character: string, reduced = false): number {
  if (reduced || character !== 'butter') return 0;
  const phase = game.time % 6;
  const ease = (t: number): number => (1 - Math.cos(Math.PI * t)) / 2;
  if (phase <= 2 || phase >= 4.15) return 0;
  if (phase < 2.75) return Math.PI / 3 * ease((phase - 2) / .75);
  if (phase <= 3.35) return Math.PI / 3;
  return Math.PI / 3 * (1 - ease((phase - 3.35) / .8));
}
export class Renderer {
  ctx: CanvasRenderingContext2D; width = 0; height = 0; scale = 40; camera = 0; reduced = false;
  backdrop = '#f4f2df'; ink = '#263c38';
  constructor(public canvas: HTMLCanvasElement) { this.ctx = canvas.getContext('2d')!; }
  resize(): void { const r = this.canvas.getBoundingClientRect(); this.width = r.width; this.height = r.height; const dpr = Math.min(devicePixelRatio || 1, 2); this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); this.scale = Math.min(this.width / 15.5, this.height / 10.2, 100); }
  project(x: number, row: number, z = 0): Point { return [this.width * .5 + (x + (row - this.camera) * .3) * this.scale, this.height * .71 + (x * .18 - (row - this.camera) * .62 - z) * this.scale]; }
  tile(x: number, row: number, w: number, d: number, color: string): void { polygon(this.ctx, [this.project(x - w / 2, row - d / 2), this.project(x + w / 2, row - d / 2), this.project(x + w / 2, row + d / 2), this.project(x - w / 2, row + d / 2)], color); }
  cube(v: Voxel, x: number, row: number, lift = 0): void {
    const l = x + v.x - v.w / 2, r = l + v.w, front = row - v.y - v.d / 2, back = front + v.d, z = lift + v.z, top = z + v.h;
    polygon(this.ctx, [this.project(l, front, z), this.project(r, front, z), this.project(r, front, top), this.project(l, front, top)], shade(v.color, -22));
    polygon(this.ctx, [this.project(r, front, z), this.project(r, back, z), this.project(r, back, top), this.project(r, front, top)], shade(v.color, -9));
    polygon(this.ctx, [this.project(l, front, top), this.project(r, front, top), this.project(r, back, top), this.project(l, back, top)], shade(v.color, 12));
  }
  model(model: Model, x: number, row: number, lift = 0, sx = 1): void { model.map(v => ({ ...v, x: v.x * sx, w: v.w * Math.abs(sx) })).sort((a, b) => (a.x * .18 + a.y * .62) - (b.x * .18 + b.y * .62)).forEach(v => this.cube(v, x, row, lift)); }
  /** Rotate every corner together: eyes, bill and wings stay attached to the body. */
  turnedModel(model: Model, x: number, row: number, lift = 0, yaw = 0, tilt = 0, floorAligned = false): void {
    const cosine = Math.cos(yaw), sine = Math.sin(yaw), pitchCos = Math.cos(tilt), pitchSin = Math.sin(tilt);
    // Camera direction in the model's unturned coordinates. The common rotation
    // leaves boxes axis-aligned here, allowing their real extents to set depth.
    const viewY = cosine - .3 * sine;
    const view = [.3 * cosine + sine, viewY * pitchCos + .674 * pitchSin, -viewY * pitchSin + .674 * pitchCos];
    const floorLift = floorAligned ? -Math.min(...model.flatMap(v => [v.y - v.d / 2, v.y + v.d / 2].flatMap(y => [v.z, v.z + v.h].map(z => y * pitchSin + z * pitchCos)))) : 0;
    const parts = model.map(v => ({
      voxel: v,
      low: [v.x - v.w / 2, v.y - v.d / 2, v.z],
      high: [v.x + v.w / 2, v.y + v.d / 2, v.z + v.h],
      depth: v.x * view[0]! + v.y * view[1]! + (v.z + v.h / 2) * view[2]!,
      behind: new Set<number>(),
    }));
    for (let a = 0; a < parts.length; a++) for (let b = a + 1; b < parts.length; b++) {
      let before = false, after = false;
      for (let axis = 0; axis < 3; axis++) {
        if (Math.abs(view[axis]!) < .000001) continue;
        const first = view[axis]! > 0 ? parts[a]! : parts[b]!;
        const second = view[axis]! > 0 ? parts[b]! : parts[a]!;
        before ||= first.high[axis]! <= second.low[axis]! + .000001;
        after ||= second.high[axis]! <= first.low[axis]! + .000001;
      }
      // Opposing separations mean the boxes do not occlude each other. For an
      // overlap in the authored model, retain the normal camera-depth fallback.
      if (before && !after) parts[b]!.behind.add(a);
      if (after && !before) parts[a]!.behind.add(b);
    }
    const point = (vx: number, vy: number, vz: number): Point => {
      const py = vy * pitchCos - vz * pitchSin, pz = vy * pitchSin + vz * pitchCos;
      return this.project(x + vx * cosine - py * sine, row - vx * sine - py * cosine, lift + floorLift + pz);
    };
    const pending = new Set(parts.map((_, index) => index));
    while (pending.size) {
      const ordered = [...pending].sort((a, b) => parts[a]!.depth - parts[b]!.depth);
      const next = ordered.find(index => [...parts[index]!.behind].every(other => !pending.has(other))) ?? ordered[0]!;
      pending.delete(next);
      const { voxel: v, low: [left, back, base], high: [right, front, top] } = parts[next]!;
      const faceX = view[0]! >= 0 ? right! : left!;
      const faceY = view[1]! >= 0 ? front! : back!;
      const xSign = Math.sign(view[0]!), ySign = Math.sign(view[1]!);
      const xShade = -15 + 6 * cosine * xSign - 7 * sine * xSign;
      const yShade = -15 - 6 * sine * ySign - 7 * cosine * ySign;
      polygon(this.ctx, [point(left!, faceY, base!), point(right!, faceY, base!), point(right!, faceY, top!), point(left!, faceY, top!)], shade(v.color, Math.round(yShade)));
      polygon(this.ctx, [point(faceX, back!, base!), point(faceX, front!, base!), point(faceX, front!, top!), point(faceX, back!, top!)], shade(v.color, Math.round(xShade)));
      const faceZ = view[2]! >= 0 ? top! : base!;
      polygon(this.ctx, [point(left!, back!, faceZ), point(right!, back!, faceZ), point(right!, front!, faceZ), point(left!, front!, faceZ)], shade(v.color, 12));
    }
  }
  shadow(x: number, row: number, width = .65, lift = 0): void { const [px, py] = this.project(x, row, lift); this.ctx.fillStyle = '#223d3826'; this.ctx.beginPath(); this.ctx.ellipse(px, py + this.scale * .07, width * this.scale / 2, this.scale * .13, .18, 0, Math.PI * 2); this.ctx.fill(); }
  /** Only arrivals and committed strikes need warnings; walking stays quiet. */
  mobMarker(mob: Mob): void {
    if (mob.phase !== 'spawning' && mob.phase !== 'windup' && mob.phase !== 'moving') return;
    const ctx = this.ctx, radius = mobDefinition(mob.kind).radius;
    const ring = (x: number, y: number, size: number): void => {
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const angle = i / 20 * Math.PI * 2;
        const p = this.project(x + Math.cos(angle) * size, y + Math.sin(angle) * size, .012);
        if (i) ctx.lineTo(...p); else ctx.moveTo(...p);
      }
      ctx.closePath();
    };
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (mob.phase === 'spawning') {
      ring(mob.x, mob.y, radius + .23);
      ctx.strokeStyle = '#31594f'; ctx.lineWidth = Math.max(3, this.scale * .075); ctx.stroke();
      ctx.strokeStyle = '#d9ffe5'; ctx.lineWidth = Math.max(1.5, this.scale * .034);
      ctx.setLineDash([this.scale * .10, this.scale * .07]); ctx.stroke();
    } else {
      const start = this.project(mob.fromX, mob.fromY, .013), end = this.project(mob.targetX, mob.targetY, .013);
      const dx = mob.targetX - mob.fromX, dy = mob.targetY - mob.fromY, length = Math.hypot(dx, dy);
      ctx.globalAlpha = mob.phase === 'moving' ? .70 : 1;
      ctx.beginPath(); ctx.moveTo(...start); ctx.lineTo(...end);
      ctx.strokeStyle = '#643344'; ctx.lineWidth = Math.max(3.5, this.scale * .085); ctx.stroke();
      ctx.strokeStyle = '#ffe095'; ctx.lineWidth = Math.max(1.5, this.scale * .035); ctx.stroke();
      if (length > .08) {
        const ux = dx / length, uy = dy / length;
        for (let distance = .5; distance < length - .2; distance += .65) {
          const x = mob.fromX + ux * distance, y = mob.fromY + uy * distance;
          polygon(ctx, [this.project(x + ux * .12, y + uy * .12, .014), this.project(x - ux * .10 - uy * .11, y - uy * .10 + ux * .11, .014), this.project(x - ux * .10 + uy * .11, y - uy * .10 - ux * .11, .014)], '#fff4cc');
        }
      }
      ring(mob.targetX, mob.targetY, radius + .10);
      ctx.strokeStyle = '#643344'; ctx.lineWidth = Math.max(4, this.scale * .09); ctx.stroke();
      ctx.strokeStyle = '#f49a73'; ctx.lineWidth = Math.max(2, this.scale * .045); ctx.stroke();
      const cross = .08;
      ctx.beginPath(); ctx.moveTo(...this.project(mob.targetX - cross, mob.targetY - cross, .014)); ctx.lineTo(...this.project(mob.targetX + cross, mob.targetY + cross, .014));
      ctx.moveTo(...this.project(mob.targetX + cross, mob.targetY - cross, .014)); ctx.lineTo(...this.project(mob.targetX - cross, mob.targetY + cross, .014)); ctx.stroke();
    }
    ctx.restore();
  }
  /** A steady overhead warning survives a close duck hiding the ground path. */
  mobWindupWarning(mob: Mob): void {
    if (mob.phase !== 'windup' || mob.kind === 'slime') return;
    const ctx = this.ctx, [x, y] = this.project(mob.x, mob.y, 1.75);
    const size = Math.max(7, Math.min(14, this.scale * .18));
    if (x + size < 0 || x - size > this.width || y + size < 0 || y - size > this.height) return;
    ctx.save(); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - size); ctx.lineTo(x + size, y + size * .65); ctx.lineTo(x - size, y + size * .65); ctx.closePath();
    ctx.fillStyle = '#ffe095'; ctx.fill();
    ctx.strokeStyle = '#643344'; ctx.lineWidth = Math.max(1.5, size * .16); ctx.stroke();
    ctx.fillStyle = '#643344';
    ctx.fillRect(x - size * .10, y - size * .45, size * .20, size * .55);
    ctx.fillRect(x - size * .10, y + size * .25, size * .20, size * .20);
    ctx.restore();
  }
  lane(lane: Lane, time: number): void {
    const { index: y, kind, world } = lane, c = world.colors;
    const span = Math.ceil(this.width / this.scale) + 24;
    this.tile(0, y, span * 2, 1.025, kind === 'road' ? c.road : kind === 'river' ? c.water : kind === 'rail' ? c.rail : y % 2 ? c.ground : c.alternate);
    if (kind === 'meadow') {
      const rng = random(y * 13 + 981);
      for (let i = 0; i < 16; i++) { const x = rng() * 20 - 10; this.tile(x, y + rng() * .7 - .35, .06, .12, shade(c.ground, rng() < .5 ? 14 : -12)); }
    } else if (kind === 'road') {
      for (let x = -span; x < span; x += 2) this.tile(x, y + .42, .65, .025, '#d9dec19c');
    } else if (kind === 'river') {
      for (let x = -span; x < span; x += 2.2) this.tile(x + Math.sin(time + y) * .2, y + .3, .7, .025, c.foam);
    } else {
      for (let x = -span; x < span; x += .45) this.tile(x, y, .1, .65, '#716f65');
      this.tile(0, y - .24, span * 2, .04, '#c6c7b4'); this.tile(0, y + .24, span * 2, .04, '#c6c7b4');
    }
    // The playable width stays visible even in a huge panoramic frame.
    if (kind !== 'river') for (const x of [-5.65, 5.65]) this.tile(x, y, .045, .85, c.edge);
  }
  /** The foam's leading edge is the collision boundary, in world coordinates. */
  wave(row: number, time: number): void {
    const span = Math.ceil((this.width + this.height) / this.scale) + 24;
    // Opaque water makes the lost ground legible in every biome. It sits below
    // platforms and travelers, so a safe duck cannot disappear behind the crest.
    this.tile(0, row - span, span * 2, span * 2, '#187c91');
    this.tile(0, row - .7, span * 2, 1.4, '#239eb1');
    this.tile(0, row - .27, span * 2, .54, '#6ed9d3');
    this.tile(0, row - .065, span * 2, .13, '#f2ffde');
    const flow = this.reduced ? 0 : time * .65;
    const halfWidth = this.width / this.scale / 2 + 1;
    const center = -(row - this.camera) * .3;
    for (let x = Math.floor((center - halfWidth) / .65) * .65; x < center + halfWidth; x += .65) {
      const pulse = this.reduced ? .5 : (Math.sin(time * 3 + x * 2) + 1) / 2;
      // Blocky scallops trail the exact front; decorative foam never runs ahead.
      this.tile(x, row - .14 - pulse * .055, .32, .16 + pulse * .11, '#f2ffde');
      this.tile(x + .29, row - .49 - pulse * .08, .29, .09, '#b8f0dc');
    }
    for (let depth = 1; depth < 16; depth++) {
      const drift = (flow + depth * .37) % 1;
      const trail = row - depth - drift;
      const trailCenter = -(trail - this.camera) * .3;
      for (let x = Math.floor((trailCenter - halfWidth) / 2.1) * 2.1; x < trailCenter + halfWidth; x += 2.1) {
        const y = this.project(x, trail)[1];
        if (y < -this.scale || y > this.height + this.scale) continue;
        this.tile(x + (depth % 2) * .75, trail, .52, .035, depth < 3 ? '#76d4d2' : '#379eac');
        this.tile(x + .4, trail - .09, .16, .045, '#379eac');
      }
    }
  }
  draw(game: Game, character: string, dt: number): void {
    this.drawScene(game, character, dt);
  }

  private drawScene(game: Game, character: string, dt: number, players?: readonly PlayerRender[]): void {
    if (!this.width) return;
    const leader = players?.filter(player => player.state === 'playing')
      .sort((a, b) => b.groundY - a.groundY || a.seat.localeCompare(b.seat))[0];
    // Solo retains its historical frontier target and exact smoothing arithmetic.
    // A session follows actual interpolated travel and keeps its last camera if no seat is active.
    const cameraTarget = players ? leader?.groundY ?? this.camera : game.maxY;
    this.camera = this.reduced ? cameraTarget : this.camera + (cameraTarget - this.camera) * Math.min(1, dt * 8);
    const ctx = this.ctx; ctx.clearRect(0, 0, this.width, this.height); ctx.fillStyle = this.backdrop; ctx.fillRect(0, 0, this.width, this.height);
    const rows = [...game.rows.values()].sort((a, b) => b.index - a.index);
    for (const lane of rows) this.lane(lane, game.time);
    if (game.run.market && game.run.market.remaining > 0 && game.state !== 'dead') {
      // The market invitation paints the ground, below all solid hazards.
      // It follows the traveler while the finite invitation is available.
      ctx.save(); ctx.globalAlpha = .55; ctx.strokeStyle = '#ffe29a'; ctx.lineWidth = Math.max(2, this.scale * .055);
      for (const side of [-1, 1]) {
        const points = [this.project(side * 4.8, game.groundY - 1.1), this.project(side * 4.8, game.groundY + 1.3), this.project(side * 3.6, game.groundY + 1.3)];
        ctx.beginPath(); points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
        this.tile(side * 4.8, game.groundY, .13, 1.7, '#f1cd64');
      }
      ctx.restore();
    }
    const showWave = game.rules.presentation.pursuitVisible && (players ? players.some(player => player.state !== 'ready') : game.state !== 'ready');
    if (showWave) this.wave(game.waveRow, game.time);
    const objects: SceneObject[] = [];
    const platforms: typeof objects = [];
    const markers: typeof objects = [];
    for (const lane of rows) {
      const y = lane.index, world = lane.world;
      for (const d of lane.decorations) {
        const stand = marketScenery(game.runSeed?.seed ?? game.seed, lane, d);
        const model = stand?.model ?? world.scenery[d.variant]!;
        objects.push({ x: d.x, y, draw: () => { this.shadow(d.x, y, stand?.footprint ?? .7); this.model(model, d.x, y); } });
      }
      if (lane.kind === 'river') for (const actor of laneActors(lane, game.time)) {
        platforms.push({ x: actor.x, y, draw: () => this.model(world.platforms[lane.variant % world.platforms.length]!, actor.x, y, 0, actor.length) });
      }
      if (lane.kind === 'road') for (const actor of laneActors(lane, game.time)) {
        const { x, length } = actor, model = vehicleModel(lane, actor);
        const direction = laneDirection(lane);
        if (actor.kind === 'sports' && actor.accelerating && actor.speed !== 0 && !this.reduced) {
          // Short road streaks explain the actual acceleration. They stop when
          // traffic is frozen and never extend the solid vehicle silhouette.
          markers.push({ x, y, draw: () => {
            ctx.save(); ctx.globalAlpha = .46;
            for (const side of [-1, 1]) this.tile(x - direction * (length / 2 + .17), y + side * .23, .22, .026, '#fff0cf');
            ctx.restore();
          } });
        }
        objects.push({ x, y, draw: () => { this.shadow(x, y, length); this.model(model, x, y, 0, length / vehicleModelWidth(model) * direction); } });
      }
      if (lane.kind === 'rail') {
        const train = trainPhase(lane, game.time);
        const signal = crossingSignalAtScale(lane, game.time, game.rules.simulation.worldTimeScale);
        for (const x of [-5.8, 5.8]) objects.push({ x, y, draw: () => { this.cube(box(0, 0, 0, .1, .1, .8, '#677261'), x, y); this.cube(box(0, 0, .8, .28, .23, .15, (this.reduced ? signal.active : signal.lit) ? '#f27459' : '#d6b972'), x, y); } });
        if (train.x !== null) { const x = train.x; objects.push({ x, y, draw: () => { for (const voxel of TRAIN_MODEL) this.cube(voxel, x, y); } }); }
      }
    }
    // Flying coins have their own lifetime and position; their source terrain
    // may already be pruned. Draw each reward exactly once at that position.
    const rewards = [...rows.filter(lane => !lane.coinPull), ...game.attractedCoins.values()];
    for (const lane of rewards) {
      const coin = coinPosition(lane, game.time);
      if (coin) {
        const x = coin.x, coinY = coin.y, surface = lane.coinPull?.z ?? (lane.kind === 'river' ? platformSurface(lane) : 0);
        const denomination = coinDenomination(lane.coinDenomination), model = coinPickupModel(denomination.id);
        objects.push({ x, y: coinY, draw: () => {
          const lift = surface + (this.reduced ? 0 : Math.sin(game.time * 3 + coinY) * .045);
          this.shadow(x, coinY, Math.max(.3, denomination.width), surface);
          if (denomination.id === 'coin') {
            // Preserve the original bar and its fixed glint for legacy courses.
            this.cube(model[0]!, x, coinY, lift); this.cube(model[1]!, x, coinY, surface);
          } else this.model(model, x, coinY, lift);
          if (denomination.value > 1) {
            const height = Math.max(...model.map(voxel => voxel.z + voxel.h));
            const [px, py] = this.project(x, coinY, lift + height + .10);
            ctx.save(); ctx.font = `bold ${Math.max(10, this.scale * .22)}px sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.lineJoin = 'round';
            ctx.strokeStyle = '#3d3022'; ctx.lineWidth = Math.max(2, this.scale * .045); ctx.strokeText(String(denomination.value), px, py);
            ctx.fillStyle = '#fff0b0'; ctx.fillText(String(denomination.value), px, py); ctx.restore();
          }
        } });
      }
    }
    const consumables = game.worldExtensionSnapshot<ConsumableWorldSnapshot>();
    for (const pickup of consumables?.pickups ?? []) {
      const color = pickup.itemId === 'revival' ? '#76d6a1' : '#f28b55';
      objects.push({ x: pickup.x, y: pickup.y, draw: () => {
        this.shadow(pickup.x, pickup.y, .42);
        this.cube(box(0, 0, .02, .38, .30, .34, color), pickup.x, pickup.y);
        const [tx, ty] = this.project(pickup.x, pickup.y, .48);
        ctx.save(); ctx.font = `bold ${Math.max(9, this.scale * .18)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.lineWidth = Math.max(2, this.scale * .035); ctx.strokeStyle = '#263c38'; ctx.strokeText(pickup.itemId === 'revival' ? 'Revival' : 'Flare', tx, ty); ctx.fillStyle = '#fff8d8'; ctx.fillText(pickup.itemId === 'revival' ? 'Revival' : 'Flare', tx, ty); ctx.restore();
      } });
    }
    for (const mob of game.mobs) {
      markers.push({ x: mob.x, y: mob.y, draw: () => this.mobMarker(mob) });
      objects.push({ x: mob.x, y: mob.y, draw: () => {
        const pose = mobPose(mob, game.time, this.reduced);
        this.shadow(mob.x, mob.y, mobDefinition(mob.kind).radius * 2);
        ctx.save();
        if (mob.phase === 'spawning') ctx.globalAlpha = .5;
        this.turnedModel(pose.model, mob.x, mob.y, pose.lift, pose.yaw);
        ctx.restore();
      } });
    }
    const travelerOverlays: (() => void)[] = [];
    if (players) {
      const orderedPlayers = [...players].sort((a, b) => a.seat.localeCompare(b.seat));
      const labels = this.packSessionLabels(orderedPlayers);
      for (const player of orderedPlayers) {
        const lane = game.rows.get(player.y);
        if (!lane) continue;
        const traveler: TravelerScene = { ...player, lane, rows: game.rows, rules: game.rules, time: game.time, mobs: game.mobs };
        const marker = ({ p1: '▲', p2: '●', p3: '◆', p4: '■' } as const)[player.seat];
        travelerOverlays.push(this.appendTraveler(traveler, player.characterId, rows, objects, markers, showWave, `${marker} ${player.seat.toUpperCase()} · ${characterById(player.characterId).name}`, labels.get(player.seat)));
      }
    } else {
      travelerOverlays.push(this.appendTraveler(game, character, rows, objects, markers, showWave));
    }
    // Low river surfaces must be below riders regardless of their centers. Tall
    // scenery and traffic keep their normal depth order, including in front of Pip.
    for (const layer of [platforms, markers, objects]) {
      layer.sort((a, b) => this.project(a.x, a.y)[1] - this.project(b.x, b.y)[1]);
      for (const object of layer) { const [x, y] = this.project(object.x, object.y); if (x > -this.scale * 8 && x < this.width + this.scale * 8 && y > -this.scale * 3 && y < this.height + this.scale * 3) object.draw(); }
    }
    for (const overlay of travelerOverlays) overlay();
    // These are intentional overlays: neither traveler nor scenery may hide
    // preparation for a strike. Their ground paths remain below the bodies.
    for (const mob of game.mobs) this.mobWindupWarning(mob);
  }

  /** Keep session identities readable when their travelers share a spawn or tile. */
  private packSessionLabels(players: readonly PlayerRender[]): Map<PlayerRender['seat'], Point> {
    const ctx = this.ctx, fontSize = Math.max(10, this.scale * .22), lineHeight = fontSize + Math.max(4, this.scale * .06);
    const placed: { left: number; right: number; top: number; bottom: number }[] = [];
    const labels = new Map<PlayerRender['seat'], Point>();
    ctx.save(); ctx.font = `bold ${fontSize}px sans-serif`;
    for (const player of players) {
      const marker = ({ p1: '▲', p2: '●', p3: '◆', p4: '■' } as const)[player.seat];
      const text = `${marker} ${player.seat.toUpperCase()} · ${characterById(player.characterId).name}`;
      const width = ctx.measureText(text).width + Math.max(4, this.scale * .09);
      let [x, y] = this.project(player.groundX, player.groundY, 1.1);
      let rect = { left: x - width / 2, right: x + width / 2, top: y - lineHeight, bottom: y };
      for (let attempt = 0; attempt < 8 && placed.some(other => rect.left < other.right && rect.right > other.left && rect.top < other.bottom && rect.bottom > other.top); attempt++) {
        y -= lineHeight;
        rect = { left: x - width / 2, right: x + width / 2, top: y - lineHeight, bottom: y };
      }
      placed.push(rect); labels.set(player.seat, [x, y]);
    }
    ctx.restore();
    return labels;
  }

  /** Queue each body, trail, rescue, and spill in the same layers as the world. */
  private appendTraveler(game: TravelerScene, character: string, rows: readonly Lane[], objects: SceneObject[], markers: SceneObject[], showWave: boolean, label?: string, labelPosition?: Point): () => void {
    const ctx = this.ctx;
    if (game.deathSpill) for (const drop of game.deathSpill.drops) {
      const pose = spillPose(drop, game.deathSpill.age, this.reduced);
      const model = drop.kind === 'coin' ? spillCoins[Math.min(3, Math.floor(Math.log2(drop.amount)))]! : looseModel(drop.item!);
      objects.push({ x: pose.x, y: pose.y, draw: () => {
        this.shadow(pose.x, pose.y, drop.kind === 'coin' ? .24 : .65);
        this.turnedModel(model, pose.x, pose.y, pose.z + .015, pose.yaw, pose.tilt, true);
      } });
    }
    const f = game.hop / game.rules.movement.hopDuration;
    const px = game.groundX, py = game.groundY;
    const landingSurface = platformSurface(game.lane);
    // Ground travel and changing platform heights convey collisions, even when
    // Less motion removes the decorative bounce and whole-body turn.
    const surface = game.hop > 0 ? platformSurface(game.rows.get(game.fromY)) * f + landingSurface * (1 - f) : landingSurface;
    const supported = !!game.powerRescue || game.hop > 0 || game.lane.kind !== 'river' || platformSupports(game.lane, game.x, game.time);
    // Hops are grounded travel. Lower the cosmetic arc near a solid pursuer so
    // the duck cannot appear to jump over a body that can still catch it.
    const nearestMob = game.mobs.reduce((distance, mob) => mob.phase === 'spawning' ? distance : Math.min(distance, Math.hypot(mob.x - px, mob.y - py)), Infinity);
    let carClearance = Infinity;
    for (const lane of rows) {
      if (lane.kind !== 'road' || Math.abs(lane.index - py) > 2) continue;
      for (const actor of laneActors(lane, game.time)) {
        const bounds = vehicleBounds(lane, actor);
        const dx = Math.max(actor.x + bounds.minX - px, 0, px - actor.x - bounds.maxX);
        const dy = Math.max(lane.index + bounds.minY - py, 0, py - lane.index - bounds.maxY);
        carClearance = Math.min(carClearance, Math.hypot(dx, dy));
      }
    }
    const hopScale = Math.min(1, .28 + Math.max(0, Math.min(nearestMob - .55, carClearance - .15)) * .9);
    const rescue = game.powerRescue;
    const rescueProgress = rescue ? 1 - rescue.remaining / rescue.power.duration : 0;
    const lift = rescue ? Math.sin(rescueProgress * Math.PI) * rescue.power.lift * (this.reduced ? .3 : 1)
      : (supported ? surface : 0) + (!this.reduced ? Math.sin(f * Math.PI) * .36 * hopScale : 0);
    if (rescue) markers.push({ x: rescue.fromX, y: rescue.fromY, draw: () => {
      const [x, y] = this.project(rescue.fromX, rescue.fromY, .02);
      const radius = this.scale * (this.reduced ? .5 : .25 + rescueProgress * .75);
      ctx.save(); ctx.globalAlpha = .7 * (1 - rescueProgress);
      ctx.strokeStyle = rescue.power.color; ctx.lineWidth = Math.max(2, this.scale * .05);
      ctx.beginPath(); ctx.ellipse(x, y, radius, radius * .4, .18, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    } });
    const cosmetic = game.run.cosmetic;
    if (cosmetic?.appearance.style === 'trail') for (let i = 1; i <= 3; i++) {
      const tx = px + (i % 2 ? -.12 : .12), ty = py - .35 * i;
      markers.push({ x: tx, y: ty, draw: () => { ctx.save(); ctx.globalAlpha = .65 - .13 * i; this.tile(tx, ty, .16, .22, cosmetic.appearance.color); ctx.restore(); } });
    }
    objects.push({ x: px, y: py, draw: () => {
      this.shadow(px, py, .65, supported ? surface : 0);
      ctx.save();
      if (game.hurtRemaining > 0) {
        // A steady recovery halo reads in Less motion too, without flashing.
        const [hx, hy] = this.project(px, py, supported ? surface : 0);
        ctx.beginPath(); ctx.ellipse(hx, hy + this.scale * .07, this.scale * .45, this.scale * .18, .18, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff2be'; ctx.lineWidth = Math.max(2, this.scale * .045); ctx.stroke();
        ctx.globalAlpha = .8;
      }
      if (game.powerFlash > 0) {
        const [hx, hy] = this.project(px, py, .06);
        ctx.save(); ctx.globalAlpha = game.powerFlash;
        ctx.strokeStyle = rescue?.power.color ?? game.power.color; ctx.lineWidth = Math.max(2, this.scale * .045);
        ctx.beginPath(); ctx.ellipse(hx, hy, this.scale * .52, this.scale * .2, .18, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      if (game.state === 'dead') ctx.globalAlpha = .55;
      const traveler = characterById(character);
      const dressed = dressedModel(traveler, game.run.equippedCosmetics);
      if (traveler.id === 'butter' || traveler.id === 'sunny' || rescue || dressed !== traveler.model) this.turnedModel(dressed, px, py, lift, characterYaw(game, traveler.id, this.reduced));
      else this.model(dressed, px, py, lift);
      if (cosmetic?.appearance.style === 'halo') {
        const [x, y] = this.project(px, py, lift + 1.06);
        ctx.beginPath(); ctx.ellipse(x, y, this.scale * .3, this.scale * .085, .15, 0, Math.PI * 2);
        ctx.strokeStyle = cosmetic.appearance.color; ctx.lineWidth = Math.max(2, this.scale * .045); ctx.stroke();
      } else if (cosmetic?.appearance.style === 'sparkles') {
        for (let i = 0; i < 4; i++) {
          const angle = i * Math.PI / 2 + (this.reduced ? 0 : game.time * .7);
          const [x, y] = this.project(px + Math.cos(angle) * .48, py + Math.sin(angle) * .35, lift + .5 + i * .08), size = this.scale * .08;
          ctx.strokeStyle = cosmetic.appearance.color; ctx.lineWidth = Math.max(1.5, this.scale * .025); ctx.beginPath();
          ctx.moveTo(x - size, y); ctx.lineTo(x + size, y); ctx.moveTo(x, y - size); ctx.lineTo(x, y + size); ctx.stroke();
        }
      }
      if (game.run.powers.length) {
        const [x, y] = this.project(px, py, lift + .45);
        ctx.globalAlpha = .75; ctx.strokeStyle = game.run.effects.shield > 0 ? '#bdf7ff' : '#dcc7ff'; ctx.lineWidth = Math.max(2, this.scale * .035);
        ctx.beginPath(); ctx.ellipse(x, y, this.scale * .55, this.scale * .68, -.08, 0, Math.PI * 2); ctx.stroke();
      }
      if ((game.protectionUntil ?? 0) > game.time) {
        const [x, y] = this.project(px, py, lift + .78);
        ctx.save(); ctx.strokeStyle = '#bdf7ff'; ctx.lineWidth = Math.max(2, this.scale * .04); ctx.beginPath(); ctx.ellipse(x, y, this.scale * .55, this.scale * .25, .18, 0, Math.PI * 2); ctx.stroke();
        ctx.font = `bold ${Math.max(9, this.scale * .17)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = '#e8fdff'; ctx.fillText('Protected', x, y - this.scale * .22); ctx.restore();
      }
      ctx.restore();
    } });
    return () => {
      if (showWave && game.caughtByWave) {
        // A frozen splash marks the contact point and leaves the traveler readable.
        for (const side of [-1, 1]) {
          this.cube(box(0, 0, .03, .27, .18, .12, '#b8f0dc'), px + side * .38, py - .03);
          this.cube(box(0, 0, .04, .16, .12, .2, '#f2ffde'), px + side * .52, py + .08);
        }
        this.cube(box(0, 0, .02, .64, .12, .1, '#f2ffde'), px, py - .29);
      }
      if (label) {
        const [x, y] = labelPosition ?? this.project(px, py, lift + 1.1);
        ctx.save();
        ctx.font = `bold ${Math.max(10, this.scale * .22)}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.lineWidth = Math.max(2, this.scale * .045); ctx.strokeStyle = '#263c38'; ctx.strokeText(label, x, y);
        ctx.fillStyle = '#fff8d8'; ctx.fillText(label, x, y); ctx.restore();
      }
    };
  }

  /** One course, one camera, and one shared depth ordering for every traveler. */
  drawSession(world: SharedWorld, players: readonly PlayerRender[], dt: number): void {
    this.drawScene(world.host, world.host.characterId, dt, players);
  }
}
export function modelThumbnail(model: Model): string { const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 140; const renderer = new Renderer(canvas); renderer.width = 160; renderer.height = 140; renderer.scale = 82; renderer.camera = 0; renderer.shadow(0, 0); renderer.model(model.map(v => ({ ...v, x: -v.x, y: -v.y })), 0, 0); return canvas.toDataURL(); }
