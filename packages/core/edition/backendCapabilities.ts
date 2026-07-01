/**
 * Backend edition capability adapter.
 *
 * Community payment-policy projection over the shared RuntimeConfig V3 contract.
 */

import { refreshRuntimeConfig } from '../services/api/runtimeConfig';
import type { RuntimeConfig } from '../config/runtimeConfig';
import { COMMUNITY_EDITION_MANIFEST, COMMUNITY_PAYMENT_CHAINS } from './manifest';
import { intersectPaymentChains } from './capabilities';

export interface BackendEditionCapabilities {
  edition: 'community';
  paymentChains: string[];
  supportsFiat: boolean;
  zcashTransparentOnly: boolean;
  source: 'backend' | 'fallback';
}

/** Safe fallback when the backend edition endpoint is unavailable. */
export function getCommunityEditionFallbackCapabilities(): BackendEditionCapabilities {
  return {
    edition: 'community',
    paymentChains: [...COMMUNITY_PAYMENT_CHAINS],
    supportsFiat: false,
    zcashTransparentOnly: COMMUNITY_EDITION_MANIFEST.zcash.transparentOnly,
    source: 'fallback',
  };
}

function parseBackendCapabilities(payload: RuntimeConfig): BackendEditionCapabilities {
  const backendChains = payload.capabilities.payments.methods
    .filter(method => method.kind === 'crypto')
    .map(method => method.id.toUpperCase());
  const narrowed = intersectPaymentChains(backendChains);

  return {
    edition: 'community',
    paymentChains: narrowed,
    supportsFiat: false,
    // Frontend edition policy may narrow backend capability, never widen it.
    // Community Edition remains transparent-only even if a newer/private node
    // reports shielded Zcash capability.
    zcashTransparentOnly: COMMUNITY_EDITION_MANIFEST.zcash.transparentOnly,
    source: 'backend',
  };
}

/**
 * Fetch runtime capabilities from the node when available.
 * Falls back to the manifest allowlist without widening.
 */
export async function fetchBackendEditionCapabilities(): Promise<BackendEditionCapabilities> {
  try {
    const payload = await refreshRuntimeConfig();
    return parseBackendCapabilities(payload);
  } catch {
    return getCommunityEditionFallbackCapabilities();
  }
}
