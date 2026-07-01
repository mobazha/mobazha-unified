// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import type { ReactNode } from 'react';
import { RuntimeCapabilityBoundary } from '@/components/RuntimeCapabilityBoundary';

export default function OperatorLayout({ children }: { children: ReactNode }) {
  return (
    <RuntimeCapabilityBoundary capability="marketplace.operator">
      {children}
    </RuntimeCapabilityBoundary>
  );
}
