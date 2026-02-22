'use client';

import { Outlet } from 'react-router-dom';
import { AuthGuard } from '@/components';
import { SettingsLayoutShell } from './layout';

export default function SettingsLayoutVite() {
  return (
    <AuthGuard>
      <SettingsLayoutShell>
        <Outlet />
      </SettingsLayoutShell>
    </AuthGuard>
  );
}
