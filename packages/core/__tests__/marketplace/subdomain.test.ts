// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it } from 'vitest';
import { resolveMarketplaceSubdomainFromHost } from '../../marketplace/subdomain';

describe('resolveMarketplaceSubdomainFromHost', () => {
  it('resolves marketplace subdomains under the configured base', () => {
    expect(resolveMarketplaceSubdomainFromHost('collectibles.mobazha.org', 'mobazha.org')).toBe(
      'collectibles'
    );
  });

  it.each(['app', 'miniappdev', 'miniapptest', 'standalone', 'test-new'])(
    'does not treat the platform host %s as a marketplace',
    subdomain => {
      expect(
        resolveMarketplaceSubdomainFromHost(`${subdomain}.mobazha.org`, 'mobazha.org')
      ).toBeNull();
    }
  );
});
