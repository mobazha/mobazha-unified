'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isOutpostMode } from '@mobazha/core/config/env';

export default function ReceivingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(isOutpostMode() ? '/admin/finance' : '/admin/settings/payments');
  }, [router]);
  return null;
}
