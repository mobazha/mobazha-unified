'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStorefrontProfile } from '@mobazha/core';

/**
 * /settings/store — redirect to the store page.
 * Multiple places (listing/new, my-stores) link here but the actual
 * page was never created. Redirect to the correct destination based
 * on context: store page for standalone, or admin for SaaS.
 */
export default function SettingsStorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useStorefrontProfile();

  useEffect(() => {
    const peerID = searchParams.get('peerID') || profile?.peerID;
    if (peerID) {
      router.replace(`/store/${peerID}`);
    } else {
      router.replace('/admin');
    }
  }, [router, searchParams, profile?.peerID]);

  return null;
}
