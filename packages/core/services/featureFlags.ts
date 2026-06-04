/**
 * Unified feature-flag client for the frontend.
 *
 * Single source of truth in the browser: reads the snapshot injected by the
 * backend into `window.__RUNTIME_CONFIG__.features` (shape defined in
 * `FEATURE_FLAG_ARCHITECTURE.md §4.3`) and exposes a small synchronous API
 * plus a subscription hook for reactive UI.
 *
 * Design notes:
 *  - Everything is synchronous. The snapshot arrives before the SPA hydrates
 *    via the `/runtime-config.js` script, so UI never needs to "wait for
 *    flags to load" — unknown keys just return false (fail-closed).
 *  - We do NOT fetch flags over HTTP here. Runtime mutations (PUT
 *    `/v1/settings/features/{key}`, PATCH `/platform/v1/features/{key}`) are
 *    reflected on the next page load because `runtime-config.js` is served
 *    with `Cache-Control: no-cache`. If/when we add in-tab hot reload we'll
 *    extend `replaceSnapshot` to re-emit to subscribers.
 *  - This module is SSR-safe: all `window` reads are guarded.
 */

/**
 * Scopes where a feature may be overridden. Matches the backend's
 * `pkg/config.Scope` values, kept as a union type so consumers can check
 * `featureFlags.isOverridable(key, 'tenant')` without importing enums.
 */
export type FeatureScope = 'platform_global' | 'tenant' | 'node_runtime';

/**
 * Per-feature entry inside `window.__RUNTIME_CONFIG__.features`.
 */
export interface FeatureSnapshotEntry {
  /** Final boolean after all three layers (platform AND tenant AND node). */
  effective: boolean;
  /** Scopes an operator may override. Always an array — never `null`. */
  overridable: FeatureScope[];
}

/**
 * Snapshot keyed by feature key (camelCase, e.g. `guestCheckout`).
 */
export type FeatureSnapshot = Record<string, FeatureSnapshotEntry>;

type Listener = (snapshot: FeatureSnapshot) => void;

const FEATURE_SCOPES: readonly FeatureScope[] = ['platform_global', 'tenant', 'node_runtime'];

function isFeatureScope(value: unknown): value is FeatureScope {
  return typeof value === 'string' && (FEATURE_SCOPES as readonly string[]).includes(value);
}

/**
 * Normalize whatever shape `window.__RUNTIME_CONFIG__.features` landed with
 * into the strict `FeatureSnapshot` contract. Unknown / malformed entries
 * are dropped silently rather than thrown — the SPA should still boot even
 * if the backend ships a broken runtime-config.
 */
function normalizeSnapshot(raw: unknown): FeatureSnapshot {
  if (!raw || typeof raw !== 'object') return {};
  const out: FeatureSnapshot = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!key || !value || typeof value !== 'object') continue;
    const entry = value as Record<string, unknown>;
    const effective = entry.effective === true;
    const overridable = Array.isArray(entry.overridable)
      ? entry.overridable.filter(isFeatureScope)
      : [];
    out[key] = { effective, overridable };
  }
  return out;
}

interface RuntimeConfigWindow {
  __RUNTIME_CONFIG__?: {
    features?: unknown;
    /**
     * Legacy single-flag field kept alive by the backend for backward
     * compatibility (see mobazha3.0 `FEATURE_FLAG_ARCHITECTURE.md §4.3`
     * "backward compatibility" note). When `features` is absent we synthesize a
     * `guestCheckout` entry from this so old runtime-configs — and existing
     * E2E mocks that only inject `{ guestCheckoutEnabled: true }` — keep
     * working during the rollout.
     */
    guestCheckoutEnabled?: boolean;
  };
}

const FRONTEND_FEATURE_DEFAULTS: FeatureSnapshot = {
  supplyAvailabilityEnabled: {
    effective: false,
    overridable: ['platform_global', 'tenant', 'node_runtime'],
  },
  supplyChainEnabled: {
    effective: false,
    overridable: ['platform_global', 'tenant', 'node_runtime'],
  },
  storefrontsEnabled: {
    effective: false,
    overridable: ['platform_global', 'tenant', 'node_runtime'],
  },
};

function mergeWithFrontendDefaults(snapshot: FeatureSnapshot): FeatureSnapshot {
  return { ...FRONTEND_FEATURE_DEFAULTS, ...snapshot };
}

function readFromRuntimeConfig(): FeatureSnapshot {
  if (typeof window === 'undefined') return mergeWithFrontendDefaults({});
  const rc = (window as unknown as RuntimeConfigWindow).__RUNTIME_CONFIG__;
  if (!rc) return mergeWithFrontendDefaults({});
  if (rc.features != null) {
    return mergeWithFrontendDefaults(normalizeSnapshot(rc.features));
  }
  // Legacy fallback: synthesize a minimal snapshot from the flat field.
  if (typeof rc.guestCheckoutEnabled === 'boolean') {
    return mergeWithFrontendDefaults(
      normalizeSnapshot({
        guestCheckout: { effective: rc.guestCheckoutEnabled, overridable: [] },
      })
    );
  }
  return mergeWithFrontendDefaults({});
}

/**
 * Internal store — kept module-private so consumers can only mutate via
 * `initialize` / `replaceSnapshot`, which both trigger subscriber fanout.
 */
let currentSnapshot: FeatureSnapshot = {};
let initialized = false;
const listeners = new Set<Listener>();

function emit(): void {
  // Snapshot reference is already frozen at replace time, so listeners
  // getting the same object twice in a row is a no-op for useSyncExternalStore.
  for (const listener of listeners) {
    try {
      listener(currentSnapshot);
    } catch (err) {
      // A buggy subscriber must not break the rest of the app.
      console.error('[featureFlags] listener threw', err);
    }
  }
}

function freeze(snapshot: FeatureSnapshot): FeatureSnapshot {
  for (const entry of Object.values(snapshot)) {
    Object.freeze(entry.overridable);
    Object.freeze(entry);
  }
  return Object.freeze(snapshot);
}

function replaceSnapshot(next: FeatureSnapshot): void {
  currentSnapshot = freeze(next);
  initialized = true;
  emit();
}

/**
 * Public API.
 *
 * Shape is deliberately identical to the contract in
 * `FEATURE_FLAG_ARCHITECTURE.md §4.3` + Phase B of the frontend handoff,
 * so call sites can migrate from the legacy `isGuestCheckoutEnabled()` to
 * `featureFlags.isEnabled('guestCheckout')` without further indirection.
 */
export const featureFlags = {
  /**
   * Replace the current snapshot with the one supplied by the caller.
   * Primarily used by tests and by future hot-reload code; in production
   * the bootstrap path is `initializeFromRuntimeConfig()` below.
   */
  initialize(snapshot: FeatureSnapshot): void {
    replaceSnapshot(normalizeSnapshot(snapshot));
  },

  /**
   * Read `window.__RUNTIME_CONFIG__.features` and seed the store. Safe to
   * call multiple times — re-reads pick up changes if the runtime-config
   * script was refreshed. Returns the resulting snapshot for convenience.
   */
  initializeFromRuntimeConfig(): FeatureSnapshot {
    replaceSnapshot(readFromRuntimeConfig());
    return currentSnapshot;
  },

  /**
   * Has the store ever been seeded? Useful for tests asserting that
   * bootstrap ran exactly once.
   */
  isInitialized(): boolean {
    return initialized;
  },

  /**
   * True iff the feature is registered AND evaluates to `true` after all
   * three layers. Unknown keys log a warning and return `false`
   * (fail-closed — matches the backend Resolver's `unknown_feature_total`
   * metric behavior).
   */
  isEnabled(key: string): boolean {
    const entry = currentSnapshot[key];
    if (!entry) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`[featureFlags] unknown feature key "${key}" — returning false`);
      }
      return false;
    }
    return entry.effective;
  },

  /**
   * Returns the full snapshot entry or `undefined` when the key is not
   * registered. Prefer `isEnabled` for simple on/off checks; use this when
   * the Admin UI also needs to know what scopes are overridable.
   */
  getEntry(key: string): FeatureSnapshotEntry | undefined {
    return currentSnapshot[key];
  },

  /**
   * True iff the feature is registered and the given scope appears in its
   * `overridable` array. Used by Admin Settings to grey out toggles whose
   * scope is not user-editable.
   */
  isOverridable(key: string, scope: FeatureScope): boolean {
    const entry = currentSnapshot[key];
    return entry ? entry.overridable.includes(scope) : false;
  },

  /**
   * Returns the frozen snapshot. Safe to iterate but not to mutate.
   */
  snapshot(): FeatureSnapshot {
    return currentSnapshot;
  },

  /**
   * Register a listener. Returns an unsubscribe function. Listeners fire
   * on every `initialize` / `initializeFromRuntimeConfig` call, so the
   * React hook can use `useSyncExternalStore` safely.
   */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Test-only: clear the store back to its uninitialized state. Keeping
   * it on the main object (rather than a separate `__test__` export)
   * avoids ESM export churn and matches how `setConfig` works in
   * `config/index.ts`.
   */
  reset(): void {
    currentSnapshot = Object.freeze({});
    initialized = false;
    emit();
  },
};

// Auto-bootstrap on module load in the browser. SSR paths import this
// module too (e.g. Next.js server components), so we guard on `window`.
// The bootstrap is idempotent: replaying against an empty runtime-config
// just reseats the empty snapshot.
if (typeof window !== 'undefined') {
  try {
    featureFlags.initializeFromRuntimeConfig();
  } catch (err) {
    console.error('[featureFlags] bootstrap failed; using empty snapshot', err);
  }
}
