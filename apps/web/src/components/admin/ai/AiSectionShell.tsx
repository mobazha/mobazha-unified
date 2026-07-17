'use client';

import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeature } from '@mobazha/core';
import { AiSectionTabs } from '@/components/admin/ai/AiSectionTabs';
import { WorkspaceFocusProvider } from '@/components/admin/workspace/workspaceFocusContext';

interface AiSectionShellProps {
  children: ReactNode;
}

/** Shared AI section chrome (tabs + flag gate) for Next.js layout and React Router. */
export function AiSectionShell({ children }: AiSectionShellProps) {
  const navigate = useNavigate();
  const aiWorkspaceEnabled = useFeature('aiWorkspaceEnabled');

  useEffect(() => {
    if (!aiWorkspaceEnabled) {
      // Workspace killed: AI Connect stays reachable via the legacy entry,
      // which renders the Connect content directly when the flag is off.
      navigate('/admin/ai-agents', { replace: true });
    }
  }, [aiWorkspaceEnabled, navigate]);

  if (!aiWorkspaceEnabled) {
    return null;
  }

  return (
    <WorkspaceFocusProvider>
      <div data-testid="admin-ai-section">
        <AiSectionTabs />
        {children}
      </div>
    </WorkspaceFocusProvider>
  );
}
