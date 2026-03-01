/**
 * Vite 开发环境入口
 */
import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, Outlet, createBrowserRouter } from 'react-router-dom';

import './app/globals.css';

import {
  ThemeProvider,
  CurrencyProvider,
  AuthProvider,
  ServiceWorkerProvider,
  MobileNav,
  PWAInstall,
  SessionExpiredDialog,
} from '@/components';
import { TGMiniAppProvider } from '@/components/TGMiniAppProvider';
import { DiscordActivityProvider } from '@/components/DiscordActivityProvider';
import { Toaster } from '@/components/ui';
import { ProductModalProvider, PaymentSelectorProvider } from '@/hooks';

import { routes } from './routes';

const ChatSystem = lazy(() =>
  import('@/components/ChatSystem').then(m => ({ default: m.ChatSystem }))
);
const AppKitProvider = lazy(() =>
  import('@/components/AppKitProvider').then(m => ({ default: m.AppKitProvider }))
);

function GlobalLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}

function AppLayout() {
  return (
    <AuthProvider>
      <Suspense fallback={<GlobalLoading />}>
        <ProductModalProvider>
          <PaymentSelectorProvider>
            <div className="pb-20 md:pb-0">
              <Outlet />
            </div>

            <MobileNav />

            <Suspense fallback={null}>
              <ChatSystem />
            </Suspense>

            <PWAInstall />

            <SessionExpiredDialog />

            <Toaster />
          </PaymentSelectorProvider>
        </ProductModalProvider>
      </Suspense>
    </AuthProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: routes,
  },
]);

function App() {
  return (
    <ThemeProvider>
      <TGMiniAppProvider>
        <DiscordActivityProvider>
          <ServiceWorkerProvider>
            <Suspense fallback={<GlobalLoading />}>
              <AppKitProvider>
                <CurrencyProvider>
                  <RouterProvider router={router} />
                </CurrencyProvider>
              </AppKitProvider>
            </Suspense>
          </ServiceWorkerProvider>
        </DiscordActivityProvider>
      </TGMiniAppProvider>
    </ThemeProvider>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
