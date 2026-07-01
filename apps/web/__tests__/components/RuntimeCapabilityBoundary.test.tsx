import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeRuntimeConfig } from '@mobazha/core/config/runtimeConfig';
import { RuntimeCapabilityBoundary } from '@/components/RuntimeCapabilityBoundary';

vi.mock('@/app/not-found', () => ({
  default: () => <div>not-found</div>,
}));

function runtimeConfig(capabilitiesReady: boolean, discovery: boolean) {
  return {
    schemaVersion: 3,
    authMode: 'hosted',
    deployment: { mode: 'hosted', allowExternalResources: true },
    experience: { kind: 'platform' },
    capabilitiesReady,
    features: {},
    capabilities: {
      commerce: { storefront: true, storeAdmin: true, checkout: true },
      marketplace: {
        discovery,
        operator: true,
        selling: true,
        curation: true,
        sellerReview: true,
        customDomains: true,
        releasePublishing: true,
        attribution: true,
      },
      outpost: { isolatedRuntime: false, managedFleet: false },
      payments: { methods: [] },
    },
  };
}

describe('RuntimeCapabilityBoundary', () => {
  beforeEach(() => {
    initializeRuntimeConfig(runtimeConfig(false, false));
  });

  it('shows a pending state instead of a false 404 before capabilities are ready', () => {
    render(
      <RuntimeCapabilityBoundary capability="marketplace.discovery">
        <div>marketplace</div>
      </RuntimeCapabilityBoundary>
    );

    expect(screen.getByTestId('runtime-capability-pending')).toBeInTheDocument();
    expect(screen.queryByText('not-found')).not.toBeInTheDocument();
  });

  it('renders not found only after an authoritative snapshot disables the capability', () => {
    initializeRuntimeConfig(runtimeConfig(true, false));

    render(
      <RuntimeCapabilityBoundary capability="marketplace.discovery">
        <div>marketplace</div>
      </RuntimeCapabilityBoundary>
    );

    expect(screen.getByText('not-found')).toBeInTheDocument();
  });

  it('renders children after an authoritative snapshot enables the capability', () => {
    initializeRuntimeConfig(runtimeConfig(true, true));

    render(
      <RuntimeCapabilityBoundary capability="marketplace.discovery">
        <div>marketplace</div>
      </RuntimeCapabilityBoundary>
    );

    expect(screen.getByText('marketplace')).toBeInTheDocument();
  });
});
