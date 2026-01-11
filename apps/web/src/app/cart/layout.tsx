'use client';

import React from 'react';
import { AuthGuard } from '@/components';

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
