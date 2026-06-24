'use client';

import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeature } from '@mobazha/core';
import { AiSectionTabs } from '@/components/admin/ai/AiSectionTabs';

interface AiSectionShellProps {
  children: ReactNode;
}

/** Shared AI section chrome (tabs + flag gate) for Next.js layout and React Router. */
export function AiSectionShell({ children }: AiSectionShellProps) {
  const navigate = useNavigate();
  const aiWorkspaceEnabled = useFeature('aiWorkspaceEnabled');

  useEffect(() => {
    if (!aiWorkspaceEnabled) {
      navigate('/admin', { replace: true });
    }
  }, [aiWorkspaceEnabled, navigate]);

  if (!aiWorkspaceEnabled) {
    return null;
  }

  return (
    <div data-testid="admin-ai-section">
      <AiSectionTabs />
      {children}
    </div>
  );
}
