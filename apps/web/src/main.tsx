/**
 * Vite 开发环境入口
 */
import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, Outlet, createBrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 导入全局样式
import './app/globals.css';

// 导入 Provider 组件
import {
  ThemeProvider,
  AppKitProvider,
  CurrencyProvider,
  AuthProvider,
  ServiceWorkerProvider,
  TGMiniAppProvider,
  MobileNav,
  ChatSystem,
  PWAInstall,
} from '@/components';
import { DiscordActivityProvider } from '@/components/DiscordActivityProvider';
import { Toaster } from '@/components/ui';
import { ProductModalProvider, PaymentSelectorProvider } from '@/hooks';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// 导入路由配置
import { routes } from './routes';

// 加载中的全局占位
function GlobalLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}

// 内部布局组件 - 在 Router 上下文内使用路由 hooks
function AppLayout() {
  return (
    <AuthProvider>
      <Suspense fallback={<GlobalLoading />}>
        <ProductModalProvider>
          <PaymentSelectorProvider>
            {/* Main content with bottom padding for mobile nav */}
            <div className="pb-20 md:pb-0">
              <Outlet />
            </div>

            {/* Mobile bottom navigation (Web + TMA) */}
            <MobileNav />

            {/* Chat floating button and drawer */}
            <ChatSystem />

            {/* PWA install prompt */}
            <PWAInstall />

            {/* Toast notifications */}
            <Toaster />
          </PaymentSelectorProvider>
        </ProductModalProvider>
      </Suspense>
    </AuthProvider>
  );
}

// 创建带有布局的路由
const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: routes,
  },
]);

// 应用根组件 - 不使用路由 hooks 的 Provider 放在外层
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TGMiniAppProvider>
          <DiscordActivityProvider>
            <ServiceWorkerProvider>
              <AppKitProvider>
                <CurrencyProvider>
                  <RouterProvider router={router} />
                </CurrencyProvider>
              </AppKitProvider>
            </ServiceWorkerProvider>
          </DiscordActivityProvider>
        </TGMiniAppProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// 挂载应用
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
