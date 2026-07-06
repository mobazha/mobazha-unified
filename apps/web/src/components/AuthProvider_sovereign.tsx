'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useUserStore } from '@mobazha/core';

interface AuthProviderProps {
  children: ReactNode;
  publicPaths?: string[];
}

/** Local Basic-auth session bootstrap with no SaaS, Discord, OAuth, or Matrix imports. */
export function AuthProvider({ children }: AuthProviderProps) {
  const { restoreSession, enterAnonymousMode } = useUserStore();
  const started = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const initialize = async () => {
      if (__ROUTED_TMA__) {
        enterAnonymousMode('telegram');
      } else {
        await restoreSession();
      }
      setReady(true);
    };

    void initialize();
  }, [enterAnonymousMode, restoreSession]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthProvider;
