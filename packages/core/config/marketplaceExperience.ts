// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { getRuntimeConfig, type RuntimeConfig, type RuntimeExperience } from './runtimeConfig';

export function getRuntimeMarketplaceIdentifier(
  config: RuntimeConfig = getRuntimeConfig()
): string | null {
  if (config.experience.kind !== 'marketplace') return null;
  return config.experience.marketplaceIdentifier ?? null;
}

export interface RootMarketplaceRenderInput {
  pathname: string;
  experience: RuntimeExperience;
  storefrontMode: boolean;
  isSubMarket: boolean;
  needsOnboarding?: boolean;
}

export function shouldRenderMarketplaceExperienceAtRoot(
  input: RootMarketplaceRenderInput
): boolean {
  if (input.pathname !== '/') return false;
  if (input.experience.kind !== 'marketplace') return false;
  if (!input.experience.marketplaceIdentifier) return false;
  if (input.storefrontMode) return false;
  if (input.isSubMarket) return false;
  if (input.needsOnboarding) return false;
  return true;
}

function normalizePathForCompare(path: string): string {
  return path === '/' ? '/' : path.replace(/\/$/, '');
}

export function resolveMarketplaceBackHref(
  marketHref: string,
  config: RuntimeConfig = getRuntimeConfig()
): string {
  const identifier = getRuntimeMarketplaceIdentifier(config);
  if (!identifier) return marketHref;

  const configuredHome = `/marketplace/${identifier}`;
  if (normalizePathForCompare(marketHref) === normalizePathForCompare(configuredHome)) {
    return '/';
  }
  return marketHref;
}
