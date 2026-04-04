'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect-only page: desktop → /settings/page-profile, mobile/TMA → /me.
 * The /me page already embeds InlineSettings for mobile users.
 * Returns null to prevent any content flash before the redirect fires.
 */
export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(window.innerWidth >= 1024 ? '/settings/page-profile' : '/me');
  }, [router]);

  return null;
}
