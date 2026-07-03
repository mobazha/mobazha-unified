'use client';

import React from 'react';
import { AuthGuard } from '@/components';

export default function CasesLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
