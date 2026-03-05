'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReceivingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/settings/payments');
  }, [router]);
  return null;
}
