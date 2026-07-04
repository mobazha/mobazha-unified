// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeRuntimeConfig, UNIFIED_FRONTEND_FEATURE } from '@mobazha/core';
import { UnifiedFrontendFeatureBoundary } from '@/components/UnifiedFrontendFeatureBoundary';

let storefrontContext = false;

vi.mock('@/app/not-found', () => ({
  default: () => <div>not-found</div>,
}));

vi.mock('@mobazha/ui/hooks', () => ({
  usePlatform: () => ({ isEmbeddedApp: false }),
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key }),
    useStorefrontMode: () => storefrontContext,
  };
});

function runtimeConfig(options: { ready: boolean; operator: boolean }) {
  return {
    schemaVersion: 3,
    authMode: 'hosted',
    deployment: { mode: 'hosted', allowExternalResources: true },
    experience: { kind: 'platform' },
    capabilitiesReady: options.ready,
    features: {},
    capabilities: {
      commerce: { storefront: true, storeAdmin: true, checkout: true },
      marketplace: {
        discovery: true,
        operator: options.operator,
        selling: true,
        curation: true,
        sellerReview: true,
        customDomains: true,
        releasePublishing: true,
        attribution: true,
      },
      sovereign: { isolatedRuntime: false, managedFleet: false },
      payments: { methods: [] },
    },
  };
}

describe('UnifiedFrontendFeatureBoundary', () => {
  beforeEach(() => {
    storefrontContext = false;
    vi.stubGlobal('__SOVEREIGN__', false);
  });

  it('renders pending instead of a false 404 while capabilities load', () => {
    initializeRuntimeConfig(runtimeConfig({ ready: false, operator: false }));

    render(
      <UnifiedFrontendFeatureBoundary feature={UNIFIED_FRONTEND_FEATURE.marketplaceOperator}>
        <div>operator</div>
      </UnifiedFrontendFeatureBoundary>
    );

    expect(screen.getByTestId('frontend-composition-pending')).toBeInTheDocument();
    expect(screen.queryByText('not-found')).not.toBeInTheDocument();
  });

  it('renders the feature after the authoritative composition enables it', () => {
    initializeRuntimeConfig(runtimeConfig({ ready: true, operator: true }));

    render(
      <UnifiedFrontendFeatureBoundary feature={UNIFIED_FRONTEND_FEATURE.marketplaceOperator}>
        <div>operator</div>
      </UnifiedFrontendFeatureBoundary>
    );

    expect(screen.getByText('operator')).toBeInTheDocument();
  });

  it('uses the same composition result to exclude a storefront navigation route', () => {
    storefrontContext = true;
    initializeRuntimeConfig(runtimeConfig({ ready: true, operator: true }));

    render(
      <UnifiedFrontendFeatureBoundary feature={UNIFIED_FRONTEND_FEATURE.marketplaceOperator}>
        <div>operator</div>
      </UnifiedFrontendFeatureBoundary>
    );

    expect(screen.getByText('not-found')).toBeInTheDocument();
  });
});
