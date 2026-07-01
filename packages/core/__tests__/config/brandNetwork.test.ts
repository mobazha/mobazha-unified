/**
 * Brand network config tests — locks in the safety-critical default-deny
 * behavior for white-label network gating. An unbranded Mobazha build
 * MUST report all network UI flags as `false` so a misconfigured partner
 * brand cannot accidentally expose node-pool / diagnostics surface area.
 */

import { describe, expect, it } from 'vitest';

import { getBrandConfig, getBrandNetworkConfig } from '../../config/env';

describe('getBrandNetworkConfig', () => {
  it('defaults all flags to false when no brand is configured', () => {
    // No app-level runtime config has been applied in this test environment.
    expect(getBrandConfig()).toBeUndefined();

    const network = getBrandNetworkConfig();
    expect(network).toEqual({
      allowUserCustomNode: false,
      showAdvancedDiagnostics: false,
      showNodePoolUI: false,
      allowDiscoverToggle: false,
    });
  });

  it('returns a fresh object so mutation cannot leak into module state', () => {
    const a = getBrandNetworkConfig();
    const b = getBrandNetworkConfig();
    expect(a).not.toBe(b);
  });
});
