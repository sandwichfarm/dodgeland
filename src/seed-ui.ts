import './seed-ui.css';
import { createSeedCopyControls } from './seed-copy.js';

/** End-of-run sharing stays local: no shell clipboard domain is assumed. */
export function createSeedUI() {
  return createSeedCopyControls({
    panel: document.getElementById('run-seed')!,
    field: document.getElementById('run-seed-code') as HTMLTextAreaElement,
    button: document.getElementById('copy-seed') as HTMLButtonElement,
    status: document.getElementById('copy-seed-status')!,
  });
}
