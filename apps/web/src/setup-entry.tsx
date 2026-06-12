/**
 * Outpost first-run setup shell — minimal entry (no full router / admin dashboard).
 * Built only when VITE_BUILD_TARGET=outpost; served by the node for /admin/* until setup completes.
 */
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import './app/globals.css';
import '@/lib/initPublicEnv';

import { OuterProviders } from '@/components/OuterProviders';
import { Toaster } from '@/components/ui';
import StandaloneSetupWizard from '@/components/admin/StandaloneSetupWizard';
import { getSetupStatus } from '@mobazha/core/services/api/system';
import type { SetupCompletedSteps } from '@mobazha/core/services/api/system';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function SetupShellApp() {
  const [completedSteps, setCompletedSteps] = useState<SetupCompletedSteps | undefined>();

  useEffect(() => {
    let cancelled = false;
    getSetupStatus()
      .then(status => {
        if (cancelled) return;
        setCompletedSteps(status.completedSteps);
        if (status.setupComplete) {
          window.location.replace('/admin');
        }
      })
      .catch(() => {
        /* wizard still usable with default step state */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <OuterProviders>
      <QueryClientProvider client={queryClient}>
        <div data-testid="admin-dashboard">
          <StandaloneSetupWizard initialCompletedSteps={completedSteps} />
        </div>
        <Toaster />
      </QueryClientProvider>
    </OuterProviders>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SetupShellApp />
  </StrictMode>
);
