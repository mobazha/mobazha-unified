// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.
import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const replace = vi.fn();
let mockAiWorkspaceEnabled = true;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

vi.mock('@mobazha/core', () => ({
  useFeature: (key: string) => (key === 'aiWorkspaceEnabled' ? mockAiWorkspaceEnabled : false),
}));

vi.mock('@/components/admin/ai/AIConnectPageContent', () => ({
  AIConnectPageContent: () => <div data-testid="hosted-ai-connect">AI Connect</div>,
}));

describe('AI Agents page in hosted builds', () => {
  beforeEach(() => {
    replace.mockClear();
    vi.stubGlobal('__SOVEREIGN__', false);
  });

  it('redirects into the tabbed AI section when aiWorkspaceEnabled is on', async () => {
    mockAiWorkspaceEnabled = true;
    const { default: AIAgentsPage } = await import('@/app/admin/ai-agents/page');

    render(<AIAgentsPage />);

    expect(replace).toHaveBeenCalledWith('/admin/ai/connect');
    expect(screen.queryByTestId('hosted-ai-connect')).not.toBeInTheDocument();
  });

  it('renders AI Connect directly when the workspace flag is killed, instead of bouncing to the dashboard', async () => {
    mockAiWorkspaceEnabled = false;
    const { default: AIAgentsPage } = await import('@/app/admin/ai-agents/page');

    render(<AIAgentsPage />);

    expect(screen.getByTestId('hosted-ai-connect')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
