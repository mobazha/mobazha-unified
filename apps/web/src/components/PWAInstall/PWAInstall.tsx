'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_COUNT_KEY = 'pwa-install-dismiss-count';
const DISMISS_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_DISMISSALS = 3;
const SHOW_DELAY_MS = 60_000; // 60 seconds of engagement before showing

const SUPPRESSED_PATHS = ['/onboarding', '/auth', '/login', '/signup', '/checkout', '/payment'];

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
  });
}

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as typeof window.navigator & { standalone?: boolean }).standalone === true;
    return !isStandalone && globalDeferredPrompt !== null;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as typeof window.navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const handlePrompt = (e: Event) => {
      globalDeferredPrompt = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    const handleInstalled = () => {
      globalDeferredPrompt = null;
      setCanInstall(false);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!globalDeferredPrompt) return;
    await globalDeferredPrompt.prompt();
    const { outcome } = await globalDeferredPrompt.userChoice;
    if (outcome === 'accepted') {
      globalDeferredPrompt = null;
      setCanInstall(false);
    }
  }, []);

  return { canInstall, install };
}

export const PWAInstall: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const pathname = usePathname();

  const isInstalled = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as typeof window.navigator & { standalone?: boolean }).standalone === true
    );
  }, []);

  const isSuppressedPage = useMemo(
    () => SUPPRESSED_PATHS.some(p => pathname?.startsWith(p)),
    [pathname]
  );

  const [shouldSuppress] = useState(() => {
    if (typeof window === 'undefined') return true;
    const count = parseInt(localStorage.getItem(DISMISS_COUNT_KEY) || '0', 10);
    if (count >= MAX_DISMISSALS) return true;

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      if (Date.now() - dismissedTime < DISMISS_COOLDOWN_MS) return true;
    }
    return false;
  });

  useEffect(() => {
    if (isInstalled || isSuppressedPage || shouldSuppress) return;

    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

    if (isIOS && isSafari) {
      const timer = setTimeout(() => setShowIOSPrompt(true), SHOW_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [isInstalled, isSuppressedPage, shouldSuppress]);

  useEffect(() => {
    if (isInstalled) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      globalDeferredPrompt = null;
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  useEffect(() => {
    if (!deferredPrompt || shouldSuppress) return;
    const timer = setTimeout(() => setShowPrompt(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [deferredPrompt, shouldSuppress]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      globalDeferredPrompt = null;
      setShowPrompt(false);
    }

    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    const count = parseInt(localStorage.getItem(DISMISS_COUNT_KEY) || '0', 10);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    localStorage.setItem(DISMISS_COUNT_KEY, (count + 1).toString());
    setShowPrompt(false);
    setShowIOSPrompt(false);
  }, []);

  // Don't show if already installed
  if (isInstalled) return null;

  // iOS Install Instructions
  if (showIOSPrompt && !isSuppressedPage) {
    return (
      <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
        <Card className="shadow-xl border border-border">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-success flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">Install Mobazha</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Add to your home screen for the best experience
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Tap{' '}
                <svg className="w-5 h-5 inline text-info" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>{' '}
                then <strong>&quot;Add to Home Screen&quot;</strong>
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Standard Install Prompt
  if (!showPrompt || !deferredPrompt || isSuppressedPage) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <Card className="shadow-xl border border-border">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-success flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">Install Mobazha</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Get faster access and offline support
              </p>
            </div>
            <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={handleInstall} size="sm" className="flex-1">
              Install
            </Button>
            <Button onClick={handleDismiss} variant="outline" size="sm">
              Not Now
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
