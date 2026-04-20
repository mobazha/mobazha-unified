/**
 * Server Info API (GET /platform/v1/server/info)
 *
 * Returns the authenticated node's identity plus the platform-wide feature
 * flag snapshot. Source of truth: `mobazha_hosting/api/login.go#handleServerInfo`.
 *
 * The endpoint is authenticated (Casdoor JWT via `validateTokenAndGetClaims`).
 * Callers that run pre-login must tolerate 401 and treat flags as "all off".
 *
 * Feature flag keys are flat camelCase by design — see
 * `docs/MULTI_STORE_DESIGN.md` §21 for the naming contract. The backend
 * auto-includes every feature with `ClientVisible: true` from the registry
 * (features_defined.go); explicit fields below provide type-safe access for
 * known flags, while the index signature accepts any new flag the backend
 * adds without requiring a frontend release.
 */

import { hostingGet } from './helpers';
import { HOSTING_API } from '../../config/apiPaths';

/**
 * Snapshot of every feature flag exposed to the web/TMA client.
 *
 * All entries are optional because:
 *   1. The backend is allowed to omit a key entirely (e.g. during staged
 *      rollouts of a new flag in older builds).
 *   2. Pre-auth callers may never receive this payload and fall back to
 *      `undefined` — which `isFeatureEnabled` treats as "off".
 */
export interface FeatureFlags {
  // Legacy / cross-phase
  groupMarketplaceEnabled?: boolean;

  // Phase MS1 — 1 user × N stores
  multistoreMyStoresUIEnabled?: boolean;
  multistoreClaimStoreEnabled?: boolean;
  multistoreOwnerReputationBadgeEnabled?: boolean;

  // Phase MS2a — Storefront Lite
  storefrontsEnabled?: boolean;
  storefrontsSubdomainRouting?: boolean;
  storefrontsThemeEditorEnabled?: boolean;
  storefrontsProgressivePrice?: boolean;

  // Phase MS2b — Telegram distribution matrix
  tgBridgeBotV2Enabled?: boolean;
  tgSellerBotWizardEnabled?: boolean;
  tgBotClusterEnabled?: boolean;
  tgChannelEmbedEnabled?: boolean;

  // Phase MS3 — Staff accounts
  staffAccountsEnabled?: boolean;
  staffAuditLogEnabled?: boolean;
  staffStepUpAuthEnabled?: boolean;

  // Phase MS4 — SaaS multi-node
  saasMultiNodeEnabled?: boolean;
  saasPlanQuotaEnforced?: boolean;

  // Phase MS5 — Wallet-anchored identity
  identityWalletAnchorEnabled?: boolean;
  identityCrossStoreAnalyticsEnabled?: boolean;
  identityTaxAggregationEnabled?: boolean;
  identityMatrixProxyEnabled?: boolean;

  // Payment
  guestCheckout?: boolean;

  // Kill switches — `true` means the feature is emergency-disabled.
  killMultistoreReadsDisabled?: boolean;
  killStorefrontRoutingDisabled?: boolean;
  killBotClusterIngestDisabled?: boolean;

  // Catch-all: the backend may add new ClientVisible features at any time.
  // This index signature lets them pass through without a frontend type update.
  [key: string]: boolean | undefined;
}

export interface ServerInfo {
  nodeID: string;
  features: FeatureFlags;
}

/** Fetch the current server info snapshot. Requires a valid user JWT. */
export async function getServerInfo(): Promise<ServerInfo> {
  return hostingGet<ServerInfo>(HOSTING_API.SERVER_INFO);
}

/**
 * Helper: evaluate a feature flag with kill-switch awareness.
 *
 * Usage:
 *   const canSeeConsole = isFeatureEnabled(
 *     flags,
 *     'multistoreMyStoresUIEnabled',
 *     'killMultistoreReadsDisabled',
 *   );
 *
 * The kill-switch argument is optional; when supplied, a `true` value forces
 * the feature off regardless of the primary flag.
 */
export function isFeatureEnabled(
  flags: FeatureFlags | undefined | null,
  key: keyof FeatureFlags,
  killSwitchKey?: keyof FeatureFlags
): boolean {
  if (!flags) return false;
  if (killSwitchKey && flags[killSwitchKey] === true) return false;
  return flags[key] === true;
}
