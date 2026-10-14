type NappletWindow = Window & {
  napplet?: Record<string, unknown>;
};

/** Return whether the runtime injected a domain for this load. */
export function hasDomain(
  napplet: Record<string, unknown> | undefined,
  domain: string,
): boolean {
  return Boolean(napplet?.[domain]);
}

/** Check a domain on the runtime-owned global without exposing it for calls. */
export function runtimeHasDomain(domain: string): boolean {
  return hasDomain((window as NappletWindow).napplet, domain);
}

/** Older runtimes may expose a domain without its newer optional methods. */
export function runtimeHasMethod(domain: string, method: string): boolean {
  const value = (window as NappletWindow).napplet?.[domain];
  return value !== null && typeof value === 'object' && typeof (value as Record<string, unknown>)[method] === 'function';
}
