'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect-only page: desktop → /settings/page-profile (or /settings/general
 * for Sovereign which has no page-profile route), mobile/TMA → /me.
 * Returns null to prevent any content flash before the redirect fires.
 */
export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    if (__SOVEREIGN__) {
      router.replace('/admin/settings');
      return;
    }
    if (window.innerWidth < 1024) {
      router.replace('/me');
    } else {
      router.replace('/settings/page-profile');
    }
  }, [router]);

  return null;
}
