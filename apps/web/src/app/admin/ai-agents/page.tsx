'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy route — WS-1 moved Connect to `/admin/ai/connect`. */
export default function AIAgentsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/ai/connect');
  }, [router]);

  return null;
}
