/// <reference lib="dom" />

/** Message sent from the page to a waiting service worker. */
export const SKIP_WAITING_MESSAGE = { type: 'SKIP_WAITING' } as const;

/** Fallback reload when a waiting worker does not activate (e.g. legacy SW build). */
export const SKIP_WAITING_FALLBACK_MS = 1500;

/** If the page is still alive after a reload attempt, restore the update banner. */
export const RELOAD_RECOVERY_MS = 3000;

export function hasWaitingUpdate(
  registration: Pick<globalThis.ServiceWorkerRegistration, 'waiting'>,
  hasController: boolean
): boolean {
  return Boolean(registration.waiting && hasController);
}
