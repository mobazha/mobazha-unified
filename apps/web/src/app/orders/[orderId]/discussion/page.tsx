'use client';

import { useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

export default function OrderDiscussionRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = params.orderId as string;
  const redirectedRef = useRef(false);
  const searchString = searchParams.toString();

  useEffect(() => {
    if (redirectedRef.current) return;
    if (searchParams.get('tab') === 'discussion') {
      router.replace(`/orders/${orderId}?${searchString}`);
      redirectedRef.current = true;
      return;
    }

    redirectedRef.current = true;
    const nextParams = new URLSearchParams(searchString);
    nextParams.set('tab', 'discussion');
    router.replace(`/orders/${orderId}?${nextParams.toString()}`);
  }, [orderId, router, searchParams, searchString]);

  return null;
}
