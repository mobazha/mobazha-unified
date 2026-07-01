// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it } from 'vitest';
import { isPublicRoute, isPrivateRoute } from '../../config/routeConfig';

describe('routeConfig collectibles visibility', () => {
  it('treats catalog and single-segment mint detail as public', () => {
    expect(isPublicRoute('/collectibles')).toBe(true);
    expect(isPublicRoute('/collectibles/abc123mint')).toBe(true);
    expect(isPrivateRoute('/collectibles/abc123mint')).toBe(false);
  });

  it('keeps redemptions, redeem flow, and ops admin private', () => {
    expect(isPublicRoute('/collectibles/redemptions')).toBe(false);
    expect(isPublicRoute('/collectibles/redeem/redeem-id-1')).toBe(false);
    expect(isPublicRoute('/admin/collectibles/ops')).toBe(false);

    expect(isPrivateRoute('/collectibles/redemptions')).toBe(true);
    expect(isPrivateRoute('/collectibles/redeem/redeem-id-1')).toBe(true);
    expect(isPrivateRoute('/admin/collectibles/ops')).toBe(true);
  });
});
