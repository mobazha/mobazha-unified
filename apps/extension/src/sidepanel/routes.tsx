import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import type { RouteObject } from 'react-router-dom';
import { isAuthenticated } from '../shared/auth';

function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[200px] bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

function lazyPage(importFn: () => Promise<{ default: ComponentType<unknown> }>) {
  const LazyComponent = lazy(importFn);
  return (
    <Suspense fallback={<PageLoading />}>
      <LazyComponent />
    </Suspense>
  );
}

function ExtProtected({ children }: { children: ReactNode }) {
  if (!isAuthenticated()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-4 text-center">
        <p className="text-muted-foreground text-sm">Please sign in to continue</p>
      </div>
    );
  }
  return <>{children}</>;
}

function protectedPage(importFn: () => Promise<{ default: ComponentType<unknown> }>) {
  const LazyComponent = lazy(importFn);
  return (
    <ExtProtected>
      <Suspense fallback={<PageLoading />}>
        <LazyComponent />
      </Suspense>
    </ExtProtected>
  );
}

export const routes: RouteObject[] = [
  { path: '/product/:slug', element: lazyPage(() => import('@/app/product/[slug]/page')) },
  { path: '/store/:peerId', element: lazyPage(() => import('@/app/store/[peerId]/page')) },
  { path: '/search', element: lazyPage(() => import('@/app/search/page')) },
  { path: '/cart', element: lazyPage(() => import('@/app/cart/page')) },
  { path: '/checkout', element: protectedPage(() => import('@/app/checkout/page')) },
  {
    path: '/checkout/moderator',
    element: protectedPage(() => import('@/app/checkout/moderator/page')),
  },
  {
    path: '/checkout/payment-method',
    element: protectedPage(() => import('@/app/checkout/payment-method/page')),
  },
  {
    path: '/checkout/confirmation',
    element: protectedPage(() => import('@/app/checkout/confirmation/page')),
  },
  { path: '/orders', element: protectedPage(() => import('@/app/orders/page')) },
  { path: '/orders/:orderId', element: protectedPage(() => import('@/app/orders/[orderId]/page')) },
];
