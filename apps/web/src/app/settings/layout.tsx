'use client';

import React from 'react';
import { AuthGuard } from '@/components';
import { SettingsLayoutShell } from './settings-layout-shell';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <AuthGuard>
      <SettingsLayoutShell>{children}</SettingsLayoutShell>
    </AuthGuard>
  );
}
