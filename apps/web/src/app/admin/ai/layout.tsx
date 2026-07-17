'use client';

import { Suspense, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useFeature } from '@mobazha/core';
import { AiSectionTabs } from '@/components/admin/ai/AiSectionTabs';
import { WorkspaceFocusProvider } from '@/components/admin/workspace/workspaceFocusContext';

export default function AdminAiLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const aiWorkspaceEnabled = useFeature('aiWorkspaceEnabled');

  useEffect(() => {
    if (!aiWorkspaceEnabled) {
      // Workspace killed: AI Connect stays reachable via the legacy entry,
      // which renders the Connect content directly when the flag is off.
      router.replace('/admin/ai-agents');
    }
  }, [aiWorkspaceEnabled, router]);

  if (!aiWorkspaceEnabled) {
    return null;
  }

  return (
    <WorkspaceFocusProvider>
      <div data-testid="admin-ai-section">
        <Suspense fallback={null}>
          <AiSectionTabs />
        </Suspense>
        {children}
      </div>
    </WorkspaceFocusProvider>
  );
}
