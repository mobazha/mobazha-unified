'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AIConnectPageContent } from '@/components/admin/ai/AIConnectPageContent';

function AIAgentsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/ai/connect');
  }, [router]);

  return null;
}

/**
 * Sovereign keeps the established AI Agents entry point because its local-AI
 * controls are available independently of the SaaS AI workspace feature flag.
 * Hosted builds retain the WS-1 redirect into the tabbed AI workspace.
 */
export default function AIAgentsPage() {
  if (typeof __SOVEREIGN__ !== 'undefined' && __SOVEREIGN__) {
    return <AIConnectPageContent />;
  }

  return <AIAgentsRedirectPage />;
}
