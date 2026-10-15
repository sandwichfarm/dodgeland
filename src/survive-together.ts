import type { ModeDefinition } from './mode-rules.js';
import type { SessionModeDefinition } from './session.js';

/**
 * The co-op policy intentionally carries the solo definition through unchanged.
 * LocalSession only dispatches these typed handlers; no renderer, input, or
 * simulation path needs to learn the mode's name.
 */
export function createSurviveTogetherDefinition(base: ModeDefinition): SessionModeDefinition {
  return Object.freeze({
    definition: base,
    handlers: Object.freeze({
      join: () => {},
      deviceLost: () => {},
      reclaim: () => {},
      depart: () => ({ releaseSeat: true }),
      death: () => {},
      progress: () => {},
      result: () => {},
    }),
  });
}
