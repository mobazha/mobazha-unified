'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ModerationRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings/store/moderators');
  }, [router]);

  return null;
}
