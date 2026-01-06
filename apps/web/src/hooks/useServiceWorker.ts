'use client';

import { useEffect, useState, useCallback, useSyncExternalStore } from 'react';

interface ServiceWorkerState {
  isRegistered: boolean;
  registration: ServiceWorkerRegistration | null;
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

  // Use useSyncExternalStore for online status
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerOnlineSnapshot
  );

  // Check if service worker is supported
  const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator;

  // Register service worker
  useEffect(() => {
    if (!isSupported) return;

    // Register SW
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        setState(prev => ({
          ...prev,
          isRegistered: true,
          registration,
        }));

        // Check for updates
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

        // Check for updates periodically
        const interval = setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000
        ); // Every hour

        return () => clearInterval(interval);
      } catch {
        // Registration failed silently
      }
    };

    registerSW();
  }, [isSupported]);

  // Update service worker
  const update = useCallback(async () => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, [state.registration]);

  // Unregister service worker
  const unregister = useCallback(async () => {
    if (state.registration) {
      await state.registration.unregister();
      setState(prev => ({ ...prev, isRegistered: false, registration: null }));
    }
  }, [state.registration]);

  return {
    isSupported,
    isOnline,
    ...state,
    update,
    unregister,
  };
}

export default useServiceWorker;
