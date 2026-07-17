import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

// Keep the real core package out of the module graph (it makes this test's
// dynamic import take seconds) and prove sovereign ignores the flag entirely.
vi.mock('@mobazha/core', () => ({
  useFeature: () => false,
}));

vi.mock('@/components/admin/ai/AIConnectPageContent', () => ({
  AIConnectPageContent: () => <div data-testid="sovereign-ai-agents">AI Agents</div>,
}));

describe('AI Agents page in sovereign builds', () => {
  beforeEach(() => {
    replace.mockClear();
    vi.stubGlobal('__SOVEREIGN__', true);
  });

  it('renders local AI controls without redirecting through the workspace feature gate', async () => {
    const { default: AIAgentsPage } = await import('@/app/admin/ai-agents/page');

    render(<AIAgentsPage />);

    expect(screen.getByTestId('sovereign-ai-agents')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
