import { box } from './content.js';
import type { Model } from './content.js';
import { Renderer } from './render.js';

export interface MarketSceneState {
  visible: boolean;
  reducedMotion: boolean;
  background: string;
  foreground: string;
  primary: string;
}

type Point = readonly [number, number];
type RGB = readonly [number, number, number];
const CREAM = '#e9dba6', WOOD = '#946640', DARK_WOOD = '#694b36';

function polygon(ctx: CanvasRenderingContext2D, points: readonly Point[], color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath(); ctx.fill();
}

function rgb(ctx: CanvasRenderingContext2D, value: string, fallback: string): RGB {
  ctx.fillStyle = fallback; ctx.fillStyle = value;
  const normalized = ctx.fillStyle;
  if (normalized.startsWith('#')) {
    const hex = normalized.length === 4 ? normalized.slice(1).split('').map(c => c + c).join('') : normalized.slice(1, 7);
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  const channels = normalized.match(/[\d.]+/g);
  return channels && channels.length >= 3 ? [+channels[0]!, +channels[1]!, +channels[2]!] : [37, 53, 43];
}

function blend(a: RGB, b: RGB, amount: number): string {
  return `#${a.map((value, index) => Math.round(value + (b[index]! - value) * amount).toString(16).padStart(2, '0')).join('')}`;
}

const CRATE: Model = [
  box(0, 0, .02, .80, .70, .64, DARK_WOOD),
  ...[.10, .29, .48].flatMap(z => [
    box(0, -.365, z, .87, .055, .14, WOOD),
    box(.435, 0, z, .055, .79, .14, WOOD),
  ]),
  ...[-.31, .31].map(x => box(x, -.397, .06, .07, .03, .57, '#b58750')),
  box(0, 0, .66, .88, .80, .065, '#aa7b48'),
  ...[-.22, .22].map(x => box(x, 0, .726, .035, .80, .012, DARK_WOOD)),
];

function stall(accent: string): Model {
  return [
    ...[-.63, .63].flatMap(x => [-.34, .34].map(y => box(x, y, 0, .11, .11, 1.73, DARK_WOOD))),
    box(0, 0, .08, 1.3, .81, .65, WOOD),
    box(0, 0, .73, 1.5, .96, .12, '#b58c54'),
    ...[-.4, 0, .4].map(x => box(x, -.42, .16, .055, .035, .49, DARK_WOOD)),
    ...[-2, -1, 0, 1, 2].flatMap((stripe, index) => [
      box(stripe * .31, 0, 1.75, .31, 1.12, .12, index % 2 ? CREAM : accent),
      box(stripe * .31, -.54, 1.62, .31, .065, .16, index % 2 ? CREAM : accent),
    ]),
    box(-.33, -.04, .85, .42, .36, .06, DARK_WOOD),
    ...[-.45, -.21].map(x => box(x, -.04, .91, .19, .23, .19, '#c39442')),
    box(.30, .04, .85, .36, .33, .06, DARK_WOOD),
    box(.25, .02, .91, .18, .21, .16, '#95a65b'),
    box(.44, .09, .91, .15, .19, .19, '#788e4b'),
  ];
}

/** The shop is a place in the voxel world. DOM merchandise sits in its clearing. */
export function createMarketScene(canvas: HTMLCanvasElement): { update(state: MarketSceneState): void; dispose(): void } {
  const renderer = new Renderer(canvas), ctx = renderer.ctx;
  let state: MarketSceneState = { visible: false, reducedMotion: false, background: '#17382e', foreground: '#fff3c9', primary: '#d6b570' };
  let disposed = false, dirty = true;

  function draw(): void {
    if (disposed || !state.visible) { dirty = true; return; }
    const rect = canvas.getBoundingClientRect(), width = rect.width, height = rect.height;
    if (!width || !height) { dirty = true; return; }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const background = rgb(ctx, state.background, '#17382e'), foreground = rgb(ctx, state.foreground, '#fff3c9');
    const primary = rgb(ctx, state.primary, '#d6b570');
    const light = background[0] * .2126 + background[1] * .7152 + background[2] * .0722 > 150;
    const base = light ? [151, 166, 119] as const : [38, 61, 47] as const;
    const earth = blend(base, background, .23), paving = blend(base, foreground, light ? .025 : .035);
    ctx.fillStyle = earth; ctx.fillRect(0, 0, width, height);

    // Broad, quiet paving stays beneath every screen, instead of revealing the
    // running game through a translucent web panel. No random gameplay state.
    const tile = Math.max(30, Math.min(width / 12, 88));
    for (let row = -1; row < height / (tile * .53) + 1; row++) {
      const top = row * tile * .53;
      for (let column = -1; column < width / tile + 2; column++) {
        const left = column * tile + row % 2 * tile / 2;
        polygon(ctx, [[left, top], [left + tile * .92, top + tile * .075], [left + tile * .81, top + tile * .48], [left - tile * .10, top + tile * .405]],
          (row + column) % 3 ? paving : blend(base, background, .13));
      }
    }
    const shade = ctx.createRadialGradient(width * .5, height * .42, width * .10, width * .5, height * .42, Math.max(width, height) * .72);
    shade.addColorStop(0, 'rgba(20, 33, 24, 0)'); shade.addColorStop(1, light ? 'rgba(37, 49, 29, .18)' : 'rgba(9, 20, 14, .38)');
    ctx.fillStyle = shade; ctx.fillRect(0, 0, width, height);

    // The same box renderer and face lighting used by scenery and travelers.
    const propScale = Math.min(width * .079, height * .15, 108);
    renderer.width = 0; renderer.height = 0; renderer.camera = 0; renderer.scale = propScale;
    const prop = (model: Model, x: number, y: number, scale = 1): void => {
      ctx.save(); ctx.translate(x, y); renderer.scale = propScale * scale;
      renderer.shadow(0, 0, 1.55); renderer.model(model, 0, 0); ctx.restore();
    };
    if (width >= 480 && height >= 320) {
      prop(stall(blend([143, 93, 57], primary, .25)), width * .025, height * .48);
      prop(stall('#64836c'), width * .975, height * .53);
      prop(CRATE, width * .048, height * .73, .86);
      prop(CRATE, width * .97, height * .72, .82);
    }

    // Chunky awning boards are anchored to the screen edges like a close-up
    // trading stall. The center is clear for the actual goods and controls.
    const awning = Math.max(13, Math.min(height * .065, 50));
    const stripeWidth = Math.max(29, Math.min(width / 14, 96));
    const stripeColor = blend([146, 94, 58], primary, .22);
    const cream = blend([213, 194, 141], foreground, .14);
    ctx.fillStyle = light ? '#66503b30' : '#101b1280'; ctx.fillRect(0, awning, width, awning * .32);
    for (let i = -1; i < width / stripeWidth + 1; i++) {
      const x = i * stripeWidth, offset = awning * .43;
      polygon(ctx, [[x + offset, 0], [x + stripeWidth + offset, 0], [x + stripeWidth, awning], [x, awning]], i % 2 ? cream : stripeColor);
      polygon(ctx, [[x, awning], [x + stripeWidth, awning], [x + stripeWidth, awning * 1.15], [x, awning * 1.15]], i % 2 ? '#b6a373' : '#775939');
    }
    ctx.fillStyle = '#634b33'; ctx.fillRect(0, 0, width, Math.max(3, awning * .13));

    // Counter occupies the bottom sixth. Large controls can sit on its timber
    // surface; all grain remains low contrast so labels stay easy to read.
    const counter = height * .84, lip = Math.max(6, Math.min(height * .018, 15));
    ctx.fillStyle = '#19271c45'; ctx.fillRect(0, counter - lip, width, lip * 2);
    polygon(ctx, [[0, counter + lip], [width, counter + lip], [width, height], [0, height]], light ? '#886343' : '#694d36');
    const planks = Math.ceil(width / 125), plankWidth = width / planks;
    for (let plank = 0; plank < planks; plank++) {
      const x = plank * plankWidth;
      polygon(ctx, [[x, counter], [x + plankWidth - 2, counter], [x + plankWidth + 9, height], [x + 11, height]],
        plank % 2 ? (light ? '#a77c4d' : '#7c5b3b') : (light ? '#af8555' : '#82623f'));
      ctx.fillStyle = light ? '#78563832' : '#4b372b38';
      ctx.fillRect(x + plankWidth * .24, counter + height * .053, plankWidth * .26, Math.max(1, height * .002));
      ctx.fillRect(x + plankWidth * .62, counter + height * .10, plankWidth * .18, Math.max(1, height * .002));
    }
    ctx.fillStyle = light ? '#cba26a' : '#9b784b'; ctx.fillRect(0, counter, width, Math.max(3, lip * .42));
    ctx.fillStyle = '#523d2d'; ctx.fillRect(0, height - Math.max(5, height * .016), width, Math.max(5, height * .016));
    if (width >= 700 && height >= 400) {
      const coins: Model = [box(0, 0, 0, .34, .29, .09, '#c09b46'), box(0, 0, .09, .29, .27, .065, '#e0c26c'), box(.32, .07, 0, .27, .23, .065, '#d0ac4c')];
      prop(coins, width * .965, height * .91, .9);
    }
    dirty = false;
  }

  const observer = new ResizeObserver(() => { dirty = true; draw(); });
  observer.observe(canvas);
  return {
    update(next): void {
      if (disposed) return;
      dirty ||= state.background !== next.background || state.foreground !== next.foreground || state.primary !== next.primary || state.visible !== next.visible;
      state = next;
      if (dirty) draw();
    },
    dispose(): void { disposed = true; observer.disconnect(); },
  };
}
