'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useFeature } from '@mobazha/core';
import { AIChatPanel } from '@/components/AIChatPanel';

/** Hides the floating assistant when inline chat is shown on the AI Workspace page. */
export function AdminFloatingChat() {
  const pathname = usePathname();
  const workspaceEnabled = useFeature('aiWorkspaceEnabled');

  const hideFloating = useMemo(() => {
    if (!workspaceEnabled) return false;
    return pathname === '/admin/ai/workspace' || pathname.startsWith('/admin/ai/workspace/');
  }, [workspaceEnabled, pathname]);

  if (hideFloating) return null;

  return <AIChatPanel variant="floating" />;
}
