/**
 * Backend edition capability adapter.
 *
 * Compatibility adapter over the shared node runtime-config contract.
 */

import { refreshRuntimeConfig } from '../services/api/runtimeConfig';
import type { RuntimeConfig } from '../config/runtimeConfig';
import { COMMUNITY_PAYMENT_CHAINS } from './manifest';
import { intersectPaymentChains } from './capabilities';

export interface BackendEditionCapabilities {
  edition: 'community';
  paymentChains: string[];
  supportsFiat: boolean;
  source: 'backend' | 'fallback';
}

/** Safe fallback when the backend edition endpoint is unavailable. */
export function getCommunityEditionFallbackCapabilities(): BackendEditionCapabilities {
  return {
    edition: 'community',
    paymentChains: [...COMMUNITY_PAYMENT_CHAINS],
    supportsFiat: false,
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
