'use client';

/// <reference lib="dom" />

import { useEffect, useState, useCallback, useRef, useSyncExternalStore } from 'react';
import {
  hasWaitingUpdate,
  RELOAD_RECOVERY_MS,
  SKIP_WAITING_FALLBACK_MS,
  SKIP_WAITING_MESSAGE,
} from '@/lib/serviceWorkerUpdate';

interface ServiceWorkerState {
  isRegistered: boolean;
  registration: globalThis.ServiceWorkerRegistration | null;
  updateAvailable: boolean;
}

// Online status store
function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getServerOnlineSnapshot() {
  return true; // Always online on server
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isRegistered: false,
    registration: null,
    updateAvailable: false,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const isRefreshingRef = useRef(false);
  const skipWaitingTimeoutRef = useRef<number | null>(null);
  const recoveryTimeoutRef = useRef<number | null>(null);

  const clearSkipWaitingTimeout = useCallback(() => {
    if (skipWaitingTimeoutRef.current != null) {
      clearTimeout(skipWaitingTimeoutRef.current);
      skipWaitingTimeoutRef.current = null;
    }
  }, []);

  const clearRecoveryTimeout = useCallback(() => {
    if (recoveryTimeoutRef.current != null) {
      clearTimeout(recoveryTimeoutRef.current);
      recoveryTimeoutRef.current = null;
    }
  }, []);

  // Use useSyncExternalStore for online status
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerOnlineSnapshot
  );

  // 开发环境下禁用 Service Worker，避免缓存问题
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isSupported =
    typeof window !== 'undefined' && 'serviceWorker' in navigator && !isDevelopment;

  const recoverFromFailedReload = useCallback(() => {
    isRefreshingRef.current = false;
    setIsUpdating(false);
    setState(prev => ({ ...prev, updateAvailable: true }));
  }, []);

  const scheduleReloadRecovery = useCallback(() => {
    clearRecoveryTimeout();
    recoveryTimeoutRef.current = window.setTimeout(() => {
      if (!isRefreshingRef.current) return;
      recoverFromFailedReload();
    }, RELOAD_RECOVERY_MS);
  }, [clearRecoveryTimeout, recoverFromFailedReload]);

  const attemptReload = useCallback(() => {
    scheduleReloadRecovery();
    window.location.reload();
  }, [scheduleReloadRecovery]);

  const startUpdateRefresh = useCallback(() => {
    if (isRefreshingRef.current) return false;
    isRefreshingRef.current = true;
    setIsUpdating(true);
    return true;
  }, []);

  // Register service worker (仅生产环境)
  useEffect(() => {
    if (!isSupported) {
      if (isDevelopment && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.unregister();
            console.warn('[DEV] Unregistered Service Worker for better DX');
          });
        });
      }
      return;
    }

    let interval: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        if (cancelled) return;

        setState(prev => ({
          ...prev,
          isRegistered: true,
          registration,
          updateAvailable: hasWaitingUpdate(
            registration,
            Boolean(navigator.serviceWorker.controller)
          ),
        }));

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setState(prev => ({ ...prev, updateAvailable: true }));
              }
            });
          }
        });

        interval = setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000
        );
      } catch {
        // Registration failed silently
      }
    };

    registerSW();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [isSupported, isDevelopment]);

  // Reload once when a waiting worker takes control (after SKIP_WAITING).
  useEffect(() => {
    if (!isSupported) return;

    const onControllerChange = () => {
      if (!isRefreshingRef.current) return;
      clearSkipWaitingTimeout();
      attemptReload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      clearSkipWaitingTimeout();
      clearRecoveryTimeout();
    };
  }, [isSupported, clearSkipWaitingTimeout, clearRecoveryTimeout, attemptReload]);

  const update = useCallback(() => {
    if (!startUpdateRefresh()) return;

    const waiting = state.registration?.waiting;

    if (waiting) {
      waiting.postMessage(SKIP_WAITING_MESSAGE);
      clearSkipWaitingTimeout();
      skipWaitingTimeoutRef.current = window.setTimeout(() => {
        if (isRefreshingRef.current) {
          attemptReload();
        }
      }, SKIP_WAITING_FALLBACK_MS);
      return;
    }

    attemptReload();
  }, [state.registration, startUpdateRefresh, clearSkipWaitingTimeout, attemptReload]);

  const unregister = useCallback(async () => {
    if (state.registration) {
      await state.registration.unregister();
      setState(prev => ({ ...prev, isRegistered: false, registration: null }));
    }
  }, [state.registration]);

  return {
    isSupported,
    isOnline,
    isUpdating,
    ...state,
    update,
    unregister,
  };
}

export default useServiceWorker;
