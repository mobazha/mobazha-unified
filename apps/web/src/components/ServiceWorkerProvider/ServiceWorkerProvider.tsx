'use client';

import React, { useMemo } from 'react';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { Button, Card } from '@mobazha/ui';

export const ServiceWorkerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOnline, updateAvailable, update } = useServiceWorker();

  // Compute showOffline based on isOnline (no need for separate state)
  const showOffline = useMemo(() => !isOnline, [isOnline]);

  return (
    <>
      {children}

      {/* Offline Indicator */}
      {showOffline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium animate-in slide-in-from-top duration-300">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829"
              />
            </svg>
            You&apos;re offline. Some features may be unavailable.
          </div>
        </div>
      )}

      {/* Update Available */}
      {updateAvailable && (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <Card className="shadow-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
                    Update Available
                  </h3>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                    A new version of Mobazha is ready. Refresh to update.
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={update} size="sm" fullWidth>
                  Refresh Now
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};
