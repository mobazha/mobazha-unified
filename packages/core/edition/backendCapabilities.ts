/**
 * Backend edition capability adapter.
 *
 * At the 2026-04-23 anchor there is no dedicated edition endpoint on the node.
 * This module defines the typed seam and a safe four-chain fallback until
 * NODE_API.EDITION_CAPABILITIES is available from mobazha3.0 Wave 1+.
 */

import { publicGet } from '../services/api/helpers';
import { NODE_API } from '../config/apiPaths';
import { COMMUNITY_EDITION_MANIFEST, COMMUNITY_PAYMENT_CHAINS } from './manifest';
import { intersectPaymentChains } from './capabilities';

export interface BackendEditionCapabilities {
  edition: 'community';
  paymentChains: string[];
  supportsFiat: boolean;
  zcashTransparentOnly: boolean;
  source: 'backend' | 'fallback';
}

interface EditionCapabilitiesApiResponse {
  edition?: string;
  payment?: {
    chains?: string[];
    rails?: string[];
  };
  zcash?: {
    transparentOnly?: boolean;
  };
  fiat?: {
    enabled?: boolean;
  };
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

function parseBackendCapabilities(
  payload: EditionCapabilitiesApiResponse
): BackendEditionCapabilities {
  const backendChains = (payload.payment?.chains ?? []).map(chain => chain.toUpperCase());
  const narrowed = intersectPaymentChains(backendChains);

  return {
    edition: 'community',
    paymentChains: narrowed,
    supportsFiat: false,
    zcashTransparentOnly: payload.zcash?.transparentOnly ?? true,
    source: 'backend',
  };
}

/**
 * Fetch edition capabilities from the node when available.
 * Falls back to the manifest allowlist without widening.
 */
export async function fetchBackendEditionCapabilities(): Promise<BackendEditionCapabilities> {
  try {
    const payload = await publicGet<EditionCapabilitiesApiResponse>(NODE_API.EDITION_CAPABILITIES);
    if (payload.edition && payload.edition !== 'community') {
      return getCommunityEditionFallbackCapabilities();
    }

    return parseBackendCapabilities(payload);
  } catch {
    return getCommunityEditionFallbackCapabilities();
  }
}
