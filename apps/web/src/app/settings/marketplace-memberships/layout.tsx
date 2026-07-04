// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import type { ReactNode } from 'react';
import { UNIFIED_FRONTEND_FEATURE } from '@mobazha/core';
import { UnifiedFrontendFeatureBoundary } from '@/components/UnifiedFrontendFeatureBoundary';

export default function MarketplaceMembershipsLayout({ children }: { children: ReactNode }) {
  return (
    <UnifiedFrontendFeatureBoundary feature={UNIFIED_FRONTEND_FEATURE.marketplaceSellerReview}>
      {children}
    </UnifiedFrontendFeatureBoundary>
  );
}
