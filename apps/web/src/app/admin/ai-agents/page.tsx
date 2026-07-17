'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFeature } from '@mobazha/core';
import { AIConnectPageContent } from '@/components/admin/ai/AIConnectPageContent';

function AIAgentsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/ai/connect');
  }, [router]);

  return null;
}

/**
 * Legacy `/admin/ai-agents` entry point.
 *
 * With `aiWorkspaceEnabled` on (the default since WS-1) this is a pure
 * redirect into the tabbed AI section at `/admin/ai/connect`. When the flag
 * is killed, the tabbed section is gated off by `AiSectionShell`, so this
 * page renders the AI Connect content directly instead — local-AI controls
 * are available independently of the workspace flag (same rationale as the
 * Sovereign build, which never redirects).
 */
export default function AIAgentsPage() {
  const aiWorkspaceEnabled = useFeature('aiWorkspaceEnabled');

  if (typeof __SOVEREIGN__ !== 'undefined' && __SOVEREIGN__) {
    return <AIConnectPageContent />;
  }

  if (!aiWorkspaceEnabled) {
    return <AIConnectPageContent />;
  }

  return <AIAgentsRedirectPage />;
}
