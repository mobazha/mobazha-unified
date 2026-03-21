'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthGuard, useI18n } from '@mobazha/core';
import { useMiniAppRegister } from '../../hooks/useMiniAppRegister';
import { useMiniAppBind } from '../../hooks/useMiniAppBind';
import { Lock, UserPlus } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

/**
 * Route protection component.
 *
 * - Web: redirects to /login
 * - Mini App (anonymous): shows native registration prompt (TG popup / Discord BottomSheet)
 */
export function ProtectedRoute({ children, redirectTo = '/login', fallback }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { shouldRedirect, shouldPromptRegister, isSessionRestored, isLoading, isAuthenticated } =
    useAuthGuard(location.pathname);
  const { t } = useI18n();

  const hasRedirected = useRef(false);
  const hasPrompted = useRef(false);
  const [showGate, setShowGate] = useState(false);
  const { startBind } = useMiniAppBind();

  const { promptRegister } = useMiniAppRegister({
    onBindRequested: () => {
      startBind();
      setShowGate(false);
    },
  });

  const handlePrompt = useCallback(async () => {
    if (hasPrompted.current) return;
    hasPrompted.current = true;

    const action = await promptRegister();

    if (action === 'register') {
      setShowGate(false);
      return;
    }

    if (action === null) {
      // Non-TG platform (Discord etc.): show inline gate UI
      setShowGate(true);
      return;
    }

    // User cancelled — go back
    navigate(-1);
  }, [promptRegister, navigate]);

  useEffect(() => {
    if (!isSessionRestored) return;

    if (shouldRedirect && !hasRedirected.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const _win = typeof window !== 'undefined' ? (window as any) : undefined;
      const inTMA = !!(_win?.Telegram || _win?.__EMBEDDED_APP__);
      if (inTMA) {
        // Never redirect to /login in TMA — treat as registration prompt
        return;
      }
      hasRedirected.current = true;
      navigate(redirectTo, {
        replace: true,
        state: { from: location.pathname },
      });
    }
  }, [isSessionRestored, shouldRedirect, navigate, location.pathname, redirectTo]);

  useEffect(() => {
    if (!isSessionRestored) return;

    if (shouldPromptRegister && !hasPrompted.current) {
      handlePrompt(); // eslint-disable-line react-hooks/set-state-in-effect -- setState in handlePrompt occurs after await (async), not synchronously
    }
  }, [isSessionRestored, shouldPromptRegister, handlePrompt]);

  useEffect(() => {
    hasRedirected.current = false;
    hasPrompted.current = false;
    setShowGate(false); // eslint-disable-line react-hooks/set-state-in-effect -- intentional reset on path change
  }, [location.pathname]);

  // Inline gate for non-TG Mini App platforms (Discord)
  if (showGate && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-muted/80 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">
            {t('auth.accountRequired', { defaultValue: 'Account Required' })}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {t('auth.createAccountPrompt', {
              defaultValue: 'Create a free account to access this feature.',
            })}
          </p>
          <button
            onClick={() => {
              hasPrompted.current = false;
              handlePrompt();
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium min-h-[44px]"
          >
            <UserPlus className="w-4 h-4" />
            {t('auth.createAccount', { defaultValue: 'Create Account' })}
          </button>
        </div>
      </div>
    );
  }

  if (!isSessionRestored || shouldRedirect) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isLoading ? t('common.loading') : t('common.redirecting')}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;
