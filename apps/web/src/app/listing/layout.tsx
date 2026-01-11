'use client';

import React from 'react';
import { AuthGuard } from '@/components';

export default function ListingLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
