/**
 * Standalone Stores API — legacy shim for the pre-Multi-Store v2.4 era.
 *
 * Historically this file owned the 1:1 user → standalone-store contract. Phase
 * MS1 (Multi-Store v2.4) moved the canonical surface to `myStores.ts`
 * (`GET /platform/v1/stores/my`), which returns both SaaS and standalone
 * entries as `MyStoreItem`. We keep this module as a thin backward-compat
 * adapter so in-tree callers (AuthProvider store-context validation, the
 * legacy account settings page) keep compiling while we migrate UIs.
 *
 * @deprecated New code should import from `myStores.ts` and consume
 *   `MyStoreItem` directly. This module will be removed once all callers have
 *   migrated to the multi-store console (tracked in Phase MS1.2).
 */

import { getMyStores, type MyStoreItem } from './myStores';

/**
 * Legacy standalone-store shape. Fields mirror the pre-MS1 backend DTO.
 *
 * Notes on the mapping from `MyStoreItem`:
 *   - `last_heartbeat` ← `last_active_at` (same semantics, renamed upstream).
 *   - `connectivity: 'unknown'` is coerced to `'nat'` (least-optimistic
 *     reachability) because legacy callers only switch on the three classical
 *     values; surfacing a new literal would break existing exhaustive checks.
 *   - `id`, `plan`, `owner_user_id`, `updated_at` are no longer emitted by the
 *     canonical MS1.1 endpoint. We fill in placeholders so the TS shape stays
 *     stable for callers that still reference them (none do in-tree today —
 *     verified via rg on 2026-04-17 — but consumers outside this repo might).
 */
export interface StandaloneStore {
  id: number;
  peer_id: string;
  endpoint_url?: string;
  domain?: string;
  owner_user_id?: string;
  connectivity: 'public' | 'tunnel' | 'nat';
  plan: string;
  status: 'active' | 'suspended';
  last_heartbeat?: string;
  created_at: string;
  updated_at: string;
}

function adaptToLegacyShape(item: MyStoreItem): StandaloneStore {
  const connectivity: StandaloneStore['connectivity'] =
    item.connectivity === 'public' || item.connectivity === 'tunnel' ? item.connectivity : 'nat';

  // Legacy `status` is a narrower union than MyStoreItem's; map `archived` to
  // `suspended` so UI gates that check `status === 'active'` still behave.
  const status: StandaloneStore['status'] = item.status === 'active' ? 'active' : 'suspended';

  return {
    id: 0,
    peer_id: item.peer_id,
    endpoint_url: item.endpoint_url,
    domain: item.domain,
    owner_user_id: undefined,
    connectivity,
    plan: '',
    status,
    last_heartbeat: item.last_active_at,
    created_at: item.last_active_at ?? '',
    updated_at: item.last_active_at ?? '',
  };
}

/**
 * @deprecated Use `getMyStores()` from `./myStores` and filter on
 * `node_type === 'standalone'` yourself. Kept for backward compatibility.
 *
 * Fetches every store the caller can manage via the canonical MS1.1 endpoint
 * and narrows the result to standalone nodes in the legacy shape.
 */
export async function getMyStandaloneStores(): Promise<StandaloneStore[]> {
  const items = await getMyStores();
  return items.filter(s => s.node_type === 'standalone').map(adaptToLegacyShape);
}

/**
 * @deprecated Use `getMyStores()` and pick the entry relevant to the current
 * UI context. This helper preserves the pre-MS1 single-store assumption.
 *
 * Returns the first standalone store the user owns, or `null`. Multi-store
 * users will see only one arbitrary entry here — callers needing the full
 * list must switch to `getMyStores()`.
 */
export async function getMyStandaloneStore(): Promise<StandaloneStore | null> {
  const stores = await getMyStandaloneStores();
  return stores.length > 0 ? stores[0] : null;
}
