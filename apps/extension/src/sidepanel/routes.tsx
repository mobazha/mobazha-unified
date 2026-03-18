import { lazy, Suspense, type ComponentType } from 'react';
import type { RouteObject } from 'react-router-dom';

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

export const routes: RouteObject[] = [
  { path: '/product/:slug', element: lazyPage(() => import('@/app/product/[slug]/page')) },
  { path: '/store/:peerId', element: lazyPage(() => import('@/app/store/[peerId]/page')) },
  { path: '/search', element: lazyPage(() => import('@/app/search/page')) },
  { path: '/cart', element: lazyPage(() => import('@/app/cart/page')) },
];
