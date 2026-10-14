import { cosmeticModel, effectModel } from './cosmetic-model.js';
import type { Character, Model } from './content.js';
import type { CosmeticDefinition } from './market/types.js';
import { Renderer } from './render.js';
import { dressedModel } from './wearables.js';

export type MarketPreviewSubject =
  | { kind: 'cosmetic'; item: CosmeticDefinition }
  | { kind: 'character'; character: Character; cosmetics: readonly CosmeticDefinition[] };
export interface MarketPreview {
  element: HTMLCanvasElement;
  setSubject(subject: MarketPreviewSubject): void;
  setActive(active: boolean): void;
  setVisible(visible: boolean): void;
  setReducedMotion(reduced: boolean): void;
  dispose(): void;
}

const HOME_YAW = Math.PI * .83;
const FULL_TURN = Math.PI * 2;

function previewModel(subject: MarketPreviewSubject): Model {
  if (subject.kind === 'cosmetic') return cosmeticModel(subject.item);
  const body = dressedModel(subject.character, subject.cosmetics);
  const top = Math.max(...body.map(v => v.z + v.h));
  return [...body, ...subject.cosmetics.flatMap(item => effectModel(item, top, .43))];
}

/** A small turntable using the world's real voxel geometry and face lighting. */
export function createMarketPreview(subject: MarketPreviewSubject, options: { reducedMotion?: boolean; visible?: boolean } = {}): MarketPreview {
  const element = document.createElement('canvas');
  element.className = 'market-preview-canvas';
  element.width = 256; element.height = 200;
  element.setAttribute('role', 'img');
  const renderer = new Renderer(element), context = renderer.ctx;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let model: Model = [], radius = 1, low = 0, high = 1;
  let active = false, visible = options.visible ?? true, reduced = options.reducedMotion ?? false;
  let intersects = true, disposed = false, frame = 0, lastTime = 0, yaw = HOME_YAW;
  let width = 0, height = 0, pixelRatio = 1;

  const canDraw = (): boolean => !disposed && visible && intersects && !document.hidden && element.isConnected && width > 0 && height > 0;
  const moving = (): boolean => !reduced && !motion.matches;
  const homeDistance = (): number => Math.atan2(Math.sin(HOME_YAW - yaw), Math.cos(HOME_YAW - yaw));

  function stop(): void {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; lastTime = 0;
  }

  function draw(): void {
    if (!canDraw()) return;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    // Bounds cover a complete turn, so hovering cannot zoom or clip the model.
    const horizontal = Math.hypot(1, .3) * radius;
    const vertical = Math.hypot(.18, .62) * radius;
    renderer.width = width; renderer.height = height;
    renderer.scale = Math.min(width * .82 / (horizontal * 2), height * .82 / (vertical * 2 + high - low));
    const baseline = height * .5 + (high + low) * .5 * renderer.scale;
    context.translate(0, baseline - height * .71);
    const [cx, cy] = renderer.project(0, 0, low);
    const stage = radius * renderer.scale;
    context.fillStyle = '#d6c68a12';
    context.strokeStyle = '#e9d49638'; context.lineWidth = 1;
    context.beginPath(); context.ellipse(cx, cy + 3, stage * .88, stage * .34, 0, 0, FULL_TURN);
    context.fill(); context.stroke();
    context.fillStyle = '#162e3328';
    context.beginPath(); context.ellipse(cx, cy, stage * .5, stage * .16, 0, 0, FULL_TURN); context.fill();
    renderer.turnedModel(model, 0, 0, 0, yaw);
  }

  function schedule(): void {
    if (!canDraw() || !moving()) { stop(); return; }
    if (!active && Math.abs(homeDistance()) < .001) {
      if (yaw !== HOME_YAW) { yaw = HOME_YAW; draw(); }
      stop(); return;
    }
    if (!frame) frame = requestAnimationFrame(tick);
  }

  function tick(time: number): void {
    frame = 0;
    if (!canDraw() || !moving()) { stop(); return; }
    const dt = lastTime ? Math.min((time - lastTime) / 1000, .05) : 0;
    lastTime = time;
    if (active) yaw = (yaw + dt * .85) % FULL_TURN;
    else {
      const distance = homeDistance();
      yaw += distance * (1 - Math.exp(-dt * 9));
      if (Math.abs(distance) < .001) yaw = HOME_YAW;
    }
    draw(); schedule();
  }

  function resize(): void {
    if (disposed) return;
    // Layout size stays steady during the market's entrance transform.
    const nextWidth = element.clientWidth, nextHeight = element.clientHeight;
    const nextRatio = Math.min(devicePixelRatio || 1, 2);
    if (width !== nextWidth || height !== nextHeight || pixelRatio !== nextRatio) {
      width = nextWidth; height = nextHeight; pixelRatio = nextRatio;
      element.width = Math.max(1, Math.round(width * pixelRatio));
      element.height = Math.max(1, Math.round(height * pixelRatio));
    }
    draw(); schedule();
  }

  function refreshMotion(): void {
    if (!moving()) { yaw = HOME_YAW; stop(); }
    draw(); schedule();
  }

  function setSubject(next: MarketPreviewSubject): void {
    if (disposed) return;
    subject = next;
    const raw = previewModel(subject);
    // Recenter standalone garments/effects, but keep a traveler's turning axis
    // on its own body so an equipped trail does not make it orbit the display.
    const centerX = subject.kind === 'character' ? 0 : (Math.min(...raw.map(v => v.x - v.w / 2)) + Math.max(...raw.map(v => v.x + v.w / 2))) / 2;
    const centerY = subject.kind === 'character' ? 0 : (Math.min(...raw.map(v => v.y - v.d / 2)) + Math.max(...raw.map(v => v.y + v.d / 2))) / 2;
    model = raw.map(v => ({ ...v, x: v.x - centerX, y: v.y - centerY }));
    radius = Math.max(.35, ...model.map(v => Math.hypot(Math.abs(v.x) + v.w / 2, Math.abs(v.y) + v.d / 2)));
    low = Math.min(0, ...model.map(v => v.z)); high = Math.max(.2, ...model.map(v => v.z + v.h));
    element.setAttribute('aria-label', subject.kind === 'cosmetic'
      ? `3D preview of ${subject.item.name}`
      : `${subject.character.name}${subject.cosmetics.length ? ` wearing ${subject.cosmetics.map(item => item.name).join(', ')}` : ', current traveler'}`);
    draw();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(element);
  const intersectionObserver = new IntersectionObserver(entries => {
    intersects = entries.some(entry => entry.isIntersecting);
    if (intersects) resize(); else stop();
  });
  intersectionObserver.observe(element);
  const visibilityChanged = (): void => { if (document.hidden) stop(); else resize(); };
  document.addEventListener('visibilitychange', visibilityChanged);
  motion.addEventListener('change', refreshMotion);
  setSubject(subject);

  return {
    element, setSubject,
    setActive(value): void { if (disposed || active === value) return; active = value; schedule(); },
    setVisible(value): void { if (disposed || visible === value) return; visible = value; if (visible) resize(); else stop(); },
    setReducedMotion(value): void { if (disposed || reduced === value) return; reduced = value; refreshMotion(); },
    dispose(): void {
      if (disposed) return;
      disposed = true; stop(); resizeObserver.disconnect(); intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', visibilityChanged);
      motion.removeEventListener('change', refreshMotion);
      element.width = 1; element.height = 1;
    },
  };
}
