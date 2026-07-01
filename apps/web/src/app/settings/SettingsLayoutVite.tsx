'use client';

import { Outlet } from 'react-router-dom';
import { AuthGuard } from '@/components';
import { SettingsLayoutShell } from './settings-layout-shell';

export default function SettingsLayoutVite() {
  return (
    <AuthGuard>
      <SettingsLayoutShell>
        <Outlet />
      </SettingsLayoutShell>
    </AuthGuard>
  );
}
