'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * Legacy /cases/:orderId URLs redirect to unified order detail dispute tab.
 */
export default function CaseOrderRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  useEffect(() => {
    if (orderId) {
      router.replace(`/orders/${encodeURIComponent(orderId)}?tab=dispute`);
    }
  }, [orderId, router]);

  return null;
}
